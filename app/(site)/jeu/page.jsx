import Jeu from '@/components/jeu/Jeu';
import { formaterJour, jourGuadeloupe, numeroJeu, prochainMinuit } from '@/lib/dates';
import { textes } from '@/lib/langue';
import { SITE_URL } from '@/lib/site';

export async function generateMetadata() {
  const { t } = await textes();
  return {
    title: `${t.jeu.titre} – ${t.jeu.sousTitre}`,
    description: t.accueil.jeuTexte,
    alternates: { canonical: '/jeu' },
  };
}

export default async function PageJeu() {
  const { langue, t } = await textes();
  const jour = jourGuadeloupe();
  return (
    <div className="conteneur">
      <Jeu jour={jour} dateTexte={formaterJour(jour, langue)} numero={numeroJeu(jour)} finDuJour={prochainMinuit(jour)} urlSite={SITE_URL} t={t.jeu} />
    </div>
  );
}
