import { SITE_URL } from '@/lib/site';

// Lu à chaque requête : SITE_URL vient de l'environnement de production, pas de celui du build
export const dynamic = 'force-dynamic';

export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/recherche'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
