// Génère la valeur de ADMIN_PASSWORD_HASH à partir d'un mot de passe.
// Usage : npm run admin:hash -- "mon mot de passe"

import crypto from 'node:crypto';

const motDePasse = process.argv[2];
if (!motDePasse) {
  console.error('Usage : npm run admin:hash -- "mon mot de passe"');
  process.exit(1);
}
if (motDePasse.length < 10) {
  console.error('Choisissez un mot de passe d’au moins 10 caractères.');
  process.exit(1);
}

const sel = crypto.randomBytes(16);
const hash = crypto.scryptSync(motDePasse, sel, 64);
console.log(`ADMIN_PASSWORD_HASH=scrypt:${sel.toString('base64')}:${hash.toString('base64')}`);
console.log(`\nEt si besoin, un SESSION_SECRET :\nSESSION_SECRET=${crypto.randomBytes(32).toString('base64url')}`);
