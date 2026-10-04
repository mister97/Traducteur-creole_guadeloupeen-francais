import { reponseOptions, VERSION_API } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Sans authentification et sans journalisation (spécification 2.3)
export async function GET() {
  return Response.json(
    { status: 'ok', version: VERSION_API },
    { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } },
  );
}

export async function OPTIONS() {
  return reponseOptions();
}
