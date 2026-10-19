import crypto from 'node:crypto';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { premiere, requete, transaction } from './db';
import { egaliserLeTemps, hacherMotDePasse, verifierMotDePasse } from './mots-de-passe';

// Comptes nominatifs de l'administration. Même modèle que l'espace partenaire :
// mot de passe Argon2id, jetons à usage unique hachés en base, cookie signé.
// Aucun secret n'est écrit dans le code : tout vient de SESSION_SECRET.

export const COOKIE_ADMIN = 'chalviraj_admin';
export const ROLES = { proprietaire: 'Propriétaire', editeur: 'Éditeur' };

const DUREE_SESSION_JOURS = 7;
export const DUREE_SESSION = DUREE_SESSION_JOURS * 86400; // secondes, pour le cookie
const MAX_ECHECS = 5;
const BLOCAGE_MINUTES = 15;
const DUREE_INVITATION_H = 48;
const DUREE_REINITIALISATION_H = 1;

function secret() {
  const valeur = process.env.SESSION_SECRET;
  if (!valeur || valeur.length < 32) throw new Error('SESSION_SECRET doit être défini (32 caractères minimum).');
  return valeur;
}

const hacherJeton = (jeton) => crypto.createHash('sha256').update(String(jeton)).digest('hex');

// MySQL rend les DATETIME en chaînes (dateStrings), stockées en UTC
const passee = (valeur) => Boolean(valeur) && new Date(`${String(valeur).replace(' ', 'T')}Z`) > new Date();

// ---------------------------------------------------------------------------
// Mot de passe
// ---------------------------------------------------------------------------

export async function definirMotDePasse(utilisateurId, motDePasse) {
  const hash = await hacherMotDePasse(motDePasse);
  await transaction(async (tx) => {
    await tx.requete(
      `UPDATE admin_users SET password_hash = ?, password_set_at = NOW(), failed_attempts = 0, locked_until = NULL
        WHERE id = ?`,
      [hash, utilisateurId],
    );
    // Changer de mot de passe consomme les jetons en attente et invalide toutes
    // les sessions : leur signature dépend du hash du mot de passe.
    await tx.requete('UPDATE admin_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL', [utilisateurId]);
  });
}

// ---------------------------------------------------------------------------
// Jetons d'invitation et de réinitialisation (usage unique)
// ---------------------------------------------------------------------------

export async function creerJetonAdmin(utilisateurId, purpose) {
  const heures = purpose === 'invitation' ? DUREE_INVITATION_H : DUREE_REINITIALISATION_H;
  const jeton = crypto.randomBytes(32).toString('base64url');
  await transaction(async (tx) => {
    // Un seul jeton valide à la fois pour un même usage
    await tx.requete('UPDATE admin_tokens SET used_at = NOW() WHERE user_id = ? AND purpose = ? AND used_at IS NULL', [
      utilisateurId,
      purpose,
    ]);
    await tx.requete(
      'INSERT INTO admin_tokens (user_id, purpose, token_hash, expires_at) VALUES (?, ?, ?, NOW() + INTERVAL ? HOUR)',
      [utilisateurId, purpose, hacherJeton(jeton), heures],
    );
  });
  return { jeton, heures };
}

export async function utilisateurDuJeton(jeton, purpose) {
  if (!jeton) return null;
  return premiere(
    `SELECT u.* FROM admin_tokens j JOIN admin_users u ON u.id = j.user_id
      WHERE j.token_hash = ? AND j.purpose = ? AND j.used_at IS NULL AND j.expires_at > NOW()
        AND u.is_active = 1 AND u.suspended_at IS NULL`,
    [hacherJeton(jeton), purpose],
  );
}

export async function consommerJetonAdmin(jeton, purpose) {
  const { affectedRows } = await requete(
    'UPDATE admin_tokens SET used_at = NOW() WHERE token_hash = ? AND purpose = ? AND used_at IS NULL AND expires_at > NOW()',
    [hacherJeton(jeton), purpose],
  );
  return affectedRows === 1;
}

// ---------------------------------------------------------------------------
// Connexion
// ---------------------------------------------------------------------------

export async function utilisateurParEmail(email) {
  return premiere('SELECT * FROM admin_users WHERE email = ?', [String(email).trim().toLowerCase()]);
}

export async function verifierIdentifiants(email, motDePasse) {
  const utilisateur = await utilisateurParEmail(email);
  // Réponse volontairement identique que le compte existe ou non
  if (!utilisateur || !utilisateur.password_hash) {
    await egaliserLeTemps();
    return { erreur: 'identifiants' };
  }
  if (passee(utilisateur.locked_until)) return { erreur: 'bloque' };

  if (!(await verifierMotDePasse(utilisateur.password_hash, motDePasse))) {
    await requete(
      // Dans une même instruction, MySQL lit la valeur déjà incrémentée :
      // la comparaison porte donc bien sur le nouveau compteur.
      `UPDATE admin_users
          SET failed_attempts = failed_attempts + 1,
              locked_until = IF(failed_attempts >= ?, NOW() + INTERVAL ? MINUTE, locked_until)
        WHERE id = ?`,
      [MAX_ECHECS, BLOCAGE_MINUTES, utilisateur.id],
    );
    return { erreur: 'identifiants' };
  }
  if (!utilisateur.is_active || utilisateur.suspended_at) return { erreur: 'suspendu' };

  await requete('UPDATE admin_users SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?', [
    utilisateur.id,
  ]);
  return { utilisateur };
}

// ---------------------------------------------------------------------------
// Session : cookie « id.expiration.aléa.signature ».
// La signature dépend du hash du mot de passe, donc un changement de mot de
// passe (ou une réinitialisation) ferme toutes les sessions ouvertes.
// ---------------------------------------------------------------------------

function signature(utilisateur, expiration, alea) {
  return crypto
    .createHmac('sha256', secret())
    .update(`admin.${utilisateur.id}.${expiration}.${alea}.${utilisateur.password_hash ?? ''}`)
    .digest('base64url');
}

export async function ouvrirSession(utilisateur) {
  const expiration = Date.now() + DUREE_SESSION * 1000;
  const alea = crypto.randomBytes(12).toString('base64url'); // régénéré à chaque connexion
  (await cookies()).set(COOKIE_ADMIN, `${utilisateur.id}.${expiration}.${alea}.${signature(utilisateur, expiration, alea)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DUREE_SESSION,
  });
}

// Définir son mot de passe vaut connexion : la session est ouverte dans la foulée.
export async function marquerConnexion(utilisateurId) {
  await requete('UPDATE admin_users SET last_login_at = NOW() WHERE id = ?', [utilisateurId]);
}

export async function fermerSession() {
  (await cookies()).delete(COOKIE_ADMIN);
}

// Mémoïsé par requête : appelé par le layout, chaque page et chaque action
// serveur, sans multiplier les requêtes SQL.
export const utilisateurConnecte = cache(async () => {
  const valeur = (await cookies()).get(COOKIE_ADMIN)?.value;
  if (!valeur) return null;
  const [id, expiration, alea, signe] = valeur.split('.');
  if (!id || !expiration || !alea || !signe || Number(expiration) < Date.now()) return null;

  const utilisateur = await premiere('SELECT * FROM admin_users WHERE id = ?', [Number(id)]);
  if (!utilisateur || !utilisateur.is_active || utilisateur.suspended_at) return null;

  const a = Buffer.from(signe);
  const b = Buffer.from(signature(utilisateur, expiration, alea));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return utilisateur;
});

// ---------------------------------------------------------------------------
// Gestion des comptes
// ---------------------------------------------------------------------------

export async function listerUtilisateurs() {
  return requete(
    `SELECT u.*, c.name AS cree_par,
            (SELECT MAX(j.created_at) FROM admin_audit j WHERE j.user_id = u.id) AS derniere_action,
            (SELECT COUNT(*) FROM admin_tokens t
              WHERE t.user_id = u.id AND t.purpose = 'invitation' AND t.used_at IS NULL AND t.expires_at > NOW()) AS invitation_en_cours
       FROM admin_users u LEFT JOIN admin_users c ON c.id = u.created_by
      ORDER BY u.created_at`,
  );
}

export async function obtenirUtilisateur(id) {
  return premiere('SELECT * FROM admin_users WHERE id = ?', [id]);
}

export async function creerUtilisateur({ name, email, role = 'editeur', createur = null }) {
  const adresse = String(email).trim().toLowerCase();
  if (await utilisateurParEmail(adresse)) return { erreur: 'Un compte existe déjà avec cette adresse.' };
  const { insertId } = await requete('INSERT INTO admin_users (name, email, role, created_by) VALUES (?, ?, ?, ?)', [
    String(name).trim(),
    adresse,
    ROLES[role] ? role : 'editeur',
    createur,
  ]);
  return { id: insertId };
}

// Le dernier propriétaire actif ne peut être ni rétrogradé, ni suspendu, ni supprimé :
// sans lui, plus personne ne peut gérer les comptes.
export async function estDernierProprietaire(id) {
  const { n } = await premiere(
    `SELECT COUNT(*) AS n FROM admin_users
      WHERE role = 'proprietaire' AND is_active = 1 AND suspended_at IS NULL AND id <> ?`,
    [id],
  );
  return n === 0;
}

export async function changerRole(id, role) {
  if (!ROLES[role]) return { erreur: 'Rôle inconnu.' };
  if (role !== 'proprietaire' && (await estDernierProprietaire(id))) {
    return { erreur: 'Ce compte est le dernier propriétaire : désignez-en un autre d’abord.' };
  }
  await requete('UPDATE admin_users SET role = ? WHERE id = ?', [role, id]);
  return { ok: true };
}

export async function changerSuspension(id, suspendu) {
  if (suspendu && (await estDernierProprietaire(id))) {
    return { erreur: 'Ce compte est le dernier propriétaire : désignez-en un autre d’abord.' };
  }
  await requete('UPDATE admin_users SET is_active = ?, suspended_at = IF(?, NOW(), NULL) WHERE id = ?', [
    suspendu ? 0 : 1,
    suspendu ? 1 : 0,
    id,
  ]);
  return { ok: true };
}

export async function supprimerUtilisateur(id) {
  if (await estDernierProprietaire(id)) {
    return { erreur: 'Ce compte est le dernier propriétaire : désignez-en un autre d’abord.' };
  }
  // Le journal conserve les actions : admin_audit.user_id passe à NULL,
  // user_label garde le nom de la personne.
  await requete('DELETE FROM admin_users WHERE id = ?', [id]);
  return { ok: true };
}

export async function compterProprietaires() {
  const { n } = await premiere(
    "SELECT COUNT(*) AS n FROM admin_users WHERE role = 'proprietaire' AND is_active = 1 AND suspended_at IS NULL",
  );
  return n;
}

export async function compterUtilisateurs() {
  const { n } = await premiere('SELECT COUNT(*) AS n FROM admin_users');
  return n;
}
