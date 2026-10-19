import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { utilisateurConnecte } from './comptes-admin';

// Contrôle d'accès de l'administration. À appeler en tête de CHAQUE page,
// action serveur et route de /admin : proxy.js n'est qu'un aiguillage.

export { utilisateurConnecte };

// --- limitation par adresse IP (en mémoire), en plus du verrouillage par
// compte qui lui est en base : protège aussi contre le balayage d'adresses ---
const compteurs = new Map();

export async function adresseIp() {
  const h = await headers();
  return (h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || 'inconnue').trim();
}

export function estBloque(usage, ip) {
  const t = compteurs.get(`${usage}|${ip}`);
  return Boolean(t && t.bloqueJusqua > Date.now());
}

export function noterEchec(usage, ip, { max = 10, minutes = 15 } = {}) {
  const cle = `${usage}|${ip}`;
  const t = compteurs.get(cle) ?? { echecs: 0, bloqueJusqua: 0 };
  t.echecs += 1;
  if (t.echecs >= max) {
    t.bloqueJusqua = Date.now() + minutes * 60_000;
    t.echecs = 0;
  }
  compteurs.set(cle, t);
}

export function oublierEchecs(usage, ip) {
  compteurs.delete(`${usage}|${ip}`);
}

// --- garde-fous ---

export async function estAdmin() {
  return Boolean(await utilisateurConnecte());
}

// Renvoie le compte connecté, ou redirige vers la connexion.
export async function exigerAdmin() {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) redirect('/admin/connexion');
  return utilisateur;
}

// Gestion des comptes : réservée aux propriétaires.
export async function exigerProprietaire() {
  const utilisateur = await exigerAdmin();
  if (utilisateur.role !== 'proprietaire') redirect('/admin?interdit=1');
  return utilisateur;
}
