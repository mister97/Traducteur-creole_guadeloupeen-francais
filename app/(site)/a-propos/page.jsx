import Link from 'next/link';
import { IconeCrayon } from '@/components/Icones';
import { textes } from '@/lib/langue';
import { CONTACT_EMAIL } from '@/lib/site';

export async function generateMetadata() {
  const { t } = await textes();
  return { title: t.aPropos.titre, alternates: { canonical: '/a-propos' } };
}

export default async function PageAPropos() {
  const { t } = await textes();
  const a = t.aPropos;
  return (
    <div className="conteneur conteneur--etroit texte-page">
      <header className="page-entete">
        <h1 className="page-titre">{a.titre}</h1>
      </header>
      <p className="page-intro" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
        {a.p1}
      </p>
      <p>{a.p2}</p>
      <p>
        {a.p3}{' '}
        <Link className="lien" href="/jeu">
          {t.nav.jeu}
        </Link>
      </p>

      <h2>{a.contribuerTitre}</h2>
      <p>{a.contribuer}</p>
      <p>
        <Link href="/proposer" className="bouton bouton--corail">
          <IconeCrayon taille={18} /> {t.nav.proposer}
        </Link>
      </p>

      <h2>{a.livreTitre}</h2>
      <p>{a.livre}</p>

      <h2>{a.contactTitre}</h2>
      <p>
        <a className="lien" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
      </p>
    </div>
  );
}
