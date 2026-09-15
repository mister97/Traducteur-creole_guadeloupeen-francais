import { premiere, requete, transaction } from './db';
import { decalerJour, jourGuadeloupe } from './dates';
import { rechercheFrancais, rechercheKreyol } from './normalisation.mjs';

// ---------------------------------------------------------------------------
// Qualité des données
// ---------------------------------------------------------------------------

// Chaque filtre = condition SQL sur l'alias « e » (entrees)
export const FILTRES_MOTS = {
  tous: { libelle: 'Tous les mots', condition: '1 = 1' },
  'sans-terme': {
    libelle: 'Sens sans terme français',
    condition: 'EXISTS (SELECT 1 FROM sens s WHERE s.entree_id = e.id AND NOT EXISTS (SELECT 1 FROM fr_renvois r WHERE r.sens_id = s.id))',
  },
  'sans-traduction': {
    libelle: 'Sans traduction',
    condition:
      "(NOT EXISTS (SELECT 1 FROM sens s WHERE s.entree_id = e.id) OR EXISTS (SELECT 1 FROM sens s WHERE s.entree_id = e.id AND s.traduction = ''))",
  },
  'synonymes-orphelins': {
    libelle: 'Synonymes non reliés',
    condition: 'EXISTS (SELECT 1 FROM sens s JOIN synonymes sy ON sy.sens_id = s.id WHERE s.entree_id = e.id AND sy.ref IS NULL)',
  },
  doublons: {
    libelle: 'Doublons',
    // Comparaison binaire : « ABO » et « ABÒ » sont deux mots différents
    condition: `e.mot COLLATE utf8mb4_bin IN (
      SELECT d.mot FROM (SELECT mot COLLATE utf8mb4_bin AS mot FROM entrees GROUP BY mot COLLATE utf8mb4_bin HAVING COUNT(*) > 1) d
    )`,
  },
  exclus: { libelle: 'Exclus du mot du jour / du jeu', condition: '(e.exclu_quotidien = 1 OR e.exclu_jeu = 1)' },
  recents: { libelle: 'Modifiés récemment', condition: 'e.modifie_le > NOW() - INTERVAL 30 DAY' },
};

export async function tableauDeBord() {
  const [[chiffres], qualite] = await Promise.all([
    requete(
      `SELECT (SELECT COUNT(*) FROM entrees) AS mots,
              (SELECT COUNT(*) FROM sens) AS sens,
              (SELECT COUNT(*) FROM fr_termes) AS termes,
              (SELECT COUNT(*) FROM locutions) AS locutions`,
    ),
    Promise.all(
      ['sans-terme', 'sans-traduction', 'synonymes-orphelins', 'doublons'].map(async (cle) => ({
        cle,
        libelle: FILTRES_MOTS[cle].libelle,
        n: (await premiere(`SELECT COUNT(*) AS n FROM entrees e WHERE ${FILTRES_MOTS[cle].condition}`)).n,
      })),
    ),
  ]);
  return { chiffres, qualite };
}

export async function listerMots({ q = '', filtre = 'tous', limite = 50, decalage = 0 } = {}) {
  const condition = (FILTRES_MOTS[filtre] ?? FILTRES_MOTS.tous).condition;
  const recherche = rechercheKreyol(q);
  const clauseRecherche = recherche ? 'AND EXISTS (SELECT 1 FROM formes f WHERE f.entree_id = e.id AND f.recherche LIKE ?)' : '';
  const params = recherche ? [`%${recherche}%`] : [];
  const tri = filtre === 'recents' ? 'e.modifie_le DESC' : 'e.mot, e.id';

  const [[{ total }], mots] = await Promise.all([
    requete(`SELECT COUNT(*) AS total FROM entrees e WHERE ${condition} ${clauseRecherche}`, params),
    requete(
      `SELECT e.id, e.mot, e.slug, e.exclu_quotidien, e.exclu_jeu, e.modifie_le,
              (SELECT COUNT(*) FROM sens s WHERE s.entree_id = e.id) AS nb_sens,
              (SELECT s.traduction FROM sens s WHERE s.entree_id = e.id ORDER BY s.num LIMIT 1) AS premiere_traduction
         FROM entrees e
        WHERE ${condition} ${clauseRecherche}
        ORDER BY ${tri}
        LIMIT ? OFFSET ?`,
      [...params, limite, decalage],
    ),
  ]);
  return { total, mots };
}

// Entrées qui s'écrivent comme ce mot (pour prévenir les doublons à la validation)
export async function motsSimilaires(mot, idExclu = 0) {
  const recherche = rechercheKreyol(mot);
  if (!recherche) return [];
  return requete(
    `SELECT DISTINCT e.id, e.mot, e.slug
       FROM formes f JOIN entrees e ON e.id = f.entree_id
      WHERE f.recherche = ? AND e.id <> ?
      ORDER BY e.mot LIMIT 10`,
    [recherche, idExclu],
  );
}

// ---------------------------------------------------------------------------
// Termes français
// ---------------------------------------------------------------------------

export async function listerTermes({ q = '', limite = 50, decalage = 0 } = {}) {
  const recherche = rechercheFrancais(q);
  const params = recherche ? [`%${recherche}%`] : [];
  const where = recherche ? 'WHERE t.recherche LIKE ?' : '';
  const [[{ total }], termes] = await Promise.all([
    requete(`SELECT COUNT(*) AS total FROM fr_termes t ${where}`, params),
    requete(
      `SELECT t.id, t.terme, t.recherche,
              (SELECT GROUP_CONCAT(DISTINCT e.mot ORDER BY e.mot SEPARATOR ', ')
                 FROM fr_renvois r JOIN sens s ON s.id = r.sens_id JOIN entrees e ON e.id = s.entree_id
                WHERE r.fr_id = t.id) AS mots
         FROM fr_termes t ${where}
        ORDER BY ${recherche ? 'CHAR_LENGTH(t.recherche), ' : ''}t.recherche
        LIMIT ? OFFSET ?`,
      [...params, limite, decalage],
    ),
  ]);
  return { total, termes };
}

// Renomme un terme ; s'il existe déjà un terme identique (hors accents), les deux sont fusionnés
export async function renommerTerme(id, nouveau) {
  const terme = String(nouveau ?? '').replace(/\s+/g, ' ').trim();
  const recherche = rechercheFrancais(terme);
  if (!recherche) throw new Error('Le terme ne peut pas être vide.');
  return transaction(async (tx) => {
    const existant = await tx.premiere('SELECT id FROM fr_termes WHERE recherche = ? AND id <> ?', [recherche, id]);
    if (existant) {
      await tx.requete('INSERT IGNORE INTO fr_renvois (fr_id, sens_id) SELECT ?, sens_id FROM fr_renvois WHERE fr_id = ?', [
        existant.id,
        id,
      ]);
      await tx.requete('DELETE FROM fr_termes WHERE id = ?', [id]);
      return { fusion: true };
    }
    await tx.requete('UPDATE fr_termes SET terme = ?, recherche = ? WHERE id = ?', [terme, recherche, id]);
    return { fusion: false };
  });
}

export async function supprimerTerme(id) {
  await requete('DELETE FROM fr_termes WHERE id = ?', [id]);
}

// ---------------------------------------------------------------------------
// Mot du jour et jeu
// ---------------------------------------------------------------------------

export async function historiqueQuotidien(jours = 30) {
  const aujourdhui = jourGuadeloupe();
  const lignes = await requete(
    `SELECT q.jour, q.type, e.id, e.mot, e.slug
       FROM quotidien q JOIN entrees e ON e.id = q.entree_id
      WHERE q.jour > ?
      ORDER BY q.jour DESC`,
    [decalerJour(aujourdhui, -jours)],
  );
  const parJour = new Map();
  for (const l of lignes) {
    if (!parJour.has(l.jour)) parJour.set(l.jour, { jour: l.jour });
    parJour.get(l.jour)[l.type] = { id: l.id, mot: l.mot, slug: l.slug };
  }
  return { aujourdhui, jours: [...parJour.values()] };
}

export async function trouverEntree(texte) {
  const valeur = String(texte ?? '').trim();
  if (!valeur) return null;
  return (
    (await premiere('SELECT id, mot, slug FROM entrees WHERE slug = ? OR mot = ? ORDER BY slug = ? DESC, id LIMIT 1', [
      valeur,
      valeur,
      valeur,
    ])) ?? (await premiere(
      'SELECT e.id, e.mot, e.slug FROM formes f JOIN entrees e ON e.id = f.entree_id WHERE f.recherche = ? ORDER BY f.principale DESC LIMIT 1',
      [rechercheKreyol(valeur)],
    ))
  );
}

export async function planifier(jour, type, entreeId) {
  await requete(
    'INSERT INTO quotidien (jour, type, entree_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE entree_id = VALUES(entree_id)',
    [jour, type, entreeId],
  );
}

export async function annulerTirage(jour, type) {
  await requete('DELETE FROM quotidien WHERE jour = ? AND type = ?', [jour, type]);
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export async function donneesExport() {
  const [entrees, formes, sens, synonymes, termes, locutions, exemples] = await Promise.all([
    requete('SELECT id, mot, slug, exclu_quotidien, exclu_jeu, cree_le, modifie_le FROM entrees ORDER BY mot, id'),
    requete('SELECT entree_id, forme FROM formes WHERE principale = 0 ORDER BY id'),
    requete('SELECT id, entree_id, num, traduction FROM sens ORDER BY entree_id, num'),
    requete('SELECT sens_id, mot FROM synonymes ORDER BY sens_id, position'),
    requete('SELECT r.sens_id, t.terme FROM fr_renvois r JOIN fr_termes t ON t.id = r.fr_id ORDER BY t.terme'),
    requete('SELECT entree_id, expression, traduction, exemple_kr, exemple_fr FROM locutions ORDER BY entree_id, position'),
    requete('SELECT sens_id, kreyol, francais FROM exemples ORDER BY sens_id, position, id'),
  ]);
  const grouper = (lignes, cle, valeur) => {
    const m = new Map();
    for (const l of lignes) {
      if (!m.has(l[cle])) m.set(l[cle], []);
      m.get(l[cle]).push(valeur(l));
    }
    return m;
  };
  const variantes = grouper(formes, 'entree_id', (l) => l.forme);
  const synParSens = grouper(synonymes, 'sens_id', (l) => l.mot);
  const termesParSens = grouper(termes, 'sens_id', (l) => l.terme);
  const exemplesParSens = grouper(exemples, 'sens_id', (ex) => ({ kr: ex.kreyol, fr: ex.francais }));
  const sensParEntree = grouper(sens, 'entree_id', (s) => ({
    num: s.num,
    traduction: s.traduction,
    exemples: exemplesParSens.get(s.id) ?? [],
    synonymes: synParSens.get(s.id) ?? [],
    termes: termesParSens.get(s.id) ?? [],
  }));
  const locParEntree = grouper(locutions, 'entree_id', ({ entree_id: _e, ...l }) => l);

  return entrees.map((e) => ({
    ...e,
    variantes: variantes.get(e.id) ?? [],
    sens: sensParEntree.get(e.id) ?? [],
    locutions: locParEntree.get(e.id) ?? [],
  }));
}
