// Convertit database/dico-kreyol.sqlite en database/donnees.sql (+ .gz) pour MySQL/MariaDB.
// Usage : npm run db:generer   (Node 22.5+ requis pour node:sqlite)
//
// Corrections appliquées au passage :
//  - colonnes « recherche » recalculées (le « œ » était perdu : « cœur » → « c ur ») ;
//  - termes français numérotés (« 1. échouer ») nettoyés et fusionnés avec le terme existant ;
//  - synonymes sans lien : on retente de les relier à un mot du dictionnaire ;
//  - slugs uniques pour les URL des fiches (/mo/manje, /mo/abo-2…).

import { DatabaseSync } from 'node:sqlite';
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rechercheFrancais, rechercheKreyol, slugifier } from '../lib/normalisation.mjs';

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = process.argv[2] ?? path.join(racine, 'database', 'dico-kreyol.sqlite');
const cible = path.join(racine, 'database', 'donnees.sql');

const db = new DatabaseSync(source, { readOnly: true });
const tout = (sql) => db.prepare(sql).all();
const nettoyer = (v) => (v == null ? null : String(v).replace(/\s+/g, ' ').trim());

const rapport = {};

// --- entrées + slugs -------------------------------------------------------
const entrees = tout('SELECT id, mot FROM entrees ORDER BY id');
const slugsPris = new Set();
for (const e of entrees) {
  e.mot = nettoyer(e.mot);
  const base = slugifier(e.mot);
  let slug = base;
  for (let i = 2; slugsPris.has(slug); i++) slug = `${base}-${i}`;
  slugsPris.add(slug);
  e.slug = slug;
}
const idsEntrees = new Set(entrees.map((e) => e.id));

// --- formes ----------------------------------------------------------------
const formes = tout('SELECT id, entree_id, forme, principale FROM formes ORDER BY id')
  .filter((f) => idsEntrees.has(f.entree_id))
  .map((f) => ({ ...f, forme: nettoyer(f.forme), recherche: rechercheKreyol(f.forme) }))
  .filter((f) => f.forme);

// Chaque entrée doit avoir exactement une forme principale identique à « mot »
const principales = new Map();
for (const f of formes) if (f.principale) principales.set(f.entree_id, f);
let formesAjoutees = 0;
let prochainIdForme = Math.max(0, ...formes.map((f) => f.id)) + 1;
for (const e of entrees) {
  const p = principales.get(e.id);
  if (!p) {
    formes.push({ id: prochainIdForme++, entree_id: e.id, forme: e.mot, recherche: rechercheKreyol(e.mot), principale: 1 });
    formesAjoutees++;
  } else if (p.forme !== e.mot) {
    p.forme = e.mot;
    p.recherche = rechercheKreyol(e.mot);
  }
}
rapport['formes principales ajoutées'] = formesAjoutees;

// Index recherche → entrée, pour relier les synonymes (forme principale d'abord)
const indexFormes = new Map();
for (const f of [...formes].sort((a, b) => b.principale - a.principale || a.entree_id - b.entree_id)) {
  if (f.recherche && !indexFormes.has(f.recherche)) indexFormes.set(f.recherche, f.entree_id);
}

// --- sens ------------------------------------------------------------------
const sens = tout('SELECT id, entree_id, num, traduction FROM sens ORDER BY entree_id, num, id')
  .filter((s) => idsEntrees.has(s.entree_id))
  .map((s) => {
    const traduction = nettoyer(s.traduction) ?? '';
    return { ...s, traduction, recherche: rechercheFrancais(traduction) };
  });
const idsSens = new Set(sens.map((s) => s.id));

// --- synonymes -------------------------------------------------------------
let synonymesRelies = 0;
const positions = new Map();
const synonymes = tout('SELECT id, sens_id, mot, ref FROM synonymes ORDER BY sens_id, id')
  .filter((s) => idsSens.has(s.sens_id) && nettoyer(s.mot))
  .map((s) => {
    const mot = nettoyer(s.mot);
    const recherche = rechercheKreyol(mot);
    let ref = s.ref != null && idsEntrees.has(s.ref) ? s.ref : null;
    if (ref == null && indexFormes.has(recherche)) {
      ref = indexFormes.get(recherche);
      synonymesRelies++;
    }
    const position = positions.get(s.sens_id) ?? 0;
    positions.set(s.sens_id, position + 1);
    return { id: s.id, sens_id: s.sens_id, position, mot, recherche, ref };
  });
rapport['synonymes nouvellement reliés'] = synonymesRelies;
rapport['synonymes sans lien restants'] = synonymes.filter((s) => s.ref == null).length;

// --- locutions -------------------------------------------------------------
positions.clear();
const locutions = tout('SELECT id, entree_id, expression, traduction, exemple_kr, exemple_fr FROM locutions ORDER BY entree_id, id')
  .filter((l) => idsEntrees.has(l.entree_id) && nettoyer(l.expression))
  .map((l) => {
    const position = positions.get(l.entree_id) ?? 0;
    positions.set(l.entree_id, position + 1);
    return {
      id: l.id,
      entree_id: l.entree_id,
      position,
      expression: nettoyer(l.expression),
      traduction: nettoyer(l.traduction) || null,
      exemple_kr: nettoyer(l.exemple_kr) || null,
      exemple_fr: nettoyer(l.exemple_fr) || null,
    };
  });

// --- termes français -------------------------------------------------------
const termesParRecherche = new Map();
const remplacementFr = new Map();
let termesFusionnes = 0;
// Les termes non numérotés d'abord, pour qu'ils gardent leur id en cas de fusion
const termesSource = tout('SELECT id, terme FROM fr_termes ORDER BY id').sort(
  (a, b) => /^\d+\.\s/.test(a.terme) - /^\d+\.\s/.test(b.terme) || a.id - b.id,
);
for (const t of termesSource) {
  const terme = nettoyer(t.terme).replace(/^\d+\.\s+/, '');
  const recherche = rechercheFrancais(terme);
  if (!recherche) continue;
  const existant = termesParRecherche.get(recherche);
  if (existant) {
    remplacementFr.set(t.id, existant.id);
    termesFusionnes++;
  } else {
    termesParRecherche.set(recherche, { id: t.id, terme, recherche });
    remplacementFr.set(t.id, t.id);
  }
}
const frTermes = [...termesParRecherche.values()].sort((a, b) => a.id - b.id);
rapport['termes français fusionnés'] = termesFusionnes;

const renvoisVus = new Set();
const frRenvois = [];
for (const r of tout('SELECT fr_id, sens_id FROM fr_renvois ORDER BY id')) {
  const frId = remplacementFr.get(r.fr_id);
  if (frId == null || !idsSens.has(r.sens_id)) continue;
  const cle = `${frId}:${r.sens_id}`;
  if (renvoisVus.has(cle)) continue;
  renvoisVus.add(cle);
  frRenvois.push({ fr_id: frId, sens_id: r.sens_id });
}
const sensAvecTerme = new Set(frRenvois.map((r) => r.sens_id));
rapport['sens sans terme français'] = sens.filter((s) => !sensAvecTerme.has(s.id)).length;

// --- écriture SQL ----------------------------------------------------------
// Une instruction par ligne (les retours à la ligne sont échappés), pour que
// scripts/db-init.mjs puisse découper le fichier sans analyser le SQL.
function litteral(v) {
  if (v == null) return 'NULL';
  if (typeof v === 'number' || typeof v === 'bigint') return String(v);
  return (
    "'" +
    String(v)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\0/g, '\\0') +
    "'"
  );
}

const lignes = [
  '-- Mofwazé : données initiales générées depuis dico-kreyol.sqlite',
  `-- Généré le ${new Date().toISOString()}`,
  'SET NAMES utf8mb4;',
  'SET FOREIGN_KEY_CHECKS = 0;',
];

function inserer(table, colonnes, lignesDonnees, taillePaquet = 400) {
  for (let i = 0; i < lignesDonnees.length; i += taillePaquet) {
    const valeurs = lignesDonnees
      .slice(i, i + taillePaquet)
      .map((l) => '(' + colonnes.map((c) => litteral(l[c])).join(',') + ')')
      .join(',');
    lignes.push(`INSERT INTO ${table} (${colonnes.join(',')}) VALUES ${valeurs};`);
  }
}

inserer('entrees', ['id', 'mot', 'slug'], entrees);
inserer('formes', ['id', 'entree_id', 'forme', 'recherche', 'principale'], formes);
inserer('sens', ['id', 'entree_id', 'num', 'traduction', 'recherche'], sens);
inserer('synonymes', ['id', 'sens_id', 'position', 'mot', 'recherche', 'ref'], synonymes);
inserer('locutions', ['id', 'entree_id', 'position', 'expression', 'traduction', 'exemple_kr', 'exemple_fr'], locutions);
inserer('fr_termes', ['id', 'terme', 'recherche'], frTermes);
inserer('fr_renvois', ['fr_id', 'sens_id'], frRenvois, 2000);
lignes.push('SET FOREIGN_KEY_CHECKS = 1;');

const contenu = lignes.join('\n') + '\n';
writeFileSync(cible, contenu);
writeFileSync(cible + '.gz', gzipSync(contenu));

console.log(`Fichier écrit : ${path.relative(racine, cible)} (${(contenu.length / 1e6).toFixed(1)} Mo) et .gz`);
console.table({
  entrées: entrees.length,
  formes: formes.length,
  sens: sens.length,
  synonymes: synonymes.length,
  locutions: locutions.length,
  'termes français': frTermes.length,
  'renvois fr → sens': frRenvois.length,
});
console.table(rapport);
