import { SITE_URL } from '@/lib/site';

// Lu à chaque requête : SITE_URL vient de l'environnement de production, pas de celui du build
export const dynamic = 'force-dynamic';

// Collecteurs de données pour l'entraînement de modèles : la licence CC BY-NC-SA 4.0
// interdit l'usage commercial, ce qui les exclut (voir aussi public/ai.txt).
const ROBOTS_IA = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'CCBot',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'Google-Extended',
  'PerplexityBot',
  'Bytespider',
  'Applebot-Extended',
  'Meta-ExternalAgent',
  'FacebookBot',
  'Amazonbot',
  'cohere-ai',
  'Diffbot',
  'Omgilibot',
  'ImagesiftBot',
];

export default function robots() {
  return {
    rules: [
      // Moteurs de recherche classiques : indexation normale
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api/v1', '/partenaire', '/recherche'] },
      ...ROBOTS_IA.map((userAgent) => ({ userAgent, disallow: '/' })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
