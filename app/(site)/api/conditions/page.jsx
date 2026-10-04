import Link from 'next/link';
import { TERMS_VERSION, texteConditions } from '@/lib/conditions';
import { markdownVersHtml } from '@/lib/markdown';

export const metadata = {
  title: 'Conditions d’utilisation de l’API',
  description: 'Conditions d’utilisation de l’API du dictionnaire Chalviraj Kréyòl Gwadloupéyen.',
  alternates: { canonical: '/api/conditions' },
};

export default function PageConditions() {
  return (
    <div className="conteneur conteneur--etroit texte-page" lang="fr">
      <header className="page-entete">
        <p className="tableau__discret" style={{ margin: 0 }}>
          <Link className="lien" href="/api">
            ← Documentation de l’API
          </Link>
        </p>
        <h1 className="page-titre">Conditions d’utilisation de l’API</h1>
        <p className="page-intro">Version en cours : {TERMS_VERSION}</p>
      </header>

      <div dangerouslySetInnerHTML={{ __html: markdownVersHtml(texteConditions()) }} />

      <p className="champ__aide" style={{ marginTop: 32 }}>
        Chaque partenaire accepte ces conditions depuis son espace. Une nouvelle version demande une nouvelle acceptation : la date et
        la version de chaque accord sont conservées.
      </p>
    </div>
  );
}
