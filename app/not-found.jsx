import EnTete from '@/components/EnTete';
import PageIntrouvable from '@/components/PageIntrouvable';
import PiedDePage from '@/components/PiedDePage';

// Adresses qui ne correspondent à aucune route : même habillage que le site
export default function IntrouvableGlobal() {
  return (
    <>
      <EnTete />
      <main>
        <PageIntrouvable />
      </main>
      <PiedDePage />
    </>
  );
}
