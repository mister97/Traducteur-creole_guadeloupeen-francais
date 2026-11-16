// Réparation ponctuelle : rend à FÈ les expressions perdues.
// Usage : npm run reparer:fe          (aperçu, n'écrit rien)
//         npm run reparer:fe -- --ecrire
//
// Contexte : l'éditeur de fiches plafonnait à 60 expressions et l'enregistrement
// remplace tout. Le jour où FÈ a été enregistré depuis l'administration, ses
// expressions au-delà de la 60e ont été effacées sans avertissement. La cause
// est corrigée (lib/fiche-format.js refuse désormais au lieu de tronquer) ;
// ce script restitue ce qui avait été perdu, à partir des données d'import.
//
// Sans effet si les expressions sont déjà là : la comparaison se fait sur le
// texte de l'expression, et rien n'est jamais modifié ni supprimé.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const f of ['.env.local', '.env']) {
  const chemin = path.join(racine, f);
  if (existsSync(chemin)) process.loadEnvFile(chemin);
}

const ecrire = process.argv.includes('--ecrire');
const attendues = JSON.parse(readFileSync(path.join(racine, 'scripts/expressions-fe.json'), 'utf8'));

const { configConnexion } = await import(path.join(racine, 'lib/config-db.mjs'));
const cx = await mysql.createConnection(configConnexion());

try {
  const [[entree]] = await cx.query("SELECT id, mot FROM entrees WHERE slug = 'fe-2'");
  if (!entree) throw new Error("Entrée « fe-2 » introuvable : vérifiez le slug de FÈ sur ce serveur.");
  if (entree.mot !== 'FÈ') throw new Error(`L'entrée « fe-2 » porte le mot « ${entree.mot} » : rien n'a été touché.`);

  const [presentes] = await cx.query('SELECT expression, position FROM locutions WHERE entree_id = ?', [entree.id]);
  const deja = new Set(presentes.map((l) => l.expression.trim().toLowerCase()));
  const manquantes = attendues.filter((l) => !deja.has(l.expression.trim().toLowerCase()));

  console.log(`${entree.mot} : ${presentes.length} expressions en base, ${attendues.length} attendues.`);
  if (manquantes.length === 0) {
    console.log('Rien à restituer.');
  } else {
    console.log(`${manquantes.length} à restituer :`);
    for (const l of manquantes) console.log(`  · ${l.expression}${l.traduction ? ` = ${l.traduction}` : ''}`);

    if (!ecrire) {
      console.log('\nAperçu seulement. Relancez avec « -- --ecrire » pour appliquer.');
    } else {
      let position = Math.max(-1, ...presentes.map((l) => l.position)) + 1;
      await cx.query('INSERT INTO locutions (entree_id, position, expression, traduction, exemple_kr, exemple_fr) VALUES ?', [
        manquantes.map((l) => [entree.id, position++, l.expression, l.traduction, l.exemple_kr, l.exemple_fr]),
      ]);
      const [[{ n }]] = await cx.query('SELECT COUNT(*) n FROM locutions WHERE entree_id = ?', [entree.id]);
      console.log(`\nFait : ${entree.mot} compte maintenant ${n} expressions.`);
    }
  }
} catch (erreur) {
  console.error(erreur.message);
  process.exitCode = 1;
} finally {
  await cx.end();
}
