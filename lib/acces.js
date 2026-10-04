import { premiere, requete } from './db';

// Demandes d'accès à l'API (table access_requests). Aucun compte n'est créé ici :
// l'administrateur examine la demande puis crée le partenaire (voir lib/partenaires.js).

const MAX_PAR_HEURE = 3;

export async function tropDeDemandes(ipHash) {
  const { n } = await premiere(
    'SELECT COUNT(*) AS n FROM access_requests WHERE ip_hash = ? AND created_at > NOW() - INTERVAL 1 HOUR',
    [ipHash],
  );
  return n >= MAX_PAR_HEURE;
}

export async function creerDemande(d) {
  const { insertId } = await requete(
    `INSERT INTO access_requests (name, email, site_url, usage_desc, non_commercial, ip_hash)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [d.name, d.email, d.site_url || null, d.usage_desc, d.non_commercial ? 1 : 0, d.ip_hash ?? null],
  );
  return insertId;
}

export async function listerDemandes(status = 'pending') {
  return requete(
    `SELECT id, name, email, site_url, usage_desc, non_commercial, status, created_at, handled_at
       FROM access_requests WHERE status = ? ORDER BY created_at DESC LIMIT 100`,
    [status],
  );
}

export async function compterDemandes() {
  const lignes = await requete('SELECT status, COUNT(*) AS n FROM access_requests GROUP BY status');
  return Object.fromEntries(['pending', 'approved', 'rejected'].map((s) => [s, lignes.find((l) => l.status === s)?.n ?? 0]));
}

export async function obtenirDemande(id) {
  return premiere('SELECT * FROM access_requests WHERE id = ?', [id]);
}

export async function changerStatutDemande(id, status) {
  await requete('UPDATE access_requests SET status = ?, handled_at = NOW() WHERE id = ?', [status, id]);
}
