import { rechercheApi } from '@/lib/api-donnees';
import { entier, ErreurApi, pointEntree, reponseOptions } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(requete) {
  const params = new URL(requete.url).searchParams;
  const q = (params.get('q') ?? '').trim();

  return pointEntree(requete, { endpoint: '/api/v1/search', query: q }, async () => {
    if (q.length < 1 || q.length > 60) {
      throw new ErreurApi('invalid_request', 'Le paramètre « q » est obligatoire et doit faire de 1 à 60 caractères.');
    }
    const from = params.get('from') ?? 'gcf';
    if (!['gcf', 'fr'].includes(from)) {
      throw new ErreurApi('invalid_request', 'Le paramètre « from » doit valoir « gcf » ou « fr ».');
    }
    const limit = entier(params.get('limit'), { defaut: 20, min: 1, max: 50, nom: 'limit' });
    const offset = entier(params.get('offset'), { defaut: 0, min: 0, max: 5000, nom: 'offset' });

    const { total, results } = await rechercheApi({ q, from, limit, offset });
    return { query: q, from, limit, offset, total, count: results.length, results };
  });
}

export async function OPTIONS() {
  return reponseOptions();
}
