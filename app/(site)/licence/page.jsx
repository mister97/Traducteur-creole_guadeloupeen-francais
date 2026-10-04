import Link from 'next/link';
import BlocCopiable from '@/components/BlocCopiable';
import FormulaireAcces from '@/components/FormulaireAcces';
import { textes } from '@/lib/langue';
import { LICENCE } from '@/lib/licence';

export const metadata = {
  title: 'Licence des données',
  description:
    'Les données du dictionnaire Chalviraj Kréyòl Gwadloupéyen sont sous licence CC BY-NC-SA 4.0 : qui peut les utiliser, à quelles conditions, et comment citer le projet.',
  alternates: { canonical: '/licence' },
};

export default async function PageLicence() {
  const { t } = await textes();

  return (
    <div className="conteneur conteneur--etroit texte-page" lang="fr">
      <header className="page-entete">
        <h1 className="page-titre">Licence des données</h1>
        <p className="page-intro">
          Les données du dictionnaire sont sous licence <strong>{LICENCE.nom}</strong>. Cette page explique, en français courant, ce
          que cela autorise et ce que cela demande.
        </p>
        {t.legal.noteFrancais && (
          <p className="alerte alerte--info" lang="gcf">
            {t.legal.noteFrancais}
          </p>
        )}
      </header>

      <h2>Qui peut utiliser les données, et à quelles conditions</h2>
      <p>
        Tout le monde : une école, une association, un chercheur, une application, un site. C’est gratuit et il n’y a pas d’autorisation
        à demander, à trois conditions, qui forment la licence {LICENCE.nom} :
      </p>
      <ul>
        <li>
          <strong>Citer le projet</strong> partout où les données sont affichées (voir plus bas).
        </li>
        <li>
          <strong>Ne pas en faire un usage commercial</strong> sans notre accord écrit.
        </li>
        <li>
          <strong>Repartager à l’identique</strong> : tout ce que vous construisez à partir de ces données reste sous la même licence.
        </li>
      </ul>
      <p>
        Le nom complet de la licence est : {LICENCE.nomComplet}. Son{' '}
        <a className="lien" href={LICENCE.resume} rel="license noopener" target="_blank">
          résumé
        </a>{' '}
        et son{' '}
        <a className="lien" href={LICENCE.texteIntegral} rel="license noopener" target="_blank">
          texte intégral
        </a>{' '}
        sont publiés par Creative Commons.
      </p>
      <p>
        Cette licence couvre les <strong>données</strong> : les mots, les traductions, les exemples, les catégories. Le{' '}
        <strong>code</strong> du site, lui, est sous licence MIT.
      </p>

      <h2>Ce que « pas d’utilisation commerciale » veut dire ici</h2>
      <p>Est commercial tout usage tourné vers un gain d’argent. Par exemple :</p>
      <ul>
        <li>revendre les données, en totalité ou en partie ;</li>
        <li>les intégrer à une application, un livre ou un service payant ;</li>
        <li>les utiliser pour entraîner un modèle d’intelligence artificielle exploité commercialement.</li>
      </ul>
      <p>
        En revanche, un site scolaire, un mémoire, une appli gratuite d’apprentissage du créole ou un projet associatif n’ont rien à
        demander.
      </p>
      <p>
        <strong>Pour un usage commercial, écrivez-nous.</strong> Une dérogation est possible, elle est examinée au cas par cas, et elle
        est gratuite dans la plupart des cas : ce qui compte est de savoir qui utilise le créole et comment. Utilisez le formulaire en
        bas de cette page.
      </p>

      <h2>Si vous enrichissez la base à partir de nos données</h2>
      <p>
        Vous corrigez des traductions, vous ajoutez des mots, vous complétez des exemples à partir de notre base ? La licence vous
        demande deux choses :
      </p>
      <ul>
        <li>
          <strong>publier votre version sous la même licence</strong> {LICENCE.nom}, pour que chacun puisse en profiter à son tour ;
        </li>
        <li>
          <strong>indiquer ce que vous avez modifié</strong>, pour qu’on ne confonde pas votre version et la nôtre.
        </li>
      </ul>
      <p>
        Et une chose qui n’est pas une obligation mais qui fait vivre le dictionnaire : renvoyez-nous vos ajouts. Le plus simple est le{' '}
        <Link className="lien" href="/proposer">
          formulaire de proposition
        </Link>
        , ou le formulaire ci-dessous pour un envoi plus volumineux.
      </p>

      <h2>Comment citer le projet</h2>
      <p>
        La mention doit apparaître à l’endroit où les données sont affichées, et pas seulement sur une page de crédits. Voici la ligne à
        reprendre telle quelle :
      </p>
      <BlocCopiable texte={LICENCE.attribution} libelle="Copier la citation" confirmation="Citation copiée !" />
      <p>
        Le lien vers le site doit être cliquable. Si votre support ne permet pas de lien, écrivez l’adresse en toutes lettres. Les
        réponses de notre{' '}
        <Link className="lien" href="/api">
          API
        </Link>{' '}
        contiennent cette ligne dans chaque réponse, pour qu’elle ne se perde pas en route.
      </p>

      <h2>Nous écrire</h2>
      <p>
        Demande d’usage commercial, demande de dérogation, signalement d’une réutilisation sans citation, ou demande d’accès à l’API :
        ce formulaire arrive directement chez nous.
      </p>
      <FormulaireAcces debut={Date.now()} />
    </div>
  );
}
