import { lettresDisponibles, tousLesSlugs } from '@/lib/dico';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

// ~19 000 adresses : sous la limite de 50 000 d'un sitemap unique
export default async function sitemap() {
  const [{ mots, termes }, lettres] = await Promise.all([tousLesSlugs(), lettresDisponibles()]);
  const fixes = [
    '',
    '/jeu',
    '/proposer',
    '/a-propos',
    '/mentions-legales',
    '/confidentialite',
    ...lettres.map((l) => `/lettre/${l.lettre.toLowerCase()}`),
  ];
  return [
    ...fixes.map((chemin) => ({ url: `${SITE_URL}${chemin}`, changeFrequency: chemin === '' || chemin === '/jeu' ? 'daily' : 'weekly' })),
    ...mots.map((m) => ({
      url: `${SITE_URL}/mo/${m.slug}`,
      lastModified: m.modifie_le ? new Date(`${m.modifie_le.replace(' ', 'T')}Z`) : undefined,
    })),
    ...termes.map((slug) => ({ url: `${SITE_URL}/fr/${slug}` })),
  ];
}
