import { noterVisite } from '@/lib/statistiques';

export const dynamic = 'force-dynamic';

// Comptage d'une visite, appele par le navigateur une fois la page affichee
// (components/CompteurVisite.jsx).
//
// Pourquoi passer par le navigateur plutot que compter au rendu : les robots
// furtifs se font passer pour un navigateur dans leur User-Agent, et le filtre
// serveur ne les distingue pas. En revanche ils n'executent pas le JavaScript
// de la page. Compter ici n'attrape donc que ce qui a reellement ete affiche.
//
// Effet de bord bienvenu : les pages vues deviennent exactes. Au rendu serveur,
// une page deja prechargee par le navigateur n'etait jamais comptee.
export async function POST() {
  await noterVisite();
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
