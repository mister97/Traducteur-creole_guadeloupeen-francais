import { donneesExport } from '@/lib/admin';
import { estAdmin } from '@/lib/auth';
import { jourGuadeloupe } from '@/lib/dates';

export async function GET() {
  if (!(await estAdmin())) return new Response('Non autorisé', { status: 401 });
  const entrees = await donneesExport();
  return new Response(JSON.stringify({ exporte_le: new Date().toISOString(), total: entrees.length, entrees }, null, 1), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="mofwaze-${jourGuadeloupe()}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
