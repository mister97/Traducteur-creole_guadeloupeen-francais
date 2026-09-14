import Link from 'next/link';
import CarteMot from '@/components/CarteMot';
import { IconeEchange } from '@/components/Icones';
import Pagination from '@/components/Pagination';
import Recherche from '@/components/Recherche';
import Surligne from '@/components/Surligne';
import { compterAutreSens, rechercherFrancais, rechercherKreyol } from '@/lib/dico';
import { textes } from '@/lib/langue';
import { f, formaterNombre } from '@/lib/textes';

const PAR_PAGE = 20;

async function lireParametres(searchParams) {
  const p = await searchParams;
  const q = String(p.q ?? '').slice(0, 80).trim();
  const direction = p.dir === 'fr' ? 'fr' : 'kr';
  const page = Math.max(1, Number.parseInt(p.page, 10) || 1);
  return { q, direction, page };
}

export async function generateMetadata({ searchParams }) {
  const { q } = await lireParametres(searchParams);
  const { t } = await textes();
  return { title: q ? `${t.recherche.titre} : ${q}` : t.recherche.titre, robots: { index: false, follow: true } };
}

export default async function PageRecherche({ searchParams }) {
  const { q, direction, page } = await lireParametres(searchParams);
  const { t } = await textes();
  const options = { limite: PAR_PAGE, decalage: (page - 1) * PAR_PAGE };

  const donnees = q
    ? direction === 'kr'
      ? await rechercherKreyol(q, options)
      : await rechercherFrancais(q, options)
    : null;
  const autreDirection = direction === 'kr' ? 'fr' : 'kr';
  const autres = q && donnees.total === 0 ? await compterAutreSens(q, direction) : 0;
  const totalPages = donnees ? Math.ceil(donnees.total / PAR_PAGE) : 0;
  const lienPage = (n) => `/recherche?q=${encodeURIComponent(q)}&dir=${direction}${n > 1 ? `&page=${n}` : ''}`;

  return (
    <div className="conteneur conteneur--etroit">
      <div className="page-entete">
        <Recherche key={`${q}-${direction}`} valeurInitiale={q} directionInitiale={direction} />
      </div>

      {!q && (
        <div className="message-vide">
          <p>{t.recherche.vide}</p>
        </div>
      )}

      {q && (
        <>
          <h1 className="page-intro" style={{ fontWeight: 800, marginTop: 20 }}>
            {donnees.total === 0
              ? f(t.recherche.aucun, { q })
              : donnees.total === 1
                ? f(t.recherche.resultat, { q })
                : f(t.recherche.resultats, { n: formaterNombre(donnees.total), q })}
          </h1>

          {autres > 0 && (
            <p className="autre-sens">
              <Link className="bouton bouton--turquoise bouton--petit" href={`/recherche?q=${encodeURIComponent(q)}&dir=${autreDirection}`}>
                <IconeEchange taille={16} />
                {f(direction === 'kr' ? t.recherche.essayerAutreSens : t.recherche.essayerAutreSensKr, { q })} ({autres})
              </Link>
            </p>
          )}

          <div className="resultats">
            {direction === 'kr'
              ? donnees.resultats.map((mot) => <CarteMot key={mot.id} mot={mot} recherche={q} t={t} />)
              : donnees.resultats.map((terme) => <GroupeFrancais key={terme.id} terme={terme} recherche={q} t={t} />)}
          </div>

          {direction === 'fr' && donnees.dansTraductions?.length > 0 && (
            <section className="section">
              <h2 className="section__titre">{f(t.recherche.dansTraductions, { q })}</h2>
              <div className="carte groupe-fr">
                <ul className="traductions-mots">
                  {donnees.dansTraductions.map((s) => (
                    <li key={`${s.slug}-${s.num}`}>
                      <Link className="traductions-mots__mot" href={`/mo/${s.slug}`}>
                        {s.mot}
                      </Link>
                      <span className="traductions-mots__sens">
                        <Surligne texte={s.traduction} recherche={q} mode="fr" />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          <Pagination page={page} totalPages={totalPages} lien={lienPage} t={t} />
        </>
      )}
    </div>
  );
}

function GroupeFrancais({ terme, recherche, t }) {
  return (
    <section className="carte groupe-fr">
      <Link href={`/fr/${terme.slug}`} className="groupe-fr__terme">
        <span>
          <Surligne texte={terme.terme} recherche={recherche} mode="fr" />
        </span>
        <small>{t.recherche.termeFrancais}</small>
      </Link>
      <ul className="traductions-mots">
        {terme.mots.map((m) => (
          <li key={m.slug}>
            <Link className="traductions-mots__mot" href={`/mo/${m.slug}`}>
              {m.mot}
            </Link>
            <span className="traductions-mots__sens">{[...new Set(m.sens.map((s) => s.traduction))].join(' ; ')}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
