import { Fraunces, Nunito_Sans } from 'next/font/google';
import FournisseurTextes from '@/components/FournisseurTextes';
import { textes } from '@/lib/langue';
import { SITE_URL } from '@/lib/site';
import './globals.css';

// Tout le site lit la base à chaque requête (aucun rendu statique au build)
export const dynamic = 'force-dynamic';

const fraunces = Fraunces({ subsets: ['latin', 'latin-ext'], variable: '--font-fraunces', display: 'swap' });
const nunito = Nunito_Sans({ subsets: ['latin', 'latin-ext'], variable: '--font-nunito', display: 'swap' });

export async function generateMetadata() {
  const { t } = await textes();
  const titre = `${t.site.nom} – ${t.site.sousTitre}`;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: titre, template: `%s | ${t.site.nom}` },
    description: t.site.description,
    applicationName: t.site.nom,
    openGraph: {
      type: 'website',
      locale: 'fr_FR',
      siteName: t.site.nom,
      title: titre,
      description: t.site.description,
      images: [{ url: '/images/social-preview.png', width: 1200, height: 630, alt: titre }],
    },
    twitter: { card: 'summary_large_image', title: titre, description: t.site.description },
    icons: {
      icon: [
        { url: '/img/favicon.ico', sizes: 'any' },
        { url: '/img/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
        { url: '/img/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      ],
      apple: '/img/apple-touch-icon.png',
    },
  };
}

export const viewport = {
  themeColor: '#ffcc00',
};

export default async function RacineLayout({ children }) {
  const { langue, t } = await textes();
  return (
    <html lang={t.htmlLang} className={`${fraunces.variable} ${nunito.variable}`}>
      <body>
        <FournisseurTextes langue={langue} t={t}>
          {children}
        </FournisseurTextes>
      </body>
    </html>
  );
}
