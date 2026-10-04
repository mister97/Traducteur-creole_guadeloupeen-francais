import { ErreurApi, pointEntree, reponseOptions } from '@/lib/api';
import { exportComplet } from '@/lib/api-donnees';
import { premiere } from '@/lib/db';
import { TERMS_VERSION } from '@/lib/conditions';

export const dynamic = 'force-dynamic';

// Export du dictionnaire entier, réservé aux partenaires expressément autorisés
// (case à cocher dans l'administration). Deux exports par heure suffisent très
// largement : l'export sert à se constituer une copie, pas à être appelé en boucle.
const EXPORTS_PAR_HEURE = 2;

export async function GET(requete) {
  return pointEntree(requete, { endpoint: '/api/v1/export' }, async ({ cle }) => {
    if (!cle) throw new ErreurApi('unauthorized', 'L’export complet demande une clé d’API.');
    if (!cle.export_autorise) throw new ErreurApi('export_not_allowed');

    const { n } = await premiere(
      `SELECT COUNT(*) AS n FROM api_requests
        WHERE api_key_id = ? AND endpoint = '/api/v1/export' AND status = 200 AND created_at > NOW() - INTERVAL 1 HOUR`,
      [cle.id],
    );
    if (n >= EXPORTS_PAR_HEURE) {
      throw new ErreurApi('rate_limited', `L’export est limité à ${EXPORTS_PAR_HEURE} appels par heure.`);
    }

    const entrees = await exportComplet();
    return {
      generated_at: new Date().toISOString(),
      terms_version: TERMS_VERSION,
      count: entrees.length,
      entries: entrees,
    };
  });
}

export async function OPTIONS() {
  return reponseOptions();
}
