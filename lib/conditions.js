import { readFileSync } from 'node:fs';
import path from 'node:path';
import { premiere, requete } from './db';

// Version en cours des conditions d'utilisation de l'API.
// Toute modification du texte impose un NOUVEAU numéro : une version déjà
// acceptée n'est jamais réécrite (la trace des accords doit rester lisible).
export const TERMS_VERSION = '1.2';

let cacheTexte = null;

export function texteConditions() {
  if (cacheTexte === null) {
    cacheTexte = readFileSync(path.join(process.cwd(), 'content', 'conditions-api.md'), 'utf8');
  }
  return cacheTexte;
}

// Dernière acceptation d'un partenaire, ou null
export async function derniereAcceptation(partnerId) {
  return premiere(
    'SELECT terms_version, accepted_at FROM terms_acceptances WHERE partner_id = ? ORDER BY accepted_at DESC, id DESC LIMIT 1',
    [partnerId],
  );
}

export async function aAccepteVersionCourante(partnerId) {
  const derniere = await derniereAcceptation(partnerId);
  return derniere?.terms_version === TERMS_VERSION;
}

export async function enregistrerAcceptation(partnerId, { ipHash, userAgent }) {
  await requete(
    'INSERT INTO terms_acceptances (partner_id, terms_version, ip_hash, user_agent) VALUES (?, ?, ?, ?)',
    [partnerId, TERMS_VERSION, ipHash ?? '', (userAgent ?? '').slice(0, 255) || null],
  );
}

export async function historiqueAcceptations(partnerId) {
  return requete(
    'SELECT terms_version, accepted_at FROM terms_acceptances WHERE partner_id = ? ORDER BY accepted_at DESC',
    [partnerId],
  );
}
