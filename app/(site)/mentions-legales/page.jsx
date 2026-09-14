import Link from 'next/link';
import ValeurLegale from '@/components/ValeurLegale';
import { formaterJour } from '@/lib/dates';
import { textes } from '@/lib/langue';
import { MENTIONS } from '@/lib/mentions';
import { CONTACT_EMAIL, SITE_URL } from '@/lib/site';

export const metadata = {
  title: 'Mentions légales',
  alternates: { canonical: '/mentions-legales' },
};

export default async function MentionsLegales() {
  const { t } = await textes();
  const { editeur, hebergeur, administrationServeur, credits } = MENTIONS;
  const domaine = new URL(SITE_URL).host;

  return (
    <div className="conteneur conteneur--etroit texte-page" lang="fr">
      <header className="page-entete">
        <h1 className="page-titre">Mentions légales</h1>
        <p className="page-intro">Dernière mise à jour : {formaterJour(MENTIONS.miseAJour, 'fr', { annee: true })}</p>
        {t.legal.noteFrancais && (
          <p className="alerte alerte--info" lang="gcf">
            {t.legal.noteFrancais}
          </p>
        )}
      </header>

      <h2>Éditeur du site</h2>
      <p>
        Le site {domaine} (« Mofwazé ») est édité par <ValeurLegale valeur={editeur.nom} />
        {editeur.adresse !== null && (
          <>
            , <ValeurLegale valeur={editeur.adresse} />
          </>
        )}
        .
      </p>
      <p>
        Contact :{' '}
        <a className="lien" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
      </p>

      <h2>Directeur de la publication</h2>
      <p>
        <ValeurLegale valeur={MENTIONS.directeurPublication} />
      </p>

      <h2>Hébergement</h2>
      <p>
        Le site est hébergé par <ValeurLegale valeur={hebergeur.nom} />, <ValeurLegale valeur={hebergeur.adresse} />, téléphone :{' '}
        <ValeurLegale valeur={hebergeur.telephone} />
        {hebergeur.site && (
          <>
            {' '}
            (
            <a className="lien" href={hebergeur.site} rel="noopener" target="_blank">
              {hebergeur.site.replace(/^https?:\/\/(www\.)?/, '')}
            </a>
            )
          </>
        )}

        .
      </p>
      {administrationServeur && (
        <p>
          Le serveur est administré par{' '}
          {administrationServeur.site ? (
            <a className="lien" href={administrationServeur.site} rel="noopener" target="_blank">
              {administrationServeur.nom}
            </a>
          ) : (
            administrationServeur.nom
          )}
          .
        </p>
      )}
      <p>La messagerie électronique du site est fournie par {MENTIONS.messagerie}.</p>

      {credits?.length > 0 && (
        <>
          <h2>Réalisation</h2>
          <ul>
            {credits.map((c) => (
              <li key={c.nom}>
                {c.role} :{' '}
                {c.site ? (
                  <a className="lien" href={c.site} rel="noopener" target="_blank">
                    {c.nom}
                  </a>
                ) : (
                  c.nom
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>Propriété intellectuelle</h2>
      <p>
        La structure du site, sa présentation, son logo, les textes de l’interface et, sauf mention contraire, le contenu du
        dictionnaire (mots, traductions, synonymes, expressions et exemples) sont protégés par le droit d’auteur et par le droit des
        producteurs de bases de données. Toute reproduction ou extraction substantielle, notamment automatisée, sans autorisation écrite
        de l’éditeur est interdite.
      </p>
      <p>Les courtes citations sont autorisées à condition d’indiquer la source (« Mofwazé » et l’adresse du site).</p>
      <p>
        L’ouvrage « Dictionnaire Créole Guadeloupéen/Français » (Éditions Orphie, 2013) est cité à titre de référence ; il reste la
        propriété de ses auteurs et de son éditeur.
      </p>

      <h2>Contributions des visiteurs</h2>
      <p>
        En envoyant une proposition (nouveau mot, correction, exemple, remarque) par le{' '}
        <Link className="lien" href="/proposer">
          formulaire
        </Link>
        , le contributeur déclare en être l’auteur ou disposer des droits nécessaires. Il autorise l’éditeur, gratuitement et pour toute
        la durée des droits, à la reproduire, la modifier, l’adapter et la publier dans le dictionnaire.
      </p>
      <p>
        Chaque proposition est relue avant publication ; l’éditeur reste libre de ne pas la retenir. Les noms et adresses e-mail des
        contributeurs ne sont jamais publiés.
      </p>

      <h2>Responsabilité</h2>
      <p>
        Les traductions et informations du dictionnaire sont fournies à titre indicatif. L’éditeur s’efforce de les tenir exactes et à
        jour, sans pouvoir garantir l’absence d’erreurs ou d’omissions. Vous pouvez{' '}
        <Link className="lien" href="/proposer">
          signaler une erreur
        </Link>{' '}
        à tout moment.
      </p>
      <p>
        Le site peut contenir des liens vers d’autres sites, dont l’éditeur ne contrôle pas le contenu et n’assume pas la
        responsabilité.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Les informations sur les données collectées et vos droits figurent dans la{' '}
        <Link className="lien" href="/confidentialite">
          politique de confidentialité
        </Link>
        .
      </p>
    </div>
  );
}
