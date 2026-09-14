import crypto from 'node:crypto';
import { premiere, requete } from './db';
import { CONSERVATION } from './mentions';

export const TYPES = ['ajout', 'correction', 'remarque'];
export const STATUTS = ['en_attente', 'validee', 'rejetee'];
const MAX_PAR_HEURE = 6;

export function hacherIp(ip) {
  return crypto
    .createHash('sha256')
    .update(`${ip}|${process.env.SESSION_SECRET ?? 'mofwaze'}`)
    .digest('hex');
}

export async function tropDeSuggestions(ipHash) {
  const ligne = await premiere(
    'SELECT COUNT(*) AS n FROM suggestions WHERE ip_hash = ? AND cree_le > NOW() - INTERVAL 1 HOUR',
    [ipHash],
  );
  return ligne.n >= MAX_PAR_HEURE;
}

export async function creerSuggestion(s) {
  const { insertId } = await requete(
    `INSERT INTO suggestions (type, entree_id, mot, donnees, message, nom, email, notifier, langue, ip_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      s.type,
      s.entree_id ?? null,
      s.mot || null,
      s.donnees ? JSON.stringify(s.donnees) : null,
      s.message || null,
      s.nom || null,
      s.email || null,
      s.notifier ? 1 : 0,
      s.langue === 'fr' ? 'fr' : 'kr',
      s.ip_hash ?? null,
    ],
  );
  return insertId;
}

function decoder(ligne) {
  if (!ligne) return null;
  let donnees = null;
  try {
    donnees = ligne.donnees ? JSON.parse(ligne.donnees) : null;
  } catch {
    donnees = null;
  }
  return { ...ligne, donnees };
}

export async function obtenirSuggestion(id) {
  return decoder(
    await premiere(
      `SELECT s.*, e.mot AS entree_mot, e.slug AS entree_slug
         FROM suggestions s LEFT JOIN entrees e ON e.id = s.entree_id
        WHERE s.id = ?`,
      [id],
    ),
  );
}

export async function listerSuggestions({ statut = 'en_attente', limite = 50, decalage = 0 } = {}) {
  const filtre = STATUTS.includes(statut) ? statut : 'en_attente';
  const [lignes, [{ total }]] = await Promise.all([
    requete(
      `SELECT s.id, s.type, s.mot, s.message, s.nom, s.email, s.statut, s.cree_le, s.traite_le,
              e.mot AS entree_mot, e.slug AS entree_slug
         FROM suggestions s LEFT JOIN entrees e ON e.id = s.entree_id
        WHERE s.statut = ?
        ORDER BY ${filtre === 'en_attente' ? 's.cree_le ASC' : 's.traite_le DESC, s.id DESC'}
        LIMIT ? OFFSET ?`,
      [filtre, limite, decalage],
    ),
    requete('SELECT COUNT(*) AS total FROM suggestions WHERE statut = ?', [filtre]),
  ]);
  return { total, suggestions: lignes };
}

export async function compterSuggestions() {
  const lignes = await requete('SELECT statut, COUNT(*) AS n FROM suggestions GROUP BY statut');
  return Object.fromEntries(STATUTS.map((s) => [s, lignes.find((l) => l.statut === s)?.n ?? 0]));
}

export async function changerStatut(id, statut, { note, entreeId } = {}) {
  await requete(
    `UPDATE suggestions
        SET statut = ?, note_admin = COALESCE(?, note_admin), entree_id = COALESCE(?, entree_id),
            traite_le = IF(? = 'en_attente', NULL, NOW())
      WHERE id = ?`,
    [statut, note ?? null, entreeId ?? null, statut, id],
  );
}

// Efface les données personnelles devenues inutiles (durées annoncées sur /confidentialite).
// Appelée à chaque nouvelle suggestion et à l'ouverture du tableau de bord.
export async function purgerDonneesPersonnelles() {
  await requete('UPDATE suggestions SET ip_hash = NULL WHERE ip_hash IS NOT NULL AND cree_le < NOW() - INTERVAL ? DAY', [
    CONSERVATION.empreinteIpJours,
  ]);
  await requete(
    `UPDATE suggestions SET nom = NULL, email = NULL, notifier = 0
      WHERE (nom IS NOT NULL OR email IS NOT NULL)
        AND statut <> 'en_attente' AND traite_le < NOW() - INTERVAL ? MONTH`,
    [CONSERVATION.contactMoisApresTraitement],
  );
}

export async function supprimerSuggestion(id) {
  await requete('DELETE FROM suggestions WHERE id = ?', [id]);
}
