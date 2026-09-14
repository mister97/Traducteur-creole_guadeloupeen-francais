import Link from 'next/link';
import { IconeCrayon, IconeFlecheDroite } from '@/components/Icones';
import Recherche from '@/components/Recherche';
import { formaterJour, jourGuadeloupe, numeroJeu } from '@/lib/dates';
import { ficheParId, lettresDisponibles, statistiques } from '@/lib/dico';
import { textes } from '@/lib/langue';
import { tirage } from '@/lib/quotidien';
import { CONTACT_EMAIL } from '@/lib/site';
import { f, formaterNombre } from '@/lib/textes';

export default async function Accueil() {
  const { langue, t } = await textes();
  const jour = jourGuadeloupe();
  const [stats, idMotDuJour, lettres] = await Promise.all([statistiques(), tirage('mot', jour), lettresDisponibles()]);
  const motDuJour = idMotDuJour ? await ficheParId(idMotDuJour) : null;
  const lettresPresentes = new Set(lettres.map((l) => l.lettre));

  return (
    <>
      <section className="hero">
        <div className="hero__deco" aria-hidden="true" />
        <div className="conteneur">
          <div className="hero__contenu">
            <h1 className="hero__titre">{t.accueil.titre}</h1>
            <p className="hero__sous-titre">{t.site.sousTitre}</p>
            <Recherche taille="grande" />
            <p className="hero__stats">
              {f(t.accueil.stats, {
                mots: formaterNombre(stats.mots),
                sens: formaterNombre(stats.sens),
                termes: formaterNombre(stats.termes),
              })}
            </p>
          </div>
        </div>
        <svg className="hero__vague" viewBox="0 0 1440 70" preserveAspectRatio="none" aria-hidden="true">
          <path
            fill="currentColor"
            d="M0 38c120-18 240-27 360-20s240 30 360 30 240-24 360-32 240 2 360 16v38H0Z"
          />
        </svg>
      </section>

      <div className="conteneur">
        <div className="accueil-grille">
          {motDuJour && <MotDuJour mot={motDuJour} jour={jour} langue={langue} t={t} />}

          <section className="carte carte-jeu" aria-labelledby="titre-jeu">
            <span className="etiquette">{f(t.accueil.jeuNumero, { n: numeroJeu(jour) })}</span>
            <div className="tuiles-deco" aria-hidden="true">
              <span className="bon">K</span>
              <span className="absent">A</span>
              <span className="place">C</span>
              <span className="bon">H</span>
              <span className="absent">É</span>
            </div>
            <h2 id="titre-jeu">{t.accueil.jeuTitre}</h2>
            <p>{t.accueil.jeuTexte}</p>
            <Link href="/jeu" className="bouton bouton--blanc">
              {t.accueil.jeuBouton} <IconeFlecheDroite taille={18} />
            </Link>
          </section>
        </div>

        <section className="section" aria-labelledby="titre-alphabet">
          <h2 className="section__titre" id="titre-alphabet">
            {t.accueil.parcourir}
          </h2>
          <nav className="alphabet">
            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) =>
              lettresPresentes.has(l) ? (
                <Link key={l} href={`/lettre/${l.toLowerCase()}`}>
                  {l}
                </Link>
              ) : (
                <span key={l} aria-hidden="true">
                  {l}
                </span>
              ),
            )}
          </nav>
        </section>

        <section className="section bandeau">
          <div>
            <h2>{t.accueil.contribuerTitre}</h2>
            <p>{t.accueil.contribuerTexte}</p>
          </div>
          <div className="bandeau__actions">
            <Link href="/proposer" className="bouton bouton--corail">
              <IconeCrayon taille={18} /> {t.accueil.contribuerBouton}
            </Link>
            <a className="bandeau__email" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </div>
        </section>
      </div>
    </>
  );
}

function MotDuJour({ mot, jour, langue, t }) {
  const sens = mot.sens.filter((s) => s.traduction).slice(0, 3);
  const synonymes = mot.sens.flatMap((s) => s.synonymes).slice(0, 6);
  return (
    <section className="carte" aria-labelledby="titre-mot-du-jour">
      <span className="etiquette">
        <span className="etiquette__point" />
        {t.accueil.motDuJour} · {formaterJour(jour, langue)}
      </span>
      <h2 className="mot-du-jour__mot" id="titre-mot-du-jour">
        <Link href={`/mo/${mot.slug}`}>{mot.mot}</Link>
      </h2>
      {mot.variantes.length > 0 && <p className="mot-du-jour__variantes">{mot.variantes.join(' · ')}</p>}
      <ol className="sens-liste">
        {sens.map((s) => (
          <li key={s.num}>
            <span className="sens-num">{s.num}</span>
            <span>{s.traduction}</span>
          </li>
        ))}
      </ol>
      <div className="mot-du-jour__pied">
        {synonymes.length > 0 ? (
          <div className="puces" aria-label={t.fiche.synonymes}>
            {synonymes.map((s, i) =>
              s.slug ? (
                <Link key={i} className="puce" href={`/mo/${s.slug}`}>
                  {s.mot}
                </Link>
              ) : (
                <span key={i} className="puce">
                  {s.mot}
                </span>
              ),
            )}
          </div>
        ) : (
          <span />
        )}
        <Link href={`/mo/${mot.slug}`} className="bouton bouton--principal bouton--petit">
          {t.accueil.voirFiche} <IconeFlecheDroite taille={16} />
        </Link>
      </div>
    </section>
  );
}
