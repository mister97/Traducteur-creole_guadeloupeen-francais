import { premiere } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Diagnostic de mise en production : GET /api/sante
// Indique si la base répond et quelles variables sont définies, sans jamais
// renvoyer de valeur secrète (seulement des oui/non et le code d'erreur MySQL).
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
    console.error('[sante] Base de données indisponible :', erreur.code ?? '', erreur.message);
    return Response.json(
      { ok: false, base: 'erreur', code: erreur.code ?? erreur.name ?? 'inconnu', variables },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
