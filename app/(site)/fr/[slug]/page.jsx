import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { termeFrancais } from '@/lib/dico';
import { textes } from '@/lib/langue';
import { rechercheDepuisSlugFrancais } from '@/lib/normalisation.mjs';
import { f } from '@/lib/textes';

const termeEnCache = cache((recherche) => termeFrancais(recherche));

async function chargerTerme(params) {
  const { slug } = await params;
  return termeEnCache(rechercheDepuisSlugFrancais(slug));
}

export async function generateMetadata({ params }) {
  const terme = await chargerTerme(params);
  if (!terme) return {};
  const { t } = await textes();
  return {
    title: f(t.francais.titre, { terme: terme.terme }),
    description: f(t.francais.metaDescription, { terme: terme.terme, mots: terme.mots.map((m) => m.mot).join(', ') }).slice(0, 300),
    alternates: { canonical: `/fr/${terme.slug}` },
  };
}

export default async function PageTermeFrancais({ params }) {
  const terme = await chargerTerme(params);
  if (!terme) notFound();
  const { t } = await textes();

  return (
    <div className="conteneur conteneur--etroit">
      <header className="page-entete">
        <ol className="fil">
          <li>
            <Link href="/">{t.nav.accueil}</Link>
          </li>
          <li>
            <Link href={`/recherche?q=${encodeURIComponent(terme.terme)}&dir=fr`}>{t.recherche.frKr}</Link>
          </li>
        </ol>
        <h1 className="page-titre">{f(t.francais.titre, { terme: terme.terme })}</h1>
        <p className="page-intro">{f(t.francais.intro, { terme: terme.terme })}</p>
      </header>

      <div className="resultats">
        {terme.mots.map((m) => (
          <Link key={m.slug} href={`/mo/${m.slug}`} className="carte resultat">
            <div className="resultat__tete">
              <h2 className="resultat__mot">{m.mot}</h2>
            </div>
            <ol className="sens-liste sens-liste--compacte">
              {m.sens.map((s) => (
                <li key={s.num}>
                  <span className="sens-num">{s.num}</span>
                  <span>
                    {s.traduction}
                    {s.synonymes?.length > 0 && (
                      <span className="resultat__syn">
                        {' '}
                        — {t.fiche.synonymes} : {s.synonymes.map((sy) => sy.mot).join(', ')}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </Link>
        ))}
      </div>
    </div>
  );
}
