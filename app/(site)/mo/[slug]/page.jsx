import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import BoutonPartage from '@/components/BoutonPartage';
import { IconeCrayon } from '@/components/Icones';
import { ficheParSlug } from '@/lib/dico';
import { textes } from '@/lib/langue';
import { lettreDe, lettreValide } from '@/lib/alphabet';
import { rechercheKreyol } from '@/lib/normalisation.mjs';
import { SITE_URL } from '@/lib/site';
import { f } from '@/lib/textes';

// cache() : une seule lecture en base pour generateMetadata et la page
const ficheEnCache = cache((slug) => ficheParSlug(slug));

async function chargerFiche(params) {
  const { slug } = await params;
  return ficheEnCache(decodeURIComponent(slug));
}

export async function generateMetadata({ params }) {
  const fiche = await chargerFiche(params);
  if (!fiche) return {};
  const { t } = await textes();
  const resume = fiche.sens.map((s) => s.traduction).join(' ; ');
  const description = f(t.fiche.metaDescription, { mot: fiche.mot, sens: resume }).slice(0, 300);
  return {
    title: f(t.fiche.metaTitre, { mot: fiche.mot }),
    description,
    alternates: { canonical: `/mo/${fiche.slug}` },
    openGraph: { title: fiche.mot, description, url: `/mo/${fiche.slug}` },
  };
}

function Synonyme({ s }) {
  return s.slug ? (
    <Link className="puce" href={`/mo/${s.slug}`}>
      {s.mot}
    </Link>
  ) : (
    <span className="puce">{s.mot}</span>
  );
}

export default async function PageMot({ params }) {
  const fiche = await chargerFiche(params);
  if (!fiche) notFound();
  const { t } = await textes();
  const lettre = lettreDe(rechercheKreyol(fiche.mot));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: fiche.mot,
    inLanguage: 'gcf',
    description: fiche.sens.map((s) => s.traduction).join(' ; '),
    url: `${SITE_URL}/mo/${fiche.slug}`,
    inDefinedTermSet: { '@type': 'DefinedTermSet', name: 'Mofwazé', url: SITE_URL },
  };

  return (
    <div className="conteneur">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <div className="fiche">
        <article>
          <ol className="fil">
            <li>
              <Link href="/">{t.nav.accueil}</Link>
            </li>
            {lettreValide(lettre) && (
              <li>
                <Link href={`/lettre/${lettre}`}>{lettre.toUpperCase()}</Link>
              </li>
            )}
            <li aria-current="page">{fiche.mot}</li>
          </ol>

          <h1 className="fiche__mot">{fiche.mot}</h1>
          {fiche.variantes.length > 0 && (
            <p className="fiche__variantes">
              {t.fiche.variantes} : <strong>{fiche.variantes.join(', ')}</strong>
            </p>
          )}

          <h2 className="fiche__section-titre">{t.fiche.traductions}</h2>
          {fiche.sens.length > 0 ? (
            <ol className="sens-detail">
              {fiche.sens.map((s) => (
                <li key={s.num}>
                  <span className="sens-num">{s.num}</span>
                  <div>
                    {s.traduction && <p className="sens-detail__traduction">{s.traduction}</p>}
                    {s.exemples.length > 0 && (
                      <ul className="exemples" aria-label={t.fiche.exemples}>
                        {s.exemples.map((ex, i) => (
                          <li key={i}>
                            <span className="exemples__kr" lang="gcf">
                              {ex.kr}
                            </span>
                            {ex.fr && (
                              <span className="exemples__fr" lang="fr">
                                {ex.fr}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    {s.synonymes.length > 0 && (
                      <div className="sens-detail__ligne">
                        <span className="sens-detail__libelle">{t.fiche.synonymes}</span>
                        <div className="puces">
                          {s.synonymes.map((sy, i) => (
                            <Synonyme key={i} s={sy} />
                          ))}
                        </div>
                      </div>
                    )}
                    {s.termes.length > 0 && (
                      <div className="sens-detail__ligne">
                        <span className="sens-detail__libelle">{t.fiche.termesFr}</span>
                        <div className="puces">
                          {s.termes.map((terme) => (
                            <Link key={terme.slug} className="puce puce--fr" href={`/fr/${terme.slug}`}>
                              {terme.terme}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p>{t.fiche.pasDeTraduction}</p>
          )}

          {fiche.locutions.length > 0 && (
            <>
              <h2 className="fiche__section-titre">{t.fiche.locutions}</h2>
              {fiche.locutions.map((l, i) => (
                <div key={i} className="locution">
                  <div className="locution__expression">{l.expression}</div>
                  {l.traduction && <div className="locution__traduction">{l.traduction}</div>}
                  {l.exemple_kr && (
                    <p className="locution__exemple">
                      « {l.exemple_kr} »{l.exemple_fr && <span>{l.exemple_fr}</span>}
                    </p>
                  )}
                </div>
              ))}
            </>
          )}

          {fiche.voirAussi.length > 0 && (
            <>
              <h2 className="fiche__section-titre">{t.fiche.voirAussi}</h2>
              <div className="puces">
                {fiche.voirAussi.map((v) => (
                  <Synonyme key={v.slug} s={v} />
                ))}
              </div>
            </>
          )}
        </article>

        <aside className="fiche__aside">
          <div className="carte carte-proposer">
            <h2>{t.fiche.proposer}</h2>
            <p>{t.fiche.proposerTexte}</p>
            <Link href={`/proposer?mot=${encodeURIComponent(fiche.slug)}`} className="bouton bouton--corail bouton--bloc">
              <IconeCrayon taille={18} /> {t.fiche.proposer}
            </Link>
          </div>
          <BoutonPartage titre={`${fiche.mot} – Mofwazé`} libelle={t.fiche.partager} confirmation={t.fiche.lienCopie} />
          <nav className="voisins" aria-label={`${t.fiche.precedent} / ${t.fiche.suivant}`}>
            {fiche.precedent ? (
              <Link href={`/mo/${fiche.precedent.slug}`} rel="prev">
                <small>← {t.fiche.precedent}</small>
                <strong>{fiche.precedent.mot}</strong>
              </Link>
            ) : (
              <span />
            )}
            {fiche.suivant ? (
              <Link href={`/mo/${fiche.suivant.slug}`} className="voisins__suivant" rel="next">
                <small>{t.fiche.suivant} →</small>
                <strong>{fiche.suivant.mot}</strong>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </aside>
      </div>
    </div>
  );
}
