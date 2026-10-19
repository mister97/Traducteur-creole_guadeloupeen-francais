// Crée un compte d'administration et affiche son lien d'invitation.
// Usage : npm run admin:creer -- "Nom Prénom" adresse@exemple.fr [editeur|proprietaire]
//
// Sert surtout à créer le tout premier compte, quand personne ne peut encore
// se connecter. Ensuite, tout se fait depuis /admin/utilisateurs.
// Le mot de passe n'est jamais choisi ici : la personne le définit elle-même
// via le lien, qui est à usage unique.

import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const f of ['.env.local', '.env']) {
  const chemin = path.join(racine, f);
  if (existsSync(chemin)) process.loadEnvFile(chemin);
}

const [nom, email, roleDemande = 'proprietaire'] = process.argv.slice(2);
const role = roleDemande === 'editeur' ? 'editeur' : 'proprietaire';

if (!nom || !email) {
  console.error('Usage : npm run admin:creer -- "Nom Prénom" adresse@exemple.fr [editeur|proprietaire]');
  process.exit(1);
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error(`Adresse e-mail invalide : ${email}`);
  process.exit(1);
}
if (!process.env.SITE_URL) {
  console.error('SITE_URL doit être défini pour construire le lien d’invitation.');
  process.exit(1);
}

const { configConnexion } = await import(path.join(racine, 'lib/config-db.mjs'));
const cx = await mysql.createConnection(configConnexion());

try {
  const adresse = email.trim().toLowerCase();
  const [[existant]] = await cx.query('SELECT id FROM admin_users WHERE email = ?', [adresse]);

  let id;
  if (existant) {
    id = existant.id;
    console.log(`Un compte existe déjà pour ${adresse} : un nouveau lien va être généré.`);
  } else {
    const [resultat] = await cx.query('INSERT INTO admin_users (name, email, role) VALUES (?, ?, ?)', [
      nom.trim(),
      adresse,
      role,
    ]);
    id = resultat.insertId;
    console.log(`Compte créé : ${nom} <${adresse}> (${role}).`);
  }

  // Même format que lib/comptes-admin.js : seule l'empreinte SHA-256 est stockée
  const jeton = crypto.randomBytes(32).toString('base64url');
  const empreinte = crypto.createHash('sha256').update(jeton).digest('hex');
  await cx.query("UPDATE admin_tokens SET used_at = NOW() WHERE user_id = ? AND purpose = 'invitation' AND used_at IS NULL", [id]);
  await cx.query(
    "INSERT INTO admin_tokens (user_id, purpose, token_hash, expires_at) VALUES (?, 'invitation', ?, NOW() + INTERVAL 48 HOUR)",
    [id, empreinte],
  );

  const base = process.env.SITE_URL.replace(/\/+$/, '');
  console.log('\nLien à ouvrir pour choisir le mot de passe (valable 48 h, utilisable une seule fois) :');
  console.log(`\n  ${base}/admin/mot-de-passe/${jeton}\n`);
  console.log('Ce lien ne sera plus affiché : seule son empreinte est conservée en base.');
} catch (erreur) {
  if (erreur.code === 'ER_NO_SUCH_TABLE') {
    console.error('Tables manquantes : lancez d’abord « npm run db:init ».');
  } else {
    console.error(erreur.message);
  }
  process.exitCode = 1;
} finally {
  await cx.end();
}
