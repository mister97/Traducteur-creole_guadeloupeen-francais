// Génère un SESSION_SECRET à copier dans .env.local (ou dans Plesk).
// Usage : npm run secret

import crypto from 'node:crypto';

console.log(`SESSION_SECRET=${crypto.randomBytes(32).toString('base64url')}`);
