import { cookies } from 'next/headers';
import AnnonceNom from '@/components/AnnonceNom';
import EnTete from '@/components/EnTete';
import PiedDePage from '@/components/PiedDePage';
import { ANCIEN_DOMAINE, ANCIEN_NOM, annonceActive } from '@/lib/annonce';
import { rideauActif } from '@/lib/lancement';
import { textes } from '@/lib/langue';
import { noterVisite } from '@/lib/statistiques';
import { COOKIE_ADMIN } from '@/lib/session';
import { SITE_URL } from '@/lib/site';

export default async function SiteLayout({ children }) {
  // Rappel discret quand le site est encore fermé au public : sans lui, on
  // oublie que les visiteurs ne voient pas la même chose que nous.
  // La présence du cookie suffit ici : la page est de toute façon derrière
  // le rideau de proxy.js, et c'est un simple bandeau, pas un contrôle d'accès.
  let avertir = false;
  if (rideauActif()) {
    avertir = Boolean((await cookies()).get(COOKIE_ADMIN)?.value);
  }
  await noterVisite();
  const { t } = await textes();

  return (
    <>
      {avertir && <div className="bandeau-prelancement">{t.bientot.bandeau}</div>}
      <EnTete />
      <main id="contenu">{children}</main>
      <PiedDePage />
      {annonceActive() && (
        <AnnonceNom
          t={t.annonce}
          ancienNom={ANCIEN_NOM}
          ancienDomaine={ANCIEN_DOMAINE}
          nouveauDomaine={SITE_URL.replace(/^https?:\/\//, '')}
        />
      )}
    </>
  );
}
