import { decalerJour, jourGuadeloupe } from '@/lib/dates';
import { lettresJeu } from '@/lib/normalisation.mjs';
import { evaluer, motsValides, solutionDuJour } from '@/lib/quotidien';

const ESSAIS_MAX = 6;

// POST { jour: 'AAAA-MM-JJ', essai: 'MANJE', numero: 1..6 }
// → { resultat: ['bon'|'place'|'absent' ×5], gagne, solution? } ou { erreur: 'longueur'|'inconnu'|'jour' }
export async function POST(request) {
  let corps;
  try {
    corps = await request.json();
  } catch {
    return Response.json({ erreur: 'requete' }, { status: 400 });
  }

  // On accepte la veille : une partie commencée juste avant minuit peut se terminer
  const aujourdhui = jourGuadeloupe();
  const jour = String(corps?.jour ?? '');
  if (jour !== aujourdhui && jour !== decalerJour(aujourdhui, -1)) {
    return Response.json({ erreur: 'jour', jour: aujourdhui }, { status: 409 });
  }

  const essai = lettresJeu(corps?.essai ?? '');
  if (essai.length !== 5) return Response.json({ erreur: 'longueur' }, { status: 422 });
  if (!(await motsValides()).has(essai)) return Response.json({ erreur: 'inconnu' }, { status: 422 });

  const solution = await solutionDuJour(jour);
  if (!solution || solution.lettres.length !== 5) {
    return Response.json({ erreur: 'indisponible' }, { status: 503 });
  }

  const resultat = evaluer(essai, solution.lettres);
  const gagne = essai === solution.lettres;
  const numero = Math.min(ESSAIS_MAX, Math.max(1, Number(corps?.numero) || 1));
  const fini = gagne || numero >= ESSAIS_MAX;

  return Response.json(
    {
      essai,
      resultat,
      gagne,
      ...(fini
        ? { solution: { mot: solution.mot, slug: solution.slug, lettres: solution.lettres, traductions: solution.traductions } }
        : {}),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
