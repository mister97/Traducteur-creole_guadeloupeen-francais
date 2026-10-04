'use server';

import { redirect } from 'next/navigation';
import { enregistrerAcceptation, TERMS_VERSION } from '@/lib/conditions';
import { mailEvenementPartenaire, mailReinitialisation } from '@/lib/mail';
import {
  consommerJeton,
  contexteRequete,
  creerCleApi,
  creerJeton,
  definirMotDePasse,
  fermerSessionPartenaire,
  motDePasseAcceptable,
  ouvrirSessionPartenaire,
  partenaireConnecte,
  partenaireDuJeton,
  partenaireParEmail,
  revoquerCle,
  verifierIdentifiants,
} from '@/lib/partenaires';

const champ = (formData, nom) => String(formData.get(nom) ?? '').trim();

// Limitation des tentatives par IP, en complément du blocage par compte
const tentatives = new Map();
function tropDeTentatives(ipHash) {
  const t = tentatives.get(ipHash);
  if (!t || Date.now() > t.jusqua) return false;
  return t.n >= 10;
}
function noterTentative(ipHash) {
  const t = tentatives.get(ipHash);
  if (!t || Date.now() > t.jusqua) tentatives.set(ipHash, { n: 1, jusqua: Date.now() + 15 * 60_000 });
  else t.n += 1;
}

async function exigerPartenaireAction() {
  const partenaire = await partenaireConnecte();
  if (!partenaire) redirect('/partenaire/connexion');
  return partenaire;
}

// ---------------------------------------------------------------------------
// Connexion
// ---------------------------------------------------------------------------

export async function connexionPartenaire(_etat, formData) {
  const { ipHash } = await contexteRequete();
  if (tropDeTentatives(ipHash)) return { erreur: 'Trop de tentatives. Réessayez dans quinze minutes.' };

  const { partenaire, erreur } = await verifierIdentifiants(champ(formData, 'email'), champ(formData, 'mot_de_passe'));
  if (erreur) {
    noterTentative(ipHash);
    await new Promise((r) => setTimeout(r, 400));
    if (erreur === 'bloque') return { erreur: 'Trop de tentatives : ce compte est bloqué quinze minutes.' };
    if (erreur === 'suspendu') return { erreur: 'Cet accès est suspendu. Écrivez-nous pour en connaître la raison.' };
    return { erreur: 'E-mail ou mot de passe incorrect.' };
  }
  await ouvrirSessionPartenaire(partenaire);
  redirect('/partenaire');
}

export async function deconnexionPartenaire() {
  await fermerSessionPartenaire();
  redirect('/partenaire/connexion');
}

// ---------------------------------------------------------------------------
// Mot de passe
// ---------------------------------------------------------------------------

export async function demanderReinitialisation(_etat, formData) {
  const email = champ(formData, 'email');
  const partenaire = await partenaireParEmail(email);
  if (partenaire && partenaire.is_active && !partenaire.suspended_at) {
    const { jeton, heures } = await creerJeton(partenaire.id, 'reset');
    try {
      await mailReinitialisation(partenaire, jeton, heures);
    } catch (erreur) {
      console.error('Mail de réinitialisation non envoyé :', erreur.message);
    }
  }
  // Réponse identique que l'adresse existe ou non
  return { ok: true };
}

export async function definirMotDePasseAction(_etat, formData) {
  const jeton = champ(formData, 'jeton');
  const motDePasse = String(formData.get('mot_de_passe') ?? '');
  const confirmation = String(formData.get('confirmation') ?? '');

  const purpose = (await partenaireDuJeton(jeton, 'invitation')) ? 'invitation' : 'reset';
  const partenaire = await partenaireDuJeton(jeton, purpose);
  if (!partenaire) return { erreur: 'Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau.' };

  if (motDePasse !== confirmation) return { erreur: 'Les deux mots de passe ne sont pas identiques.' };
  const verdict = motDePasseAcceptable(motDePasse);
  if (!verdict.ok) return { erreur: verdict.message };

  if (!(await consommerJeton(jeton, purpose))) {
    return { erreur: 'Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau.' };
  }
  await definirMotDePasse(partenaire.id, motDePasse);
  if (purpose === 'reset') {
    try {
      await mailEvenementPartenaire(partenaire, 'mot_de_passe');
    } catch (erreur) {
      console.error('Mail de changement de mot de passe non envoyé :', erreur.message);
    }
  }
  redirect('/partenaire/connexion?nouveau=1');
}

// ---------------------------------------------------------------------------
// Conditions, clés
// ---------------------------------------------------------------------------

export async function accepterConditions(_etat, formData) {
  const partenaire = await exigerPartenaireAction();
  if (formData.get('accepte') !== 'on') return { erreur: 'Cochez la case pour accepter les conditions.' };
  const { ipHash, userAgent } = await contexteRequete();
  await enregistrerAcceptation(partenaire.id, { ipHash, userAgent });
  return { ok: `Conditions version ${TERMS_VERSION} acceptées.` };
}

export async function creerCleAction(_etat, formData) {
  const partenaire = await exigerPartenaireAction();
  const label = champ(formData, 'label').slice(0, 120) || 'Clé sans nom';
  const resultat = await creerCleApi(partenaire.id, label);
  if (resultat.erreur) return { erreur: resultat.erreur };
  try {
    await mailEvenementPartenaire(partenaire, 'cle_creee', label);
  } catch (erreur) {
    console.error('Mail de création de clé non envoyé :', erreur.message);
  }
  return { cle: resultat.cle, label };
}

export async function revoquerCleAction(formData) {
  const partenaire = await exigerPartenaireAction();
  const id = Number(champ(formData, 'cle_id'));
  const label = champ(formData, 'label');
  if (await revoquerCle(partenaire.id, id)) {
    try {
      await mailEvenementPartenaire(partenaire, 'cle_revoquee', label);
    } catch (erreur) {
      console.error('Mail de révocation non envoyé :', erreur.message);
    }
  }
  redirect('/partenaire?revoquee=1');
}
