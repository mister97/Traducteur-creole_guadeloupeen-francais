import { ALPHABET, conditionLettre, lettreDe } from './alphabet';
import { premiere, requete } from './db';
import { rechercheFrancais, rechercheKreyol, slugFrancais } from './normalisation.mjs';

const vide = { total: 0, resultats: [] };

function grouper(lignes, cle) {
  const groupes = new Map();
  for (const l of lignes) {
    if (!groupes.has(l[cle])) groupes.set(l[cle], []);
    groupes.get(l[cle]).push(l);
  }
  return groupes;
}

// Sens (+ synonymes) d'une liste d'entrées, pour les cartes de résultats
async function sensDesEntrees(ids) {
  if (!ids.length) return new Map();
  const sens = await requete(
    'SELECT id, entree_id, num, traduction FROM sens WHERE entree_id IN (?) ORDER BY entree_id, num',
    [ids],
  );
  const synonymes = sens.length
    ? await requete(
        `SELECT sy.sens_id, sy.mot, e.slug
           FROM synonymes sy LEFT JOIN entrees e ON e.id = sy.ref
          WHERE sy.sens_id IN (?) ORDER BY sy.sens_id, sy.position`,
        [sens.map((s) => s.id)],
      )
    : [];
  const synParSens = grouper(synonymes, 'sens_id');
  const parEntree = new Map();
  for (const s of sens) {
    if (!parEntree.has(s.entree_id)) parEntree.set(s.entree_id, []);
    parEntree.get(s.entree_id).push({
      num: s.num,
      traduction: s.traduction,
      synonymes: (synParSens.get(s.id) ?? []).map((sy) => ({ mot: sy.mot, slug: sy.slug })),
    });
  }
  return parEntree;
}

async function variantesDesEntrees(ids) {
  if (!ids.length) return new Map();
  const lignes = await requete(
    'SELECT entree_id, forme FROM formes WHERE entree_id IN (?) AND principale = 0 ORDER BY id',
    [ids],
  );
  const parEntree = new Map();
  for (const l of lignes) {
    if (!parEntree.has(l.entree_id)) parEntree.set(l.entree_id, []);
    parEntree.get(l.entree_id).push(l.forme);
  }
  return parEntree;
}

// ---------------------------------------------------------------------------
// Créole → français
// ---------------------------------------------------------------------------

export async function rechercherKreyol(texte, { limite = 20, decalage = 0 } = {}) {
  const q = rechercheKreyol(texte);
  if (!q) return vide;
  const contient = `%${q}%`;
  const [{ total }] = await requete(
    'SELECT COUNT(DISTINCT entree_id) AS total FROM formes WHERE recherche LIKE ?',
    [contient],
  );
  if (!total) return vide;
  const lignes = await requete(
    `SELECT e.id, e.mot, e.slug,
            MIN(CASE WHEN f.recherche = ? THEN 2 - f.principale
                     WHEN f.recherche LIKE ? THEN 4 - f.principale
                     ELSE 6 - f.principale END) AS rang
       FROM formes f JOIN entrees e ON e.id = f.entree_id
      WHERE f.recherche LIKE ?
      GROUP BY e.id, e.mot, e.slug
      ORDER BY rang, CHAR_LENGTH(e.mot), e.mot, e.id
      LIMIT ? OFFSET ?`,
    [q, `${q}%`, contient, limite, decalage],
  );
  const ids = lignes.map((l) => l.id);
  const [sens, variantes] = await Promise.all([sensDesEntrees(ids), variantesDesEntrees(ids)]);
  return {
    total,
    resultats: lignes.map((l) => ({
      id: l.id,
      mot: l.mot,
      slug: l.slug,
      variantes: variantes.get(l.id) ?? [],
      sens: sens.get(l.id) ?? [],
    })),
  };
}

// ---------------------------------------------------------------------------
// Français → créole
// ---------------------------------------------------------------------------

async function motsDesTermes(ids) {
  if (!ids.length) return new Map();
  const lignes = await requete(
    `SELECT r.fr_id, e.id, e.mot, e.slug, s.num, s.traduction
       FROM fr_renvois r
       JOIN sens s ON s.id = r.sens_id
       JOIN entrees e ON e.id = s.entree_id
      WHERE r.fr_id IN (?)
      ORDER BY e.mot, e.id, s.num`,
    [ids],
  );
  return grouper(lignes, 'fr_id');
}

export async function rechercherFrancais(texte, { limite = 20, decalage = 0 } = {}) {
  const q = rechercheFrancais(texte);
  if (!q) return { ...vide, dansTraductions: [] };
  const contient = `%${q}%`;
  const [{ total }] = await requete('SELECT COUNT(*) AS total FROM fr_termes WHERE recherche LIKE ?', [contient]);
  const termes = total
    ? await requete(
        `SELECT id, terme, recherche,
                CASE WHEN recherche = ? THEN 0
                     WHEN recherche LIKE ? THEN 1
                     WHEN recherche LIKE ? THEN 2
                     ELSE 3 END AS rang
           FROM fr_termes
          WHERE recherche LIKE ?
          ORDER BY rang, CHAR_LENGTH(recherche), recherche
          LIMIT ? OFFSET ?`,
        [q, `${q}%`, `% ${q}%`, contient, limite, decalage],
      )
    : [];
  const mots = await motsDesTermes(termes.map((t) => t.id));

  // Sur la première page : sens dont la traduction contient le mot entier
  // mais qui ne sont pas indexés sous un terme correspondant (définitions longues).
  const dansTraductions =
    decalage === 0
      ? await requete(
          `SELECT e.mot, e.slug, s.num, s.traduction
             FROM sens s JOIN entrees e ON e.id = s.entree_id
            WHERE CONCAT(' ', s.recherche, ' ') LIKE ?
              AND s.id NOT IN (
                SELECT r.sens_id FROM fr_renvois r JOIN fr_termes t ON t.id = r.fr_id WHERE t.recherche LIKE ?
              )
            ORDER BY CHAR_LENGTH(s.traduction), e.mot
            LIMIT 12`,
          [`% ${q} %`, contient],
        )
      : [];

  return {
    total,
    resultats: termes.map((t) => ({
      id: t.id,
      terme: t.terme,
      slug: slugFrancais(t.recherche),
      mots: regrouperMots(mots.get(t.id) ?? []),
    })),
    dansTraductions,
  };
}

// [{id, mot, slug, num, traduction}] → [{id, mot, slug, sens: [{num, traduction}]}]
function regrouperMots(lignes) {
  const parEntree = new Map();
  for (const l of lignes) {
    if (!parEntree.has(l.id)) parEntree.set(l.id, { id: l.id, mot: l.mot, slug: l.slug, sens: [] });
    parEntree.get(l.id).sens.push({ num: l.num, traduction: l.traduction });
  }
  return [...parEntree.values()];
}

export async function compterAutreSens(texte, direction) {
  if (direction === 'kr') {
    const q = rechercheFrancais(texte);
    if (!q) return 0;
    return (await premiere('SELECT COUNT(*) AS n FROM fr_termes WHERE recherche LIKE ?', [`%${q}%`])).n;
  }
  const q = rechercheKreyol(texte);
  if (!q) return 0;
  return (await premiere('SELECT COUNT(DISTINCT entree_id) AS n FROM formes WHERE recherche LIKE ?', [`%${q}%`])).n;
}

// ---------------------------------------------------------------------------
// Autocomplétion
// ---------------------------------------------------------------------------

export async function autocompletion(texte, direction) {
  if (direction === 'fr') {
    const q = rechercheFrancais(texte);
    if (!q) return [];
    const termes = await requete(
      `SELECT t.terme, t.recherche,
              (SELECT GROUP_CONCAT(DISTINCT e.mot ORDER BY e.mot SEPARATOR ', ')
                 FROM fr_renvois r JOIN sens s ON s.id = r.sens_id JOIN entrees e ON e.id = s.entree_id
                WHERE r.fr_id = t.id) AS mots
         FROM fr_termes t
        WHERE t.recherche LIKE ?
        ORDER BY CASE WHEN t.recherche = ? THEN 0 WHEN t.recherche LIKE ? THEN 1 WHEN t.recherche LIKE ? THEN 2 ELSE 3 END,
                 CHAR_LENGTH(t.recherche), t.recherche
        LIMIT 8`,
      [`%${q}%`, q, `${q}%`, `% ${q}%`],
    );
    return termes.map((t) => ({
      libelle: t.terme,
      detail: (t.mots ?? '').split(', ').slice(0, 4).join(', '),
      href: `/fr/${slugFrancais(t.recherche)}`,
    }));
  }
  const { resultats } = await rechercherKreyol(texte, { limite: 8 });
  return resultats.map((r) => ({
    libelle: r.mot,
    detail: r.sens.map((s) => s.traduction).join(' ; '),
    href: `/mo/${r.slug}`,
  }));
}

// ---------------------------------------------------------------------------
// Fiche d'un mot
// ---------------------------------------------------------------------------

export async function ficheParSlug(slug) {
  const entree = await premiere('SELECT id, mot, slug FROM entrees WHERE slug = ?', [slug]);
  if (!entree) return null;
  return ficheComplete(entree);
}

export async function ficheParId(id) {
  const entree = await premiere('SELECT id, mot, slug FROM entrees WHERE id = ?', [id]);
  return entree ? ficheComplete(entree) : null;
}

async function ficheComplete(entree) {
  const [formes, sens, locutions, voirAussi, precedent, suivant] = await Promise.all([
    requete('SELECT forme FROM formes WHERE entree_id = ? AND principale = 0 ORDER BY id', [entree.id]),
    requete('SELECT id, num, traduction FROM sens WHERE entree_id = ? ORDER BY num', [entree.id]),
    requete(
      'SELECT expression, traduction, exemple_kr, exemple_fr FROM locutions WHERE entree_id = ? ORDER BY position, id',
      [entree.id],
    ),
    // Mots qui citent celui-ci comme synonyme
    requete(
      `SELECT DISTINCT e.mot, e.slug
         FROM synonymes sy JOIN sens s ON s.id = sy.sens_id JOIN entrees e ON e.id = s.entree_id
        WHERE sy.ref = ? AND e.id <> ?
        ORDER BY e.mot LIMIT 30`,
      [entree.id, entree.id],
    ),
    premiere(
      'SELECT mot, slug FROM entrees WHERE mot < ? OR (mot = ? AND id < ?) ORDER BY mot DESC, id DESC LIMIT 1',
      [entree.mot, entree.mot, entree.id],
    ),
    premiere(
      'SELECT mot, slug FROM entrees WHERE mot > ? OR (mot = ? AND id > ?) ORDER BY mot, id LIMIT 1',
      [entree.mot, entree.mot, entree.id],
    ),
  ]);

  const idsSens = sens.map((s) => s.id);
  const [synonymes, termes] = idsSens.length
    ? await Promise.all([
        requete(
          `SELECT sy.sens_id, sy.mot, e.slug
             FROM synonymes sy LEFT JOIN entrees e ON e.id = sy.ref
            WHERE sy.sens_id IN (?) ORDER BY sy.sens_id, sy.position`,
          [idsSens],
        ),
        requete(
          `SELECT r.sens_id, t.terme, t.recherche
             FROM fr_renvois r JOIN fr_termes t ON t.id = r.fr_id
            WHERE r.sens_id IN (?) ORDER BY t.terme`,
          [idsSens],
        ),
      ])
    : [[], []];
  const synParSens = grouper(synonymes, 'sens_id');
  const termesParSens = grouper(termes, 'sens_id');

  return {
    id: entree.id,
    mot: entree.mot,
    slug: entree.slug,
    variantes: formes.map((f) => f.forme),
    sens: sens.map((s) => ({
      num: s.num,
      traduction: s.traduction,
      synonymes: (synParSens.get(s.id) ?? []).map((sy) => ({ mot: sy.mot, slug: sy.slug })),
      termes: (termesParSens.get(s.id) ?? []).map((t) => ({ terme: t.terme, slug: slugFrancais(t.recherche) })),
    })),
    locutions,
    voirAussi,
    precedent,
    suivant,
  };
}

// ---------------------------------------------------------------------------
// Terme français
// ---------------------------------------------------------------------------

export async function termeFrancais(recherche) {
  const terme = await premiere('SELECT id, terme, recherche FROM fr_termes WHERE recherche = ?', [recherche]);
  if (!terme) return null;
  const mots = regrouperMots((await motsDesTermes([terme.id])).get(terme.id) ?? []);
  // On complète chaque sens concerné avec ses synonymes
  const sensComplets = await sensDesEntrees(mots.map((m) => m.id));
  for (const m of mots) {
    const tous = sensComplets.get(m.id) ?? [];
    m.sens = m.sens.map((s) => tous.find((t) => t.num === s.num) ?? { ...s, synonymes: [] });
  }
  return { terme: terme.terme, slug: slugFrancais(terme.recherche), mots };
}

// ---------------------------------------------------------------------------
// Parcours par lettre
// ---------------------------------------------------------------------------

// → [{ lettre: 'A', n: 512 }, { lettre: 'CH', n: 211 }…] (lettres de ALPHABET ayant des mots)
export async function lettresDisponibles() {
  const lignes = await requete(
    `SELECT LEFT(recherche, 2) AS debut, COUNT(*) AS n
       FROM formes WHERE principale = 1 AND recherche <> ''
      GROUP BY LEFT(recherche, 2)`,
  );
  const compte = new Map();
  for (const { debut, n } of lignes) {
    const lettre = lettreDe(debut).toUpperCase();
    compte.set(lettre, (compte.get(lettre) ?? 0) + n);
  }
  return ALPHABET.filter((l) => compte.get(l) > 0).map((lettre) => ({ lettre, n: compte.get(lettre) }));
}

export async function motsParLettre(lettre, { limite = 60, decalage = 0 } = {}) {
  const condition = conditionLettre(lettre, 'f.recherche');
  const [{ total }] = await requete(
    `SELECT COUNT(*) AS total FROM formes f WHERE f.principale = 1 AND ${condition.sql}`,
    condition.params,
  );
  const lignes = await requete(
    `SELECT e.id, e.mot, e.slug
       FROM formes f JOIN entrees e ON e.id = f.entree_id
      WHERE f.principale = 1 AND ${condition.sql}
      ORDER BY e.mot, e.id
      LIMIT ? OFFSET ?`,
    [...condition.params, limite, decalage],
  );
  const ids = lignes.map((x) => x.id);
  const [sens, variantes] = await Promise.all([sensDesEntrees(ids), variantesDesEntrees(ids)]);
  return {
    total,
    resultats: lignes.map((x) => ({ ...x, sens: sens.get(x.id) ?? [], variantes: variantes.get(x.id) ?? [] })),
  };
}

// ---------------------------------------------------------------------------
// Divers
// ---------------------------------------------------------------------------

export async function statistiques() {
  const [ligne] = await requete(
    `SELECT (SELECT COUNT(*) FROM entrees) AS mots,
            (SELECT COUNT(*) FROM sens) AS sens,
            (SELECT COUNT(*) FROM fr_termes) AS termes`,
  );
  return ligne;
}

export async function tousLesSlugs() {
  const [mots, termes] = await Promise.all([
    requete('SELECT slug, modifie_le FROM entrees ORDER BY id'),
    requete('SELECT recherche FROM fr_termes ORDER BY id'),
  ]);
  return { mots, termes: termes.map((t) => slugFrancais(t.recherche)) };
}
