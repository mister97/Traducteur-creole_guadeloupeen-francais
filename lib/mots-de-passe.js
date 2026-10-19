import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';
import { motDePasseTropCourant } from './mots-de-passe-courants';

// Politique commune à l'espace partenaire et à l'administration.

export const LONGUEUR_MOT_DE_PASSE = 12;

// Argon2id, mémoire ≥ 19 Mio (recommandation OWASP)
export const OPTIONS_ARGON = { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 };

export function motDePasseAcceptable(motDePasse) {
  const valeur = String(motDePasse ?? '');
  if (valeur.length < LONGUEUR_MOT_DE_PASSE) {
    return { ok: false, message: `Le mot de passe doit faire au moins ${LONGUEUR_MOT_DE_PASSE} caractères.` };
  }
  if (motDePasseTropCourant(valeur)) {
    return { ok: false, message: 'Ce mot de passe est trop courant. Choisissez-en un autre, par exemple une phrase.' };
  }
  return { ok: true };
}

export function hacherMotDePasse(motDePasse) {
  return argonHash(motDePasse, OPTIONS_ARGON);
}

export async function verifierMotDePasse(hash, motDePasse) {
  try {
    return await argonVerify(hash, motDePasse);
  } catch {
    return false;
  }
}

// Occupe le même temps qu'une vérification réelle, pour qu'un compte inexistant
// ne se distingue pas d'un mot de passe faux.
export async function egaliserLeTemps() {
  await argonHash('verification-a-vide-pour-egaliser-le-temps', OPTIONS_ARGON).catch(() => {});
}
