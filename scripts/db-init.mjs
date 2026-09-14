// Crée les tables puis charge le dictionnaire dans MySQL/MariaDB.
// Usage :
//   npm run db:init              crée les tables et importe si le dictionnaire est vide
//   npm run db:init -- --ecraser vide les tables du dictionnaire puis réimporte
//                                (les suggestions sont conservées)
// La connexion est lue dans .env.local / .env ou dans l'environnement (voir .env.example).

import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { configConnexion } from '../lib/config-db.mjs';

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const fichier of ['.env.local', '.env']) {
  const chemin = path.join(racine, fichier);
  if (existsSync(chemin)) process.loadEnvFile(chemin);
}

const ecraser = process.argv.includes('--ecraser');

function instructions(sql) {
  // Découpage simple : le schéma et les données n'ont jamais de « ; » en fin de ligne dans une valeur
  return sql
    .split(/;\s*\n/)
    .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
    .filter(Boolean);
}

function lireDonnees() {
  const sql = path.join(racine, 'database', 'donnees.sql');
  if (existsSync(sql)) return readFileSync(sql, 'utf8');
  if (existsSync(sql + '.gz')) return gunzipSync(readFileSync(sql + '.gz')).toString('utf8');
  throw new Error('database/donnees.sql introuvable : lancez d’abord « npm run db:generer ».');
}

const connexion = await mysql.createConnection(configConnexion());
try {
  const schema = readFileSync(path.join(racine, 'database', 'schema.sql'), 'utf8');
  for (const i of instructions(schema)) await connexion.query(i);
  console.log('Tables prêtes.');

  const [[{ n }]] = await connexion.query('SELECT COUNT(*) AS n FROM entrees');
  if (n > 0 && !ecraser) {
    console.log(`Le dictionnaire contient déjà ${n} mots : import ignoré (utilisez --ecraser pour réimporter).`);
  } else {
    if (ecraser) {
      await connexion.query('SET FOREIGN_KEY_CHECKS = 0');
      for (const t of ['fr_renvois', 'fr_termes', 'locutions', 'synonymes', 'sens', 'formes', 'quotidien', 'entrees']) {
        await connexion.query(`TRUNCATE TABLE ${t}`);
      }
      await connexion.query('SET FOREIGN_KEY_CHECKS = 1');
    }
    const liste = instructions(lireDonnees());
    let fait = 0;
    for (const i of liste) {
      await connexion.query(i);
      fait++;
      if (fait % 20 === 0) process.stdout.write(`\rImport… ${Math.round((fait / liste.length) * 100)} %`);
    }
    const [[{ total }]] = await connexion.query('SELECT COUNT(*) AS total FROM entrees');
    console.log(`\rImport terminé : ${total} mots.        `);
  }
} finally {
  await connexion.end();
}
