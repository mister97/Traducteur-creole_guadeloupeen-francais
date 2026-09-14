import Link from 'next/link';
import { textes } from '@/lib/langue';

export default async function PageIntrouvable() {
  const { t } = await textes();
  return (
    <div className="conteneur conteneur--etroit message-vide" style={{ paddingBlock: 80 }}>
      <p className="hero__titre" aria-hidden="true">
        404
      </p>
      <h1 className="page-titre" style={{ marginBottom: 12 }}>
        {t.erreurs.introuvableTitre}
      </h1>
      <p>{t.erreurs.introuvableTexte}</p>
      <Link href="/" className="bouton bouton--principal" style={{ marginTop: 12 }}>
        {t.erreurs.retourAccueil}
      </Link>
    </div>
  );
}
