import { premiere, requete, transaction } from './db';
import { normaliserFiche } from './fiche-format';
import { rechercheFrancais, rechercheKreyol, slugifier } from './normalisation.mjs';
import { viderCacheJeu } from './quotidien';

// Fiche au format de l'éditeur (lib/fiche-format.js) + métadonnées d'administration
export async function chargerFiche(id) {
  const entree = await premiere(
    'SELECT id, mot, slug, exclu_quotidien, exclu_jeu, cree_le, modifie_le FROM entrees WHERE id = ?',
    [id],
  );
  if (!entree) return null;
  const [formes, sens, locutions] = await Promise.all([
    requete('SELECT forme FROM formes WHERE entree_id = ? AND principale = 0 ORDER BY id', [id]),
    requete('SELECT id, traduction FROM sens WHERE entree_id = ? ORDER BY num', [id]),
    requete(
      'SELECT expression, traduction, exemple_kr, exemple_fr FROM locutions WHERE entree_id = ? ORDER BY position, id',
      [id],
    ),
  ]);
  const idsSens = sens.map((s) => s.id);
  const [synonymes, termes, exemples] = idsSens.length
    ? await Promise.all([
        requete('SELECT sens_id, mot FROM synonymes WHERE sens_id IN (?) ORDER BY sens_id, position', [idsSens]),
        requete(
          'SELECT r.sens_id, t.terme FROM fr_renvois r JOIN fr_termes t ON t.id = r.fr_id WHERE r.sens_id IN (?) ORDER BY t.terme',
          [idsSens],
        ),
        requete('SELECT sens_id, kreyol, francais FROM exemples WHERE sens_id IN (?) ORDER BY sens_id, position, id', [idsSens]),
      ])
    : [[], [], []];

  return {
    ...entree,
    fiche: {
      mot: entree.mot,
      variantes: formes.map((f) => f.forme),
      sens: sens.map((s) => ({
        traduction: s.traduction,
        synonymes: synonymes.filter((x) => x.sens_id === s.id).map((x) => x.mot),
        termes: termes.filter((x) => x.sens_id === s.id).map((x) => x.terme),
        exemples: exemples.filter((x) => x.sens_id === s.id).map((x) => ({ kr: x.kreyol, fr: x.francais ?? '' })),
      })),
      locutions: locutions.map((l) => ({
        expression: l.expression,
        traduction: l.traduction ?? '',
        exemple_kr: l.exemple_kr ?? '',
        exemple_fr: l.exemple_fr ?? '',
      })),
    },
  };
}

async function slugDisponible(tx, base, idActuel) {
  const racine = slugifier(base);
  for (let i = 1; ; i++) {
    const candidat = i === 1 ? racine : `${racine}-${i}`;
    const pris = await tx.premiere('SELECT id FROM entrees WHERE slug = ?', [candidat]);
    if (!pris || pris.id === idActuel) return candidat;
  }
}

export class ErreurFiche extends Error {}

/**
 * Crée ou remplace une entrée complète.
 * options : { id?, slug?, exclu_quotidien?, exclu_jeu? }
 * Retourne { id, slug }.
 */
export async function enregistrerFiche(ficheBrute, options = {}) {
  const fiche = normaliserFiche(ficheBrute);
  if (!fiche.mot) throw new ErreurFiche('Le mot est obligatoire.');

  const resultat = await transaction(async (tx) => {
    let id = options.id ? Number(options.id) : null;
    let slug;

    if (id) {
      const actuelle = await tx.premiere('SELECT id, slug FROM entrees WHERE id = ? FOR UPDATE', [id]);
      if (!actuelle) throw new ErreurFiche('Ce mot n’existe plus.');
      const slugDemande = options.slug ? slugifier(options.slug) : actuelle.slug;
      if (slugDemande !== actuelle.slug) {
        const pris = await tx.premiere('SELECT id FROM entrees WHERE slug = ? AND id <> ?', [slugDemande, id]);
        if (pris) throw new ErreurFiche(`L’adresse « ${slugDemande} » est déjà utilisée par un autre mot.`);
      }
      slug = slugDemande;
      await tx.requete('UPDATE entrees SET mot = ?, slug = ?, exclu_quotidien = ?, exclu_jeu = ?, modifie_le = CURRENT_TIMESTAMP WHERE id = ?', [
        fiche.mot,
        slug,
        options.exclu_quotidien ? 1 : 0,
        options.exclu_jeu ? 1 : 0,
        id,
      ]);
      // Les sens, exemples, synonymes, renvois et locutions sont recréés (suppression en cascade)
      await tx.requete('DELETE FROM formes WHERE entree_id = ?', [id]);
      await tx.requete('DELETE FROM sens WHERE entree_id = ?', [id]);
      await tx.requete('DELETE FROM locutions WHERE entree_id = ?', [id]);
    } else {
      slug = await slugDisponible(tx, options.slug || fiche.mot, null);
      const insertion = await tx.requete(
        'INSERT INTO entrees (mot, slug, exclu_quotidien, exclu_jeu) VALUES (?, ?, ?, ?)',
        [fiche.mot, slug, options.exclu_quotidien ? 1 : 0, options.exclu_jeu ? 1 : 0],
      );
      id = insertion.insertId;
    }

    // Formes
    const formes = [[id, fiche.mot, rechercheKreyol(fiche.mot), 1], ...fiche.variantes.map((v) => [id, v, rechercheKreyol(v), 0])];
    await tx.requete('INSERT INTO formes (entree_id, forme, recherche, principale) VALUES ?', [formes]);

    // Sens, synonymes, termes français
    for (const [i, s] of fiche.sens.entries()) {
      const { insertId: sensId } = await tx.requete(
        'INSERT INTO sens (entree_id, num, traduction, recherche) VALUES (?, ?, ?, ?)',
        [id, i + 1, s.traduction, rechercheFrancais(s.traduction)],
      );

      if (s.synonymes.length) {
        const recherches = s.synonymes.map(rechercheKreyol);
        const cibles = await tx.requete(
          'SELECT recherche, entree_id FROM formes WHERE recherche IN (?) ORDER BY principale DESC, entree_id',
          [recherches],
        );
        const refs = new Map();
        for (const c of cibles) if (!refs.has(c.recherche)) refs.set(c.recherche, c.entree_id);
        await tx.requete('INSERT INTO synonymes (sens_id, position, mot, recherche, ref) VALUES ?', [
          s.synonymes.map((mot, position) => [sensId, position, mot, recherches[position], refs.get(recherches[position]) ?? null]),
        ]);
      }

      if (s.exemples.length) {
        await tx.requete('INSERT INTO exemples (sens_id, position, kreyol, francais) VALUES ?', [
          s.exemples.map((ex, position) => [sensId, position, ex.kr, ex.fr || null]),
        ]);
      }

      for (const terme of s.termes) {
        const recherche = rechercheFrancais(terme);
        if (!recherche) continue;
        // LAST_INSERT_ID(id) renvoie l'id du terme existant en cas de doublon
        const { insertId: frId } = await tx.requete(
          'INSERT INTO fr_termes (terme, recherche) VALUES (?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)',
          [terme, recherche],
        );
        await tx.requete('INSERT IGNORE INTO fr_renvois (fr_id, sens_id) VALUES (?, ?)', [frId, sensId]);
      }
    }

    // Locutions
    if (fiche.locutions.length) {
      await tx.requete(
        'INSERT INTO locutions (entree_id, position, expression, traduction, exemple_kr, exemple_fr) VALUES ?',
        [fiche.locutions.map((l, i) => [id, i, l.expression, l.traduction || null, l.exemple_kr || null, l.exemple_fr || null])],
      );
    }

    // Les synonymes d'autres mots qui s'écrivent comme ce mot pointent désormais vers lui
    await tx.requete(
      `UPDATE synonymes sy JOIN formes f ON f.recherche = sy.recherche AND f.entree_id = ?
          SET sy.ref = ? WHERE sy.ref IS NULL`,
      [id, id],
    );
    await supprimerTermesOrphelins(tx);
    return { id, slug };
  });

  viderCacheJeu();
  return resultat;
}

export async function supprimerFiche(id) {
  await transaction(async (tx) => {
    await tx.requete('DELETE FROM entrees WHERE id = ?', [id]);
    await supprimerTermesOrphelins(tx);
  });
  viderCacheJeu();
}

async function supprimerTermesOrphelins(tx) {
  await tx.requete(
    'DELETE t FROM fr_termes t LEFT JOIN fr_renvois r ON r.fr_id = t.id WHERE r.fr_id IS NULL',
  );
}
