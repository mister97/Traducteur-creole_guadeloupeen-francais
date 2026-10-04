// Tâche quotidienne : agrège api_requests dans api_usage_daily, puis purge le
// journal détaillé au-delà de 30 jours. L'agrégat est conservé sans limite.
//
// Usage : npm run api:agreger
// Plesk : Outils & Paramètres › Tâches planifiées, une fois par jour.

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const fichier of ['.env.local', '.env']) {
  const chemin = path.join(racine, fichier);
  if (existsSync(chemin)) process.loadEnvFile(chemin);
}

const { agregerUsage } = await import('../lib/api-agregation.js');
const { agregees, purgees } = await agregerUsage();
console.log(`Agrégation : ${agregees} ligne(s) dans api_usage_daily, ${purgees} ligne(s) de journal purgée(s).`);
process.exit(0);
