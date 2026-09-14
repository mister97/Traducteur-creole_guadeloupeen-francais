import crypto from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE_ADMIN, creerJeton, DUREE_SESSION, egaux, jetonValide } from './session';

// ADMIN_PASSWORD_HASH (recommandé, généré par « npm run admin:hash ») ou ADMIN_PASSWORD en clair
export function motDePasseValide(saisie) {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (hash) {
    const [algo, sel, attendu] = hash.split(':');
    if (algo !== 'scrypt' || !sel || !attendu) throw new Error('ADMIN_PASSWORD_HASH mal formé.');
    const calcule = crypto.scryptSync(String(saisie), Buffer.from(sel, 'base64'), 64).toString('base64');
    return egaux(calcule, attendu);
  }
  if (process.env.ADMIN_PASSWORD) return egaux(String(saisie), process.env.ADMIN_PASSWORD);
  throw new Error('Aucun mot de passe admin configuré (ADMIN_PASSWORD_HASH ou ADMIN_PASSWORD).');
}

// --- limitation des tentatives (en mémoire, par adresse IP) ---
const tentatives = new Map();
const MAX_ECHECS = 5;
const BLOCAGE_MS = 15 * 60 * 1000;

export async function adresseIp() {
  const h = await headers();
  return (h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || 'inconnue').trim();
}

export function estBloque(ip) {
  const t = tentatives.get(ip);
  return Boolean(t && t.bloqueJusqua > Date.now());
}

export function noterEchec(ip) {
  const t = tentatives.get(ip) ?? { echecs: 0, bloqueJusqua: 0 };
  t.echecs += 1;
  if (t.echecs >= MAX_ECHECS) {
    t.bloqueJusqua = Date.now() + BLOCAGE_MS;
    t.echecs = 0;
  }
  tentatives.set(ip, t);
}

export function oublierEchecs(ip) {
  tentatives.delete(ip);
}

// --- session ---
export async function ouvrirSession() {
  (await cookies()).set(COOKIE_ADMIN, creerJeton(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DUREE_SESSION,
  });
}

export async function fermerSession() {
  (await cookies()).delete(COOKIE_ADMIN);
}

export async function estAdmin() {
  return jetonValide((await cookies()).get(COOKIE_ADMIN)?.value);
}

// À appeler en tête de chaque action et route de l'admin (proxy.js protège aussi les pages)
export async function exigerAdmin() {
  if (!(await estAdmin())) redirect('/admin/connexion');
}
