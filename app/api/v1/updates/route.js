import { misesAJourApi } from '@/lib/api-donnees';
import { entier, ErreurApi, pointEntree, reponseOptions } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Les dates sont stockées en UTC : « 2026-10-01T00:00:00Z » → « 2026-10-01 00:00:00 »
function dateMysql(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new ErreurApi('invalid_request', 'Le paramètre « since » est obligatoire et doit être une date ISO 8601.');
  }
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export async function GET(requete) {
  const params = new URL(requete.url).searchParams;
  const since = params.get('since') ?? '';

  return pointEntree(requete, { endpoint: '/api/v1/updates', query: since }, async () => {
    const depuis = dateMysql(since);
    const limit = entier(params.get('limit'), { defaut: 50, min: 1, max: 100, nom: 'limit' });
    const offset = entier(params.get('offset'), { defaut: 0, min: 0, max: 5000, nom: 'offset' });

    const { total, results } = await misesAJourApi({ depuis, limit, offset });
    return { since: new Date(since).toISOString(), limit, offset, total, count: results.length, results };
  });
}

export async function OPTIONS() {
  return reponseOptions();
}
