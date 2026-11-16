// Remplit les colonnes de recherche des expressions existantes.
// Usage : npm run db:indexer-expressions
//
// A lancer une fois apres la migration 2026-11-16. Ensuite, chaque
// enregistrement de fiche remplit ces colonnes tout seul (lib/fiches.js).

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const f of ['.env.local', '.env']) {
  const chemin = path.join(racine, f);
  if (existsSync(chemin)) process.loadEnvFile(chemin);
}

const { rechercheFrancais, rechercheKreyol } = await import(path.join(racine, 'lib/normalisation.mjs'));
const { configConnexion } = await import(path.join(racine, 'lib/config-db.mjs'));

const cx = await mysql.createConnection(configConnexion());

try {
  const [lignes] = await cx.query('SELECT id, expression, traduction FROM locutions');
  let faites = 0;
  for (const l of lignes) {
    await cx.query('UPDATE locutions SET recherche_kr = ?, recherche_fr = ? WHERE id = ?', [
      rechercheKreyol(l.expression).slice(0, 255),
      l.traduction ? rechercheFrancais(l.traduction) : null,
      l.id,
    ]);
    faites++;
  }
  console.log(`${faites} expressions indexees.`);
} catch (erreur) {
  console.error(erreur.message);
  process.exitCode = 1;
} finally {
  await cx.end();
}
