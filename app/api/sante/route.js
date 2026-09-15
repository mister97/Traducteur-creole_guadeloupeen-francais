import { descriptionConnexion } from '@/lib/config-db.mjs';
import { premiere } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Diagnostic de mise en production : GET /api/sante
// Indique si la base répond et quelles variables sont définies, sans jamais
// renvoyer de secret (oui/non pour les variables, code d'erreur et mode de connexion).
export async function GET() {
  const variables = Object.fromEntries(
    ['DATABASE_URL', 'DB_SOCKET', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'SESSION_SECRET', 'SMTP_HOST'].map((nom) => [
      nom,
      Boolean(process.env[nom]),
    ]),
  );

  try {
    const { mots } = await premiere('SELECT COUNT(*) AS mots FROM entrees');
    return Response.json({ ok: true, base: 'connectée', mots, variables }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (erreur) {
    const connexion = descriptionConnexion();
    console.error(`[sante] Base de données indisponible (${connexion}) :`, erreur.code ?? '', erreur.message);
    return Response.json(
      {
        ok: false,
        base: 'erreur',
        code: erreur.code ?? erreur.name ?? 'inconnu',
        connexion,
        ...(erreur.address ? { adresseEssayee: `${erreur.address}${erreur.port ? `:${erreur.port}` : ''}` } : {}),
        variables,
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
