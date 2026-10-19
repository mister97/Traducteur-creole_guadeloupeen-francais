'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { annulerTirage, planifier, renommerTerme, supprimerTerme, trouverEntree } from '@/lib/admin';
import { libelleType } from '@/components/admin/utils';
import { ficheParId } from '@/lib/dico';
import { adresseIp, estBloque, exigerAdmin, noterEchec, oublierEchecs } from '@/lib/auth';
import { fermerSession, ouvrirSession, verifierIdentifiants } from '@/lib/comptes-admin';
import { journaliser, journaliserConnexion } from '@/lib/journal';
import { jourGuadeloupe } from '@/lib/dates';
import { ErreurFiche, enregistrerFiche, supprimerFiche } from '@/lib/fiches';
import { mailSuggestionValidee } from '@/lib/mail';
import { estMotDeJeu } from '@/lib/normalisation.mjs';
import { tirage } from '@/lib/quotidien';
import { changerStatut, obtenirSuggestion, supprimerSuggestion } from '@/lib/suggestions';

const champ = (formData, nom) => String(formData.get(nom) ?? '').trim();

function lireFiche(formData) {
  try {
    return JSON.parse(champ(formData, 'donnees') || '{}');
  } catch {
    throw new ErreurFiche('Données de la fiche illisibles.');
  }
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

const MESSAGES_CONNEXION = {
  // Message unique pour « compte inconnu » et « mot de passe faux » :
  // l'un ne doit pas se distinguer de l'autre.
  identifiants: 'Adresse ou mot de passe incorrect.',
  bloque: 'Ce compte est bloqué après plusieurs échecs. Réessayez dans 15 minutes.',
  suspendu: 'Ce compte a été suspendu. Demandez à un propriétaire du site de le réactiver.',
};

export async function connexion(_etat, formData) {
  const ip = await adresseIp();
  if (estBloque('connexion', ip)) return { erreur: 'Trop de tentatives depuis cet appareil. Réessayez dans 15 minutes.' };

  const email = champ(formData, 'email').toLowerCase();
  const resultat = await verifierIdentifiants(email, String(formData.get('mot_de_passe') ?? ''));

  if (resultat.erreur) {
    noterEchec('connexion', ip);
    await journaliserConnexion(resultat.erreur === 'bloque' ? 'connexion.bloquee' : 'connexion.echouee', {
      utilisateur: null,
      email,
      details: resultat.erreur,
    });
    await new Promise((r) => setTimeout(r, 400));
    return { erreur: MESSAGES_CONNEXION[resultat.erreur] ?? MESSAGES_CONNEXION.identifiants, email };
  }

  oublierEchecs('connexion', ip);
  await ouvrirSession(resultat.utilisateur);
  await journaliserConnexion('connexion.reussie', { utilisateur: resultat.utilisateur });
  redirect('/admin');
}

export async function deconnexion() {
  await journaliser('deconnexion');
  await fermerSession();
  redirect('/admin/connexion');
}

// ---------------------------------------------------------------------------
// Mots
// ---------------------------------------------------------------------------

export async function enregistrerMot(_etat, formData) {
  await exigerAdmin();
  const id = Number(champ(formData, 'id')) || null;
  let resultat;
  try {
    resultat = await enregistrerFiche(lireFiche(formData), {
      id,
      slug: champ(formData, 'slug') || undefined,
      exclu_quotidien: formData.get('exclu_quotidien') === 'on',
      exclu_jeu: formData.get('exclu_jeu') === 'on',
    });
  } catch (erreur) {
    if (erreur instanceof ErreurFiche) return { erreur: erreur.message };
    console.error(erreur);
    return { erreur: 'Enregistrement impossible (voir les journaux du serveur).' };
  }
  await journaliser(id ? 'mot.modifie' : 'mot.cree', {
    cible: 'mot',
    cibleId: resultat.id,
    cibleLabel: lireFiche(formData).mot ?? resultat.slug,
  });
  if (!id) redirect(`/admin/mots/${resultat.id}?cree=1`);
  refresh();
  return { ok: `Fiche enregistrée à ${new Date().toLocaleTimeString('fr-FR', { timeZone: 'America/Guadeloupe' })}.`, slug: resultat.slug };
}

export async function supprimerMot(formData) {
  await exigerAdmin();
  const id = Number(champ(formData, 'id'));
  // Lu avant la suppression : après, le nom n'existe plus pour le journal
  const fiche = await ficheParId(id);
  await supprimerFiche(id);
  await journaliser('mot.supprime', { cible: 'mot', cibleId: id, cibleLabel: fiche?.mot });
  redirect('/admin/mots?supprime=1');
}

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------

export async function validerSuggestion(_etat, formData) {
  await exigerAdmin();
  const suggestion = await obtenirSuggestion(Number(champ(formData, 'suggestion_id')));
  if (!suggestion) return { erreur: 'Suggestion introuvable.' };
  const note = champ(formData, 'note') || null;

  let entree = null;
  if (suggestion.type !== 'remarque') {
    try {
      entree = await enregistrerFiche(lireFiche(formData), {
        id: Number(champ(formData, 'entree_cible')) || null,
        exclu_quotidien: formData.get('exclu_quotidien') === 'on',
        exclu_jeu: formData.get('exclu_jeu') === 'on',
      });
    } catch (erreur) {
      if (erreur instanceof ErreurFiche) return { erreur: erreur.message };
      console.error(erreur);
      return { erreur: 'Enregistrement impossible (voir les journaux du serveur).' };
    }
  }

  await changerStatut(suggestion.id, 'validee', { note, entreeId: entree?.id });
  await journaliser('suggestion.validee', {
    cible: 'suggestion',
    cibleId: suggestion.id,
    cibleLabel: suggestion.mot ?? suggestion.entree_mot ?? libelleType(suggestion.type),
    details: note ?? undefined,
  });
  if (formData.get('prevenir') === 'on') {
    try {
      await mailSuggestionValidee(suggestion, entree?.slug);
    } catch (erreur) {
      console.error('Mail de remerciement non envoyé :', erreur.message);
    }
  }
  redirect(`/admin/suggestions?traitee=${suggestion.id}`);
}

export async function rejeterSuggestion(formData) {
  await exigerAdmin();
  const id = Number(champ(formData, 'suggestion_id'));
  const note = champ(formData, 'note') || null;
  await changerStatut(id, 'rejetee', { note });
  await journaliser('suggestion.rejetee', { cible: 'suggestion', cibleId: id, details: note ?? undefined });
  redirect(`/admin/suggestions?traitee=${id}`);
}

export async function remettreEnAttente(formData) {
  await exigerAdmin();
  const id = Number(champ(formData, 'suggestion_id'));
  await changerStatut(id, 'en_attente');
  await journaliser('suggestion.rouverte', { cible: 'suggestion', cibleId: id });
  redirect(`/admin/suggestions/${id}`);
}

export async function effacerSuggestion(formData) {
  await exigerAdmin();
  const id = Number(champ(formData, 'suggestion_id'));
  await supprimerSuggestion(id);
  await journaliser('suggestion.supprimee', { cible: 'suggestion', cibleId: id });
  redirect('/admin/suggestions?statut=rejetee');
}

// ---------------------------------------------------------------------------
// Termes français
// ---------------------------------------------------------------------------

export async function modifierTerme(_etat, formData) {
  await exigerAdmin();
  const id = Number(champ(formData, 'id'));
  const terme = champ(formData, 'terme');
  try {
    const { fusion } = await renommerTerme(id, terme);
    await journaliser(fusion ? 'terme.fusionne' : 'terme.renomme', { cible: 'terme', cibleId: id, cibleLabel: terme });
    return { ok: fusion ? 'Fusionné avec le terme existant.' : 'Enregistré.' };
  } catch (erreur) {
    return { erreur: erreur.message };
  }
}

export async function effacerTerme(formData) {
  await exigerAdmin();
  const id = Number(champ(formData, 'id'));
  await supprimerTerme(id);
  await journaliser('terme.supprime', { cible: 'terme', cibleId: id, cibleLabel: champ(formData, 'terme') || undefined });
  const retour = champ(formData, 'retour');
  redirect(retour.startsWith('/admin/') ? retour : '/admin/francais');
}

// ---------------------------------------------------------------------------
// Mot du jour / jeu
// ---------------------------------------------------------------------------

export async function planifierMot(_etat, formData) {
  await exigerAdmin();
  const jour = champ(formData, 'jour');
  const type = champ(formData, 'type') === 'jeu' ? 'jeu' : 'mot';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jour)) return { erreur: 'Date invalide.' };
  const entree = await trouverEntree(champ(formData, 'mot'));
  if (!entree) return { erreur: 'Mot introuvable (indiquez l’orthographe exacte ou l’adresse de la fiche).' };
  if (type === 'jeu' && !estMotDeJeu(entree.mot)) {
    return { erreur: `« ${entree.mot} » ne convient pas au jeu : il faut un seul mot de 5 lettres.` };
  }
  await planifier(jour, type, entree.id);
  await journaliser('quotidien.planifie', {
    cible: type === 'jeu' ? 'jeu' : 'mot-du-jour',
    cibleId: entree.id,
    cibleLabel: entree.mot,
    details: jour,
  });
  return { ok: `${entree.mot} programmé le ${jour} (${type === 'jeu' ? 'Mokaché' : 'mot du jour'}).` };
}

export async function nouveauTirage(formData) {
  await exigerAdmin();
  const jour = champ(formData, 'jour');
  const type = champ(formData, 'type') === 'jeu' ? 'jeu' : 'mot';
  await annulerTirage(jour, type);
  await journaliser('quotidien.retire', { cible: type === 'jeu' ? 'jeu' : 'mot-du-jour', details: jour });
  if (jour === jourGuadeloupe()) await tirage(type, jour);
  redirect('/admin/quotidien');
}
