import { premiere, requete } from './db';
import { rechercheFrancais, rechercheKreyol, slugFrancais } from './normalisation.mjs';
import { SITE_URL } from './site';

// Mise en forme JSON des entrées pour l'API publique (lib/api.js).
// Les sens sont toujours regroupés par mot : jamais une ligne par sens.

function grouper(lignes, cle) {
  const m = new Map();
  for (const l of lignes) {
    if (!m.has(l[cle])) m.set(l[cle], []);
    m.get(l[cle]).push(l);
  }
  return m;
}

const dateIso = (valeur) => (valeur ? new Date(`${String(valeur).replace(' ', 'T')}Z`).toISOString() : null);

// Détail complet des entrées demandées, dans l'ordre des identifiants fournis
async function detailsEntrees(ids, { locutions = false } = {}) {
  if (!ids.length) return new Map();
  const [entrees, formes, sens] = await Promise.all([
    requete('SELECT id, mot, slug, modifie_le FROM entrees WHERE id IN (?)', [ids]),
    requete('SELECT entree_id, forme FROM formes WHERE entree_id IN (?) AND principale = 0 ORDER BY id', [ids]),
    requete('SELECT id, entree_id, num, traduction FROM sens WHERE entree_id IN (?) ORDER BY entree_id, num', [ids]),
  ]);
  const idsSens = sens.map((s) => s.id);
  const [synonymes, termes, exemples, expressions] = await Promise.all([
    idsSens.length
      ? requete('SELECT sens_id, mot FROM synonymes WHERE sens_id IN (?) ORDER BY sens_id, position', [idsSens])
      : [],
    idsSens.length
      ? requete(
          'SELECT r.sens_id, t.terme, t.recherche FROM fr_renvois r JOIN fr_termes t ON t.id = r.fr_id WHERE r.sens_id IN (?) ORDER BY t.terme',
          [idsSens],
        )
      : [],
    idsSens.length
      ? requete('SELECT sens_id, kreyol, francais FROM exemples WHERE sens_id IN (?) ORDER BY sens_id, position, id', [idsSens])
      : [],
    locutions
      ? requete(
          'SELECT entree_id, expression, traduction, exemple_kr, exemple_fr FROM locutions WHERE entree_id IN (?) ORDER BY entree_id, position, id',
          [ids],
        )
      : [],
  ]);

  const variantesPar = grouper(formes, 'entree_id');
  const sensPar = grouper(sens, 'entree_id');
  const synPar = grouper(synonymes, 'sens_id');
  const termesPar = grouper(termes, 'sens_id');
  const exemplesPar = grouper(exemples, 'sens_id');
  const locutionsPar = grouper(expressions, 'entree_id');

  const parId = new Map();
  for (const e of entrees) {
    parId.set(e.id, {
      id: e.id,
      word: e.mot,
      slug: e.slug,
      url: `${SITE_URL}/mo/${e.slug}`,
      variants: (variantesPar.get(e.id) ?? []).map((f) => f.forme),
      senses: (sensPar.get(e.id) ?? []).map((s) => ({
        number: s.num,
        translation: s.traduction,
        synonyms: (synPar.get(s.id) ?? []).map((x) => x.mot),
        french_terms: (termesPar.get(s.id) ?? []).map((t) => ({ term: t.terme, url: `${SITE_URL}/fr/${slugFrancais(t.recherche)}` })),
        examples: (exemplesPar.get(s.id) ?? []).map((x) => ({ kreyol: x.kreyol, francais: x.francais })),
      })),
      ...(locutions
        ? {
            expressions: (locutionsPar.get(e.id) ?? []).map((l) => ({
              expression: l.expression,
              translation: l.traduction,
              example: l.exemple_kr ? { kreyol: l.exemple_kr, francais: l.exemple_fr } : null,
            })),
          }
        : {}),
      updated_at: dateIso(e.modifie_le),
    });
  }
  return parId;
}

function ordonner(ids, details) {
  return ids.map((id) => details.get(id)).filter(Boolean);
}

// GET /api/v1/search
export async function rechercheApi({ q, from, limit, offset }) {
  if (from === 'fr') {
    const recherche = rechercheFrancais(q);
    if (!recherche) return { total: 0, results: [] };
    const contient = `%${recherche}%`;
    const params = [recherche, `${recherche}%`, `% ${recherche}%`, contient];
    const [{ total }] = await requete(
      `SELECT COUNT(DISTINCT e.id) AS total
         FROM fr_termes t JOIN fr_renvois r ON r.fr_id = t.id JOIN sens s ON s.id = r.sens_id JOIN entrees e ON e.id = s.entree_id
        WHERE t.recherche LIKE ?`,
      [contient],
    );
    const lignes = await requete(
      `SELECT e.id,
              MIN(CASE WHEN t.recherche = ? THEN 0 WHEN t.recherche LIKE ? THEN 1 WHEN t.recherche LIKE ? THEN 2 ELSE 3 END) AS rang
         FROM fr_termes t JOIN fr_renvois r ON r.fr_id = t.id JOIN sens s ON s.id = r.sens_id JOIN entrees e ON e.id = s.entree_id
        WHERE t.recherche LIKE ?
        GROUP BY e.id
        ORDER BY rang, CHAR_LENGTH((SELECT mot FROM entrees WHERE id = e.id)), e.id
        LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    const ids = lignes.map((l) => l.id);
    return { total, results: ordonner(ids, await detailsEntrees(ids)) };
  }

  const recherche = rechercheKreyol(q);
  if (!recherche) return { total: 0, results: [] };
  const contient = `%${recherche}%`;
  const [{ total }] = await requete('SELECT COUNT(DISTINCT entree_id) AS total FROM formes WHERE recherche LIKE ?', [contient]);
  const lignes = await requete(
    `SELECT e.id, e.mot,
            MIN(CASE WHEN f.recherche = ? THEN 2 - f.principale
                     WHEN f.recherche LIKE ? THEN 4 - f.principale
                     ELSE 6 - f.principale END) AS rang
       FROM formes f JOIN entrees e ON e.id = f.entree_id
      WHERE f.recherche LIKE ?
      GROUP BY e.id, e.mot
      ORDER BY rang, CHAR_LENGTH(e.mot), e.mot, e.id
      LIMIT ? OFFSET ?`,
    [recherche, `${recherche}%`, contient, limit, offset],
  );
  const ids = lignes.map((l) => l.id);
  return { total, results: ordonner(ids, await detailsEntrees(ids)) };
}

// GET /api/v1/words/[id]
export async function entreeApi(id) {
  const existe = await premiere('SELECT id FROM entrees WHERE id = ?', [id]);
  if (!existe) return null;
  const details = await detailsEntrees([id], { locutions: true });
  return details.get(id) ?? null;
}

// GET /api/v1/export : dictionnaire entier, réservé aux partenaires autorisés.
// Lecture par tables entières plutôt que par identifiants, pour éviter des clauses IN géantes.
export async function exportComplet() {
  const [entrees, formes, sens, synonymes, termes, exemples, locutions] = await Promise.all([
    requete('SELECT id, mot, slug, modifie_le FROM entrees ORDER BY mot, id'),
    requete('SELECT entree_id, forme FROM formes WHERE principale = 0 ORDER BY id'),
    requete('SELECT id, entree_id, num, traduction FROM sens ORDER BY entree_id, num'),
    requete('SELECT sens_id, mot FROM synonymes ORDER BY sens_id, position'),
    requete('SELECT r.sens_id, t.terme, t.recherche FROM fr_renvois r JOIN fr_termes t ON t.id = r.fr_id ORDER BY t.terme'),
    requete('SELECT sens_id, kreyol, francais FROM exemples ORDER BY sens_id, position, id'),
    requete('SELECT entree_id, expression, traduction, exemple_kr, exemple_fr FROM locutions ORDER BY entree_id, position, id'),
  ]);

  const variantesPar = grouper(formes, 'entree_id');
  const sensPar = grouper(sens, 'entree_id');
  const synPar = grouper(synonymes, 'sens_id');
  const termesPar = grouper(termes, 'sens_id');
  const exemplesPar = grouper(exemples, 'sens_id');
  const locutionsPar = grouper(locutions, 'entree_id');

  return entrees.map((e) => ({
    id: e.id,
    word: e.mot,
    slug: e.slug,
    url: `${SITE_URL}/mo/${e.slug}`,
    variants: (variantesPar.get(e.id) ?? []).map((f) => f.forme),
    senses: (sensPar.get(e.id) ?? []).map((s) => ({
      number: s.num,
      translation: s.traduction,
      synonyms: (synPar.get(s.id) ?? []).map((x) => x.mot),
      french_terms: (termesPar.get(s.id) ?? []).map((t) => ({ term: t.terme, url: `${SITE_URL}/fr/${slugFrancais(t.recherche)}` })),
      examples: (exemplesPar.get(s.id) ?? []).map((x) => ({ kreyol: x.kreyol, francais: x.francais })),
    })),
    expressions: (locutionsPar.get(e.id) ?? []).map((l) => ({
      expression: l.expression,
      translation: l.traduction,
      example: l.exemple_kr ? { kreyol: l.exemple_kr, francais: l.exemple_fr } : null,
    })),
    updated_at: dateIso(e.modifie_le),
  }));
}

// GET /api/v1/updates
export async function misesAJourApi({ depuis, limit, offset }) {
  const [{ total }] = await requete('SELECT COUNT(*) AS total FROM entrees WHERE modifie_le >= ?', [depuis]);
  const lignes = await requete('SELECT id FROM entrees WHERE modifie_le >= ? ORDER BY modifie_le, id LIMIT ? OFFSET ?', [
    depuis,
    limit,
    offset,
  ]);
  const ids = lignes.map((l) => l.id);
  return { total, results: ordonner(ids, await detailsEntrees(ids)) };
}
