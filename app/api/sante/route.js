import { descriptionConnexion } from '@/lib/config-db.mjs';
import { premiere, requete } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Diagnostic de mise en production : GET /api/sante
// Indique si la base répond et quelles variables sont définies, sans jamais
// renvoyer de secret (oui/non pour les variables, code d'erreur et mode de connexion).

// Tout ce que le code attend de la base. Une migration oubliée se voit ici
// plutôt que sous la forme d'un 500 sur la page qui utilise la table.
const TABLES_ATTENDUES = [
  'entrees', 'formes', 'sens', 'exemples', 'synonymes', 'locutions', 'fr_termes', 'fr_renvois',
  'quotidien', 'suggestions', 'access_requests', 'partners', 'api_keys', 'api_requests',
  'api_usage_daily', 'auth_tokens', 'terms_acceptances',
];
const COLONNES_ATTENDUES = [
  ['suggestions', 'consent_license'],
  ['suggestions', 'consent_at'],
  ['partners', 'export_autorise'],
  ['exemples', 'sens_id'],
];

export async function GET() {
  const variables = Object.fromEntries(
    ['DATABASE_URL', 'DB_SOCKET', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'SESSION_SECRET', 'SMTP_HOST'].map((nom) => [
      nom,
      Boolean(process.env[nom]),
    ]),
  );

  try {
    const { mots } = await premiere('SELECT COUNT(*) AS mots FROM entrees');

    const presentes = new Set(
      (await requete('SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE()')).map((l) =>
        String(l.t).toLowerCase(),
      ),
    );
    const tablesManquantes = TABLES_ATTENDUES.filter((t) => !presentes.has(t));

    const colonnes = new Set(
      (
        await requete(
          'SELECT CONCAT(table_name, ".", column_name) AS c FROM information_schema.columns WHERE table_schema = DATABASE()',
        )
      ).map((l) => String(l.c).toLowerCase()),
    );
    const colonnesManquantes = COLONNES_ATTENDUES.filter(
      ([table, colonne]) => presentes.has(table) && !colonnes.has(`${table}.${colonne}`),
    ).map(([table, colonne]) => `${table}.${colonne}`);

    const aJour = tablesManquantes.length === 0 && colonnesManquantes.length === 0;
    return Response.json(
      {
        ok: aJour,
        base: 'connectée',
        mots,
        schema: aJour ? 'à jour' : 'incomplet',
        ...(aJour ? {} : { tablesManquantes, colonnesManquantes, conseil: 'Lancez « npm run db:init » (sans --ecraser) pour appliquer les migrations.' }),
        variables,
      },
      { status: aJour ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (erreur) {
    const connexion = descriptionConnexion();
    console.error(`[sante] Base de données indisponible (${connexion}) :`, erreur.code ?? '', erreur.message);
    return Response.json(
      {
        ok: false,
        base: 'erreur',
        code: erreur.code ?? erreur.name ?? 'inconnu',
        ...(erreur.code === 'ER_NO_SUCH_TABLE'
          ? { conseil: `Table manquante (${erreur.sqlMessage ?? ''}) : lancez « npm run db:init » sans --ecraser.` }
          : {}),
        connexion,
        ...(erreur.address ? { adresseEssayee: `${erreur.address}${erreur.port ? `:${erreur.port}` : ''}` } : {}),
        variables,
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
