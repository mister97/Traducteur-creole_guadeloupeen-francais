'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { adresseIp, estBloque, exigerAdmin, exigerProprietaire, noterEchec } from '@/lib/auth';
import {
  changerRole,
  changerSuspension,
  consommerJetonAdmin,
  creerJetonAdmin,
  creerUtilisateur,
  definirMotDePasse,
  marquerConnexion,
  obtenirUtilisateur,
  ouvrirSession,
  supprimerUtilisateur,
  utilisateurDuJeton,
  utilisateurParEmail,
  verifierIdentifiants,
} from '@/lib/comptes-admin';
import { journaliser } from '@/lib/journal';
import { mailInvitationAdmin, mailReinitialisationAdmin } from '@/lib/mail';
import { motDePasseAcceptable } from '@/lib/mots-de-passe';
import { SITE_URL } from '@/lib/site';

const champ = (formData, nom) => String(formData.get(nom) ?? '').trim();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const lienMotDePasse = (jeton) => `${SITE_URL}/admin/mot-de-passe/${jeton}`;

// ---------------------------------------------------------------------------
// Gestion des comptes (propriétaires uniquement)
// ---------------------------------------------------------------------------

export async function inviterUtilisateur(_etat, formData) {
  const moi = await exigerProprietaire();
  const name = champ(formData, 'nom');
  const email = champ(formData, 'email').toLowerCase();
  const role = champ(formData, 'role') === 'proprietaire' ? 'proprietaire' : 'editeur';

  if (name.length < 2) return { erreur: 'Indiquez le nom de la personne.' };
  if (!EMAIL.test(email)) return { erreur: 'Adresse e-mail invalide.' };

  const creation = await creerUtilisateur({ name, email, role, createur: moi.id });
  if (creation.erreur) return { erreur: creation.erreur };

  const utilisateur = await obtenirUtilisateur(creation.id);
  const { jeton, heures } = await creerJetonAdmin(utilisateur.id, 'invitation');
  await journaliser('utilisateur.cree', {
    cible: 'utilisateur',
    cibleId: utilisateur.id,
    cibleLabel: `${name} <${email}>`,
    details: `rôle : ${role}`,
  });

  let envoye = false;
  try {
    envoye = await mailInvitationAdmin(utilisateur, jeton, heures, moi.name);
  } catch (erreur) {
    console.error('Invitation non envoyée :', erreur.message);
  }
  // Le lien est affiché une seule fois : il n'est pas récupérable ensuite
  // (seule son empreinte est en base).
  return { ok: `Compte créé pour ${name}.`, lien: lienMotDePasse(jeton), envoye, heures };
}

export async function renvoyerLienAdmin(_etat, formData) {
  const moi = await exigerProprietaire();
  const utilisateur = await obtenirUtilisateur(Number(champ(formData, 'id')));
  if (!utilisateur) return { erreur: 'Compte introuvable.' };

  const premiereFois = !utilisateur.password_hash;
  const { jeton, heures } = await creerJetonAdmin(utilisateur.id, premiereFois ? 'invitation' : 'reset');
  await journaliser('utilisateur.invitation', {
    cible: 'utilisateur',
    cibleId: utilisateur.id,
    cibleLabel: `${utilisateur.name} <${utilisateur.email}>`,
    details: premiereFois ? 'nouvelle invitation' : 'lien de réinitialisation',
  });

  let envoye = false;
  try {
    envoye = premiereFois
      ? await mailInvitationAdmin(utilisateur, jeton, heures, moi.name)
      : await mailReinitialisationAdmin(utilisateur, jeton, heures);
  } catch (erreur) {
    console.error('Lien non envoyé :', erreur.message);
  }
  return { ok: `Lien régénéré pour ${utilisateur.name}.`, lien: lienMotDePasse(jeton), envoye, heures };
}

export async function modifierRole(formData) {
  await exigerProprietaire();
  const id = Number(champ(formData, 'id'));
  const role = champ(formData, 'role');
  const utilisateur = await obtenirUtilisateur(id);
  if (!utilisateur) redirect('/admin/utilisateurs?erreur=introuvable');

  const resultat = await changerRole(id, role);
  if (resultat.erreur) redirect(`/admin/utilisateurs?erreur=${encodeURIComponent(resultat.erreur)}`);
  await journaliser('utilisateur.role', {
    cible: 'utilisateur',
    cibleId: id,
    cibleLabel: `${utilisateur.name} <${utilisateur.email}>`,
    details: `${utilisateur.role} → ${role}`,
  });
  redirect('/admin/utilisateurs?ok=role');
}

export async function basculerSuspensionUtilisateur(formData) {
  const moi = await exigerProprietaire();
  const id = Number(champ(formData, 'id'));
  const suspendre = champ(formData, 'suspendre') === '1';
  if (id === moi.id) redirect('/admin/utilisateurs?erreur=' + encodeURIComponent('Vous ne pouvez pas suspendre votre propre compte.'));

  const utilisateur = await obtenirUtilisateur(id);
  if (!utilisateur) redirect('/admin/utilisateurs?erreur=introuvable');

  const resultat = await changerSuspension(id, suspendre);
  if (resultat.erreur) redirect(`/admin/utilisateurs?erreur=${encodeURIComponent(resultat.erreur)}`);
  await journaliser(suspendre ? 'utilisateur.suspendu' : 'utilisateur.reactive', {
    cible: 'utilisateur',
    cibleId: id,
    cibleLabel: `${utilisateur.name} <${utilisateur.email}>`,
  });
  redirect(`/admin/utilisateurs?ok=${suspendre ? 'suspendu' : 'reactive'}`);
}

export async function retirerUtilisateur(formData) {
  const moi = await exigerProprietaire();
  const id = Number(champ(formData, 'id'));
  if (id === moi.id) redirect('/admin/utilisateurs?erreur=' + encodeURIComponent('Vous ne pouvez pas supprimer votre propre compte.'));

  const utilisateur = await obtenirUtilisateur(id);
  if (!utilisateur) redirect('/admin/utilisateurs?erreur=introuvable');

  const resultat = await supprimerUtilisateur(id);
  if (resultat.erreur) redirect(`/admin/utilisateurs?erreur=${encodeURIComponent(resultat.erreur)}`);
  // Journalisé après coup : la ligne garde le nom, le lien vers le compte est rompu
  await journaliser('utilisateur.supprime', { cible: 'utilisateur', cibleLabel: `${utilisateur.name} <${utilisateur.email}>` });
  redirect('/admin/utilisateurs?ok=supprime');
}

// ---------------------------------------------------------------------------
// Mot de passe
// ---------------------------------------------------------------------------

// Depuis un lien d'invitation ou de réinitialisation. Ouvre la session dans la foulée.
export async function definirMonMotDePasse(_etat, formData) {
  const jeton = champ(formData, 'jeton');
  const motDePasse = String(formData.get('mot_de_passe') ?? '');
  const confirmation = String(formData.get('confirmation') ?? '');

  const utilisateur = (await utilisateurDuJeton(jeton, 'invitation')) ?? (await utilisateurDuJeton(jeton, 'reset'));
  if (!utilisateur) return { erreur: 'Ce lien a expiré ou a déjà été utilisé.' };
  if (motDePasse !== confirmation) return { erreur: 'Les deux mots de passe ne correspondent pas.' };

  const verdict = motDePasseAcceptable(motDePasse);
  if (!verdict.ok) return { erreur: verdict.message };

  const purpose = (await utilisateurDuJeton(jeton, 'invitation')) ? 'invitation' : 'reset';
  // Usage unique : si la consommation échoue, le lien vient d'être utilisé ailleurs
  if (!(await consommerJetonAdmin(jeton, purpose))) return { erreur: 'Ce lien a expiré ou a déjà été utilisé.' };

  await definirMotDePasse(utilisateur.id, motDePasse);
  await marquerConnexion(utilisateur.id);
  const frais = await obtenirUtilisateur(utilisateur.id); // le hash a changé : la signature doit en tenir compte
  await ouvrirSession(frais);
  await journaliser('motdepasse.change', {
    cible: 'utilisateur',
    cibleId: frais.id,
    details: purpose === 'invitation' ? 'première connexion' : 'après réinitialisation',
    acteur: frais,
  });
  redirect('/admin');
}

// Depuis l'espace connecté : exige le mot de passe actuel.
export async function changerMonMotDePasse(_etat, formData) {
  const moi = await exigerAdmin();
  const actuel = String(formData.get('actuel') ?? '');
  const motDePasse = String(formData.get('mot_de_passe') ?? '');
  const confirmation = String(formData.get('confirmation') ?? '');

  const controle = await verifierIdentifiants(moi.email, actuel);
  if (controle.erreur) return { erreur: 'Mot de passe actuel incorrect.' };
  if (motDePasse !== confirmation) return { erreur: 'Les deux nouveaux mots de passe ne correspondent pas.' };

  const verdict = motDePasseAcceptable(motDePasse);
  if (!verdict.ok) return { erreur: verdict.message };

  await definirMotDePasse(moi.id, motDePasse);
  await journaliser('motdepasse.change', { cible: 'utilisateur', cibleId: moi.id, acteur: moi });
  // Toutes les sessions sont invalidées, y compris celle-ci : on en rouvre une
  const frais = await obtenirUtilisateur(moi.id);
  await ouvrirSession(frais);
  refresh();
  return { ok: 'Mot de passe modifié. Vos autres sessions ont été fermées.' };
}

// Page publique : ne révèle jamais si l'adresse correspond à un compte.
export async function demanderReinitialisation(_etat, formData) {
  const ip = await adresseIp();
  const reponse = {
    ok: 'Si un compte existe pour cette adresse, un lien vient d’être envoyé. Vérifiez vos messages.',
  };
  if (estBloque('reinit', ip)) return reponse;
  noterEchec('reinit', ip, { max: 5, minutes: 15 });

  const email = champ(formData, 'email').toLowerCase();
  if (!EMAIL.test(email)) return reponse;

  const utilisateur = await utilisateurParEmail(email);
  if (utilisateur?.password_hash && utilisateur.is_active && !utilisateur.suspended_at) {
    const { jeton, heures } = await creerJetonAdmin(utilisateur.id, 'reset');
    await journaliser('motdepasse.demande', { cible: 'utilisateur', cibleId: utilisateur.id, acteur: utilisateur });
    try {
      await mailReinitialisationAdmin(utilisateur, jeton, heures);
    } catch (erreur) {
      console.error('Réinitialisation non envoyée :', erreur.message);
    }
  }
  return reponse;
}
