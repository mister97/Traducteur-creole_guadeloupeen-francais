import { headers } from 'next/headers';
import { utilisateurConnecte } from './comptes-admin';
import { premiere, requete } from './db';
import { CONSERVATION } from './mentions';
import { hacherIp } from './suggestions';

// Journal des actions de l'administration : qui a fait quoi, quand.
// Une ligne est écrite pour chaque action qui modifie quelque chose, et pour
// les connexions. Les lectures ne sont pas journalisées, sauf les exports
// (sortir le dictionnaire entier mérite une trace).

// Libellés affichés. La clé est ce qui est stocké en base : ne la renommez pas,
// les lignes déjà écrites garderaient l'ancienne valeur.
export const LIBELLES = {
  'connexion.reussie': 'Connexion',
  'connexion.echouee': 'Échec de connexion',
  'connexion.bloquee': 'Connexion bloquée (trop d’échecs)',
  deconnexion: 'Déconnexion',
  'motdepasse.change': 'Mot de passe changé',
  'motdepasse.demande': 'Réinitialisation demandée',

  'mot.cree': 'Mot créé',
  'mot.modifie': 'Mot modifié',
  'mot.supprime': 'Mot supprimé',

  'suggestion.validee': 'Suggestion validée',
  'suggestion.rejetee': 'Suggestion rejetée',
  'suggestion.rouverte': 'Suggestion remise en attente',
  'suggestion.supprimee': 'Suggestion supprimée',

  'terme.renomme': 'Terme français renommé',
  'terme.fusionne': 'Terme français fusionné',
  'terme.supprime': 'Terme français supprimé',

  'quotidien.planifie': 'Mot du jour programmé',
  'quotidien.retire': 'Tirage annulé',

  'partenaire.cree': 'Partenaire créé',
  'partenaire.approuve': 'Demande d’accès approuvée',
  'partenaire.rejete': 'Demande d’accès rejetée',
  'partenaire.suspendu': 'Partenaire suspendu',
  'partenaire.reactive': 'Partenaire réactivé',
  'partenaire.export': 'Export complet modifié',
  'partenaire.invitation': 'Lien d’accès renvoyé',
  'partenaire.cle_revoquee': 'Clé d’API révoquée',

  'utilisateur.cree': 'Compte créé',
  'utilisateur.role': 'Rôle modifié',
  'utilisateur.suspendu': 'Compte suspendu',
  'utilisateur.reactive': 'Compte réactivé',
  'utilisateur.supprime': 'Compte supprimé',
  'utilisateur.invitation': 'Lien d’accès renvoyé',

  'export.json': 'Export JSON téléchargé',
  'export.xlsx': 'Export Excel téléchargé',
};

export const libelleAction = (action) => LIBELLES[action] ?? action;

// Regroupement pour le filtre de la page journal
export const FAMILLES = {
  acces: { libelle: 'Connexions et mots de passe', prefixes: ['connexion.', 'deconnexion', 'motdepasse.'] },
  dictionnaire: { libelle: 'Dictionnaire', prefixes: ['mot.', 'terme.', 'quotidien.'] },
  suggestions: { libelle: 'Suggestions', prefixes: ['suggestion.'] },
  partenaires: { libelle: 'Partenaires', prefixes: ['partenaire.'] },
  comptes: { libelle: 'Comptes', prefixes: ['utilisateur.'] },
  exports: { libelle: 'Exports', prefixes: ['export.'] },
};

async function empreinteIp() {
  try {
    const h = await headers();
    return hacherIp((h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || 'inconnue').trim());
  } catch {
    return null;
  }
}

// `acteur` n'est fourni que pour les connexions, où la session n'existe pas encore
// (ou pas du tout, en cas d'échec).
export async function journaliser(action, { cible, cibleId, cibleLabel, details, acteur } = {}) {
  try {
    const utilisateur = acteur === undefined ? await utilisateurConnecte() : acteur;
    await requete(
      `INSERT INTO admin_audit (user_id, user_label, action, cible_type, cible_id, cible_label, details, ip_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        utilisateur?.id ?? null,
        utilisateur ? `${utilisateur.name} <${utilisateur.email}>` : 'inconnu',
        action,
        cible ?? null,
        cibleId ?? null,
        cibleLabel ? String(cibleLabel).slice(0, 190) : null,
        details ? String(details).slice(0, 2000) : null,
        await empreinteIp(),
      ],
    );
  } catch (erreur) {
    // Le journal ne doit jamais faire échouer l'action elle-même
    console.error('[journal] écriture impossible :', erreur.message);
  }
}

// Variante pour une tentative de connexion : l'adresse saisie est conservée
// telle quelle, sans révéler si le compte existe.
export async function journaliserConnexion(action, { utilisateur = null, email, details } = {}) {
  try {
    await requete(
      `INSERT INTO admin_audit (user_id, user_label, action, details, ip_hash) VALUES (?, ?, ?, ?, ?)`,
      [
        utilisateur?.id ?? null,
        utilisateur ? `${utilisateur.name} <${utilisateur.email}>` : `<${String(email ?? '').slice(0, 180)}>`,
        action,
        details ?? null,
        await empreinteIp(),
      ],
    );
  } catch (erreur) {
    console.error('[journal] écriture impossible :', erreur.message);
  }
}

// ---------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------

export async function listerJournal({ utilisateur, famille, depuis, limite = 60, decalage = 0 } = {}) {
  const conditions = [];
  const valeurs = [];

  if (utilisateur) {
    conditions.push('j.user_id = ?');
    valeurs.push(Number(utilisateur));
  }
  if (famille && FAMILLES[famille]) {
    const prefixes = FAMILLES[famille].prefixes;
    conditions.push(`(${prefixes.map(() => 'j.action LIKE ?').join(' OR ')})`);
    valeurs.push(...prefixes.map((p) => `${p}%`));
  }
  if (depuis && /^\d{4}-\d{2}-\d{2}$/.test(depuis)) {
    conditions.push('j.created_at >= ?');
    valeurs.push(`${depuis} 00:00:00`);
  }
  const ou = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [lignes, [{ total }]] = await Promise.all([
    requete(
      `SELECT j.*, u.name AS utilisateur_nom FROM admin_audit j
         LEFT JOIN admin_users u ON u.id = j.user_id
         ${ou}
        ORDER BY j.created_at DESC, j.id DESC
        LIMIT ? OFFSET ?`,
      [...valeurs, limite, decalage],
    ),
    requete(`SELECT COUNT(*) AS total FROM admin_audit j ${ou}`, valeurs),
  ]);
  return { total, lignes };
}

export async function dernieresActions(limite = 8) {
  return requete(
    `SELECT j.*, u.name AS utilisateur_nom FROM admin_audit j
       LEFT JOIN admin_users u ON u.id = j.user_id
      ORDER BY j.created_at DESC, j.id DESC LIMIT ?`,
    [limite],
  );
}

export async function compterJournal() {
  const { n } = await premiere('SELECT COUNT(*) AS n FROM admin_audit');
  return n;
}

// Purge au-delà de la durée annoncée sur /confidentialite
export async function purgerJournal() {
  await requete('DELETE FROM admin_audit WHERE created_at < NOW() - INTERVAL ? MONTH', [CONSERVATION.journalAdminMois]);
}
