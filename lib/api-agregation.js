// Extension explicite : ce module est aussi chargé par scripts/api-agregation.mjs,
// exécuté par Node sans bundler (tâche planifiée).
import { requete } from './db.js';

// Agrégation du journal détaillé (api_requests) vers api_usage_daily, puis purge
// des lignes de plus de 30 jours. L'agrégat, lui, est conservé sans limite :
// c'est la preuve d'usage dans la durée.
export const JOURS_JOURNAL = 30;

export async function agregerUsage() {
  // Les jours déjà agrégés sont recalculés par ON DUPLICATE KEY : l'opération est rejouable
  const { affectedRows } = await requete(
    `INSERT INTO api_usage_daily (api_key_id, day, endpoint, calls, errors)
     SELECT api_key_id, DATE(created_at) AS jour, endpoint,
            COUNT(*) AS appels,
            SUM(status >= 400) AS erreurs
       FROM api_requests
      WHERE api_key_id IS NOT NULL AND created_at < CURDATE()
      GROUP BY api_key_id, DATE(created_at), endpoint
     ON DUPLICATE KEY UPDATE calls = VALUES(calls), errors = VALUES(errors)`,
  );
  const { affectedRows: purgees } = await requete('DELETE FROM api_requests WHERE created_at < NOW() - INTERVAL ? DAY', [
    JOURS_JOURNAL,
  ]);
  return { agregees: affectedRows, purgees };
}

// Repli si aucune tâche planifiée n'est configurée : au plus une fois par heure et par processus
let derniereTentative = 0;

export async function agregerSiNecessaire() {
  if (Date.now() - derniereTentative < 3600_000) return;
  derniereTentative = Date.now();
  try {
    await agregerUsage();
  } catch (erreur) {
    console.error('Agrégation de l’usage API impossible :', erreur.message);
  }
}
