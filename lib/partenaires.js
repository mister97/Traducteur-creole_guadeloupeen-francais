import crypto from 'node:crypto';
import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';
import { cookies, headers } from 'next/headers';
import { genererCle } from './api';
import { premiere, requete, transaction } from './db';
import { motDePasseTropCourant } from './mots-de-passe-courants';
import { hacherIp } from './suggestions';

export const LONGUEUR_MOT_DE_PASSE = 12;
export const CLES_MAX = 3;
const COOKIE = 'chalviraj_partenaire';
const DUREE_SESSION_JOURS = 30;
const MAX_ECHECS = 5;
const BLOCAGE_MINUTES = 15;
const DUREE_INVITATION_H = 24;
const DUREE_REINITIALISATION_H = 1;

// Argon2id, mémoire ≥ 19 Mio (recommandation OWASP)
const OPTIONS_ARGON = { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 };

function secret() {
  const valeur = process.env.SESSION_SECRET;
  if (!valeur || valeur.length < 32) throw new Error('SESSION_SECRET doit être défini (32 caractères minimum).');
  return valeur;
}

const hacherJeton = (jeton) => crypto.createHash('sha256').update(String(jeton)).digest('hex');

// ---------------------------------------------------------------------------
// Mots de passe
// ---------------------------------------------------------------------------

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

export async function definirMotDePasse(partenaireId, motDePasse) {
  const hash = await argonHash(motDePasse, OPTIONS_ARGON);
  await transaction(async (tx) => {
    await tx.requete(
      `UPDATE partners SET password_hash = ?, password_set_at = NOW(), failed_attempts = 0, locked_until = NULL
        WHERE id = ?`,
      [hash, partenaireId],
    );
    // Changer de mot de passe invalide les jetons en attente (et toutes les sessions,
    // dont la signature dépend du hash du mot de passe)
    await tx.requete('UPDATE auth_tokens SET used_at = NOW() WHERE partner_id = ? AND used_at IS NULL', [partenaireId]);
  });
}

// ---------------------------------------------------------------------------
// Jetons d'invitation et de réinitialisation (usage unique)
// ---------------------------------------------------------------------------

export async function creerJeton(partenaireId, purpose) {
  const heures = purpose === 'invitation' ? DUREE_INVITATION_H : DUREE_REINITIALISATION_H;
  const jeton = crypto.randomBytes(32).toString('base64url');
  await transaction(async (tx) => {
    // Un seul jeton valide à la fois pour un même usage
    await tx.requete('UPDATE auth_tokens SET used_at = NOW() WHERE partner_id = ? AND purpose = ? AND used_at IS NULL', [
      partenaireId,
      purpose,
    ]);
    await tx.requete(
      'INSERT INTO auth_tokens (partner_id, purpose, token_hash, expires_at) VALUES (?, ?, ?, NOW() + INTERVAL ? HOUR)',
      [partenaireId, purpose, hacherJeton(jeton), heures],
    );
  });
  return { jeton, heures };
}

export async function partenaireDuJeton(jeton, purpose) {
  if (!jeton) return null;
  return premiere(
    `SELECT p.* FROM auth_tokens j JOIN partners p ON p.id = j.partner_id
      WHERE j.token_hash = ? AND j.purpose = ? AND j.used_at IS NULL AND j.expires_at > NOW()`,
    [hacherJeton(jeton), purpose],
  );
}

export async function consommerJeton(jeton, purpose) {
  const { affectedRows } = await requete(
    'UPDATE auth_tokens SET used_at = NOW() WHERE token_hash = ? AND purpose = ? AND used_at IS NULL AND expires_at > NOW()',
    [hacherJeton(jeton), purpose],
  );
  return affectedRows === 1;
}

// ---------------------------------------------------------------------------
// Connexion
// ---------------------------------------------------------------------------

export async function partenaireParEmail(email) {
  return premiere('SELECT * FROM partners WHERE contact_email = ?', [String(email).trim().toLowerCase()]);
}

export async function verifierIdentifiants(email, motDePasse) {
  const partenaire = await partenaireParEmail(email);
  // Réponse volontairement identique que le compte existe ou non
  if (!partenaire || !partenaire.password_hash) {
    await argonHash('verification-a-vide-pour-egaliser-le-temps', OPTIONS_ARGON).catch(() => {});
    return { erreur: 'identifiants' };
  }
  if (partenaire.locked_until && new Date(`${partenaire.locked_until.replace(' ', 'T')}Z`) > new Date()) {
    return { erreur: 'bloque' };
  }
  let valide = false;
  try {
    valide = await argonVerify(partenaire.password_hash, motDePasse);
  } catch {
    valide = false;
  }
  if (!valide) {
    await requete(
      // Dans une même instruction, MySQL lit la valeur déjà incrémentée :
      // la comparaison porte donc bien sur le nouveau compteur.
      `UPDATE partners
          SET failed_attempts = failed_attempts + 1,
              locked_until = IF(failed_attempts >= ?, NOW() + INTERVAL ? MINUTE, locked_until)
        WHERE id = ?`,
      [MAX_ECHECS, BLOCAGE_MINUTES, partenaire.id],
    );
    return { erreur: 'identifiants' };
  }
  if (!partenaire.is_active || partenaire.suspended_at) return { erreur: 'suspendu' };
  await requete('UPDATE partners SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?', [
    partenaire.id,
  ]);
  return { partenaire };
}

// ---------------------------------------------------------------------------
// Session (cookie signé : la signature dépend du hash du mot de passe,
// donc changer de mot de passe déconnecte toutes les sessions)
// ---------------------------------------------------------------------------

function signature(partenaire, expiration, alea) {
  return crypto
    .createHmac('sha256', secret())
    .update(`${partenaire.id}.${expiration}.${alea}.${partenaire.password_hash ?? ''}`)
    .digest('base64url');
}

export async function ouvrirSessionPartenaire(partenaire) {
  const expiration = Date.now() + DUREE_SESSION_JOURS * 86400_000;
  const alea = crypto.randomBytes(12).toString('base64url'); // identifiant de session, régénéré à chaque connexion
  (await cookies()).set(COOKIE, `${partenaire.id}.${expiration}.${alea}.${signature(partenaire, expiration, alea)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DUREE_SESSION_JOURS * 86400,
  });
}

export async function fermerSessionPartenaire() {
  (await cookies()).delete(COOKIE);
}

export async function partenaireConnecte() {
  const valeur = (await cookies()).get(COOKIE)?.value;
  if (!valeur) return null;
  const [id, expiration, alea, signe] = valeur.split('.');
  if (!id || !expiration || !alea || !signe || Number(expiration) < Date.now()) return null;
  const partenaire = await premiere('SELECT * FROM partners WHERE id = ?', [Number(id)]);
  if (!partenaire || !partenaire.is_active || partenaire.suspended_at) return null;
  const attendue = signature(partenaire, expiration, alea);
  const a = Buffer.from(signe);
  const b = Buffer.from(attendue);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return partenaire;
}

export async function contexteRequete() {
  const h = await headers();
  return {
    ipHash: hacherIp((h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || 'inconnue').trim()),
    userAgent: h.get('user-agent') ?? '',
  };
}

// ---------------------------------------------------------------------------
// Partenaires (administration)
// ---------------------------------------------------------------------------

export async function creerPartenaire({ name, contact_email, site_url, usage_type = 'non_commercial' }) {
  const { insertId } = await requete(
    'INSERT INTO partners (name, contact_email, site_url, usage_type) VALUES (?, ?, ?, ?)',
    [name, String(contact_email).trim().toLowerCase(), site_url || null, usage_type],
  );
  return insertId;
}

export async function listerPartenaires() {
  return requete(
    `SELECT p.*,
            (SELECT COUNT(*) FROM api_keys k WHERE k.partner_id = p.id AND k.revoked_at IS NULL) AS cles_actives,
            (SELECT MAX(k.last_used_at) FROM api_keys k WHERE k.partner_id = p.id) AS dernier_appel,
            (SELECT t.terms_version FROM terms_acceptances t WHERE t.partner_id = p.id ORDER BY t.accepted_at DESC LIMIT 1) AS version_acceptee
       FROM partners p ORDER BY p.created_at DESC`,
  );
}

export async function obtenirPartenaire(id) {
  return premiere('SELECT * FROM partners WHERE id = ?', [id]);
}

// Export complet : accordé au cas par cas depuis l'administration
export async function changerExport(id, autorise) {
  await requete('UPDATE partners SET export_autorise = ? WHERE id = ?', [autorise ? 1 : 0, id]);
}

export async function changerSuspension(id, suspendu) {
  await requete('UPDATE partners SET is_active = ?, suspended_at = ? WHERE id = ?', [
    suspendu ? 0 : 1,
    suspendu ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null,
    id,
  ]);
}

// ---------------------------------------------------------------------------
// Clés d'API
// ---------------------------------------------------------------------------

export async function listerCles(partenaireId) {
  return requete(
    `SELECT id, label, key_prefix, rate_limit, created_at, last_used_at, revoked_at
       FROM api_keys WHERE partner_id = ? ORDER BY revoked_at IS NOT NULL, created_at DESC`,
    [partenaireId],
  );
}

export async function creerCleApi(partenaireId, label) {
  const { n } = await premiere('SELECT COUNT(*) AS n FROM api_keys WHERE partner_id = ? AND revoked_at IS NULL', [
    partenaireId,
  ]);
  if (n >= CLES_MAX) {
    return { erreur: `Vous avez déjà ${CLES_MAX} clés actives. Révoquez-en une avant d’en créer une nouvelle.` };
  }
  const { claire, hash, prefixe } = genererCle();
  await requete('INSERT INTO api_keys (partner_id, label, key_hash, key_prefix) VALUES (?, ?, ?, ?)', [
    partenaireId,
    label,
    hash,
    prefixe,
  ]);
  return { cle: claire, prefixe };
}

export async function revoquerCle(partenaireId, cleId) {
  const { affectedRows } = await requete(
    'UPDATE api_keys SET revoked_at = NOW() WHERE id = ? AND partner_id = ? AND revoked_at IS NULL',
    [cleId, partenaireId],
  );
  return affectedRows === 1;
}

// Totaux des 30 derniers jours pour tous les partenaires (liste de l'administration)
export async function usageTousPartenaires() {
  const lignes = await requete(
    `SELECT partner_id, SUM(calls) AS appels, SUM(errors) AS erreurs FROM (
        SELECT k.partner_id, u.calls, u.errors
          FROM api_usage_daily u JOIN api_keys k ON k.id = u.api_key_id
         WHERE u.day > CURDATE() - INTERVAL 30 DAY
        UNION ALL
        SELECT k.partner_id, COUNT(*) AS calls, SUM(r.status >= 400) AS errors
          FROM api_requests r JOIN api_keys k ON k.id = r.api_key_id
         WHERE r.created_at >= CURDATE()
         GROUP BY k.partner_id
     ) t
     GROUP BY partner_id`,
  );
  return new Map(lignes.map((l) => [l.partner_id, { appels: Number(l.appels), erreurs: Number(l.erreurs) }]));
}

// Usage des 30 derniers jours : agrégat pour les jours clos, journal pour aujourd'hui
export async function usagePartenaire(partenaireId) {
  return requete(
    `SELECT jour, endpoint, SUM(calls) AS calls, SUM(errors) AS errors FROM (
        SELECT u.day AS jour, u.endpoint, u.calls, u.errors
          FROM api_usage_daily u JOIN api_keys k ON k.id = u.api_key_id
         WHERE k.partner_id = ? AND u.day > CURDATE() - INTERVAL 30 DAY
        UNION ALL
        SELECT DATE(r.created_at) AS jour, r.endpoint, COUNT(*) AS calls, SUM(r.status >= 400) AS errors
          FROM api_requests r JOIN api_keys k ON k.id = r.api_key_id
         WHERE k.partner_id = ? AND r.created_at >= CURDATE()
         GROUP BY DATE(r.created_at), r.endpoint
     ) t
     GROUP BY jour, endpoint
     ORDER BY jour DESC, endpoint`,
    [partenaireId, partenaireId],
  );
}
