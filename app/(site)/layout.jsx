import EnTete from '@/components/EnTete';
import PiedDePage from '@/components/PiedDePage';

export default function SiteLayout({ children }) {
  return (
    <>
      <EnTete />
      <main id="contenu">{children}</main>
      <PiedDePage />
    </>
  );
}
