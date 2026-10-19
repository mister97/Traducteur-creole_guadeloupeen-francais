import { donneesExport } from '@/lib/admin';
import { utilisateurConnecte } from '@/lib/auth';
import { journaliser } from '@/lib/journal';
import { jourGuadeloupe } from '@/lib/dates';

export async function GET() {
  if (!(await utilisateurConnecte())) return new Response('Non autorisé', { status: 401 });
  await journaliser('export.json');
  const entrees = await donneesExport();
  return new Response(JSON.stringify({ exporte_le: new Date().toISOString(), total: entrees.length, entrees }, null, 1), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="chalviraj-${jourGuadeloupe()}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
