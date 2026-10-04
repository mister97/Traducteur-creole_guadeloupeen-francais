import { entreeApi } from '@/lib/api-donnees';
import { ErreurApi, pointEntree, reponseOptions } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(requete, { params }) {
  const { id } = await params;

  return pointEntree(requete, { endpoint: '/api/v1/words', query: id }, async () => {
    const identifiant = Number.parseInt(id, 10);
    if (!Number.isInteger(identifiant) || identifiant < 1) {
      throw new ErreurApi('invalid_request', 'L’identifiant doit être un entier positif.');
    }
    const entree = await entreeApi(identifiant);
    if (!entree) throw new ErreurApi('not_found', 'Aucune entrée ne porte cet identifiant.');
    return { word: entree };
  });
}

export async function OPTIONS() {
  return reponseOptions();
}
