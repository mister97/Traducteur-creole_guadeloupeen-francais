import { autocompletion } from '@/lib/dico';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').slice(0, 80);
  const direction = searchParams.get('dir') === 'fr' ? 'fr' : 'kr';
  const propositions = q.trim() ? await autocompletion(q, direction) : [];
  return Response.json(propositions, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  });
}
