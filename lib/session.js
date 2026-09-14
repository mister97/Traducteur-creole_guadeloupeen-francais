import crypto from 'node:crypto';

// Jeton de session admin « expiration.signature », partagé entre proxy.js et lib/auth.js

export const COOKIE_ADMIN = 'mofwaze_admin';
export const DUREE_SESSION = 7 * 24 * 3600; // secondes

function secret() {
  const valeur = process.env.SESSION_SECRET;
  if (!valeur || valeur.length < 32) {
    throw new Error('SESSION_SECRET doit être défini (32 caractères minimum).');
  }
  return valeur;
}

function signer(valeur) {
  return crypto.createHmac('sha256', secret()).update(valeur).digest('base64url');
}

export function egaux(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export function creerJeton() {
  const expiration = String(Date.now() + DUREE_SESSION * 1000);
  return `${expiration}.${signer(expiration)}`;
}

export function jetonValide(jeton) {
  if (!jeton) return false;
  const [expiration, signature] = String(jeton).split('.');
  if (!expiration || !signature || !egaux(signature, signer(expiration))) return false;
  return Number(expiration) > Date.now();
}
