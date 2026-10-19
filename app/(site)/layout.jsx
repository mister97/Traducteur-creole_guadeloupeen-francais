import { cookies } from 'next/headers';
import EnTete from '@/components/EnTete';
import PiedDePage from '@/components/PiedDePage';
import { rideauActif } from '@/lib/lancement';
import { textes } from '@/lib/langue';
import { COOKIE_ADMIN } from '@/lib/session';

export default async function SiteLayout({ children }) {
  // Rappel discret quand le site est encore fermé au public : sans lui, on
  // oublie que les visiteurs ne voient pas la même chose que nous.
  // La présence du cookie suffit ici : la page est de toute façon derrière
  // le rideau de proxy.js, et c'est un simple bandeau, pas un contrôle d'accès.
  let avertir = false;
  if (rideauActif()) {
    avertir = Boolean((await cookies()).get(COOKIE_ADMIN)?.value);
  }
  const { t } = await textes();

  return (
    <>
      {avertir && <div className="bandeau-prelancement">{t.bientot.bandeau}</div>}
      <EnTete />
      <main id="contenu">{children}</main>
      <PiedDePage />
    </>
  );
}
