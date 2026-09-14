'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { annulerTirage, planifier, renommerTerme, supprimerTerme, trouverEntree } from '@/lib/admin';
import {
  adresseIp,
  estBloque,
  exigerAdmin,
  fermerSession,
  motDePasseValide,
  noterEchec,
  oublierEchecs,
  ouvrirSession,
} from '@/lib/auth';
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

export async function connexion(_etat, formData) {
  const ip = await adresseIp();
  if (estBloque(ip)) return { erreur: 'Trop de tentatives. Réessayez dans 15 minutes.' };
  let valide = false;
  try {
    valide = motDePasseValide(champ(formData, 'mot_de_passe'));
  } catch (erreur) {
    return { erreur: erreur.message };
  }
  if (!valide) {
    noterEchec(ip);
    await new Promise((r) => setTimeout(r, 600));
    return { erreur: 'Mot de passe incorrect.' };
  }
  oublierEchecs(ip);
  await ouvrirSession();
  redirect('/admin');
}

export async function deconnexion() {
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
  if (!id) redirect(`/admin/mots/${resultat.id}?cree=1`);
  refresh();
  return { ok: `Fiche enregistrée à ${new Date().toLocaleTimeString('fr-FR', { timeZone: 'America/Guadeloupe' })}.`, slug: resultat.slug };
}

export async function supprimerMot(formData) {
  await exigerAdmin();
  await supprimerFiche(Number(champ(formData, 'id')));
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
  await changerStatut(id, 'rejetee', { note: champ(formData, 'note') || null });
  redirect(`/admin/suggestions?traitee=${id}`);
}

export async function remettreEnAttente(formData) {
  await exigerAdmin();
  const id = Number(champ(formData, 'suggestion_id'));
  await changerStatut(id, 'en_attente');
  redirect(`/admin/suggestions/${id}`);
}

export async function effacerSuggestion(formData) {
  await exigerAdmin();
  await supprimerSuggestion(Number(champ(formData, 'suggestion_id')));
  redirect('/admin/suggestions?statut=rejetee');
}

// ---------------------------------------------------------------------------
// Termes français
// ---------------------------------------------------------------------------

export async function modifierTerme(_etat, formData) {
  await exigerAdmin();
  try {
    const { fusion } = await renommerTerme(Number(champ(formData, 'id')), champ(formData, 'terme'));
    return { ok: fusion ? 'Fusionné avec le terme existant.' : 'Enregistré.' };
  } catch (erreur) {
    return { erreur: erreur.message };
  }
}

export async function effacerTerme(formData) {
  await exigerAdmin();
  await supprimerTerme(Number(champ(formData, 'id')));
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
  return { ok: `${entree.mot} programmé le ${jour} (${type === 'jeu' ? 'Mo kaché' : 'mot du jour'}).` };
}

export async function nouveauTirage(formData) {
  await exigerAdmin();
  const jour = champ(formData, 'jour');
  const type = champ(formData, 'type') === 'jeu' ? 'jeu' : 'mot';
  await annulerTirage(jour, type);
  if (jour === jourGuadeloupe()) await tirage(type, jour);
  redirect('/admin/quotidien');
}
