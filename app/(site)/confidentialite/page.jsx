import Link from 'next/link';
import ValeurLegale from '@/components/ValeurLegale';
import { formaterJour } from '@/lib/dates';
import { textes } from '@/lib/langue';
import { CONSERVATION, MENTIONS } from '@/lib/mentions';
import { CONTACT_EMAIL } from '@/lib/site';

export const metadata = {
  title: 'Politique de confidentialité',
  alternates: { canonical: '/confidentialite' },
};

export default async function Confidentialite() {
  const { t } = await textes();
  const { editeur, hebergeur } = MENTIONS;
  const contact = (
    <a className="lien" href={`mailto:${CONTACT_EMAIL}`}>
      {CONTACT_EMAIL}
    </a>
  );

  return (
    <div className="conteneur conteneur--etroit texte-page" lang="fr">
      <header className="page-entete">
        <h1 className="page-titre">Politique de confidentialité</h1>
        <p className="page-intro">Dernière mise à jour : {formaterJour(MENTIONS.miseAJour, 'fr', { annee: true })}</p>
        {t.legal.noteFrancais && (
          <p className="alerte alerte--info" lang="gcf">
            {t.legal.noteFrancais}
          </p>
        )}
      </header>

      <p>
        Mofwazé ne fait ni publicité, ni mesure d’audience, et n’utilise aucun traceur tiers. Cette page explique quelles données sont
        traitées quand vous utilisez le site, pourquoi, et comment exercer vos droits.
      </p>

      <h2>Responsable du traitement</h2>
      <p>
        <ValeurLegale valeur={editeur.nom} />, éditeur du site. Contact : {contact}
      </p>

      <h2>Données traitées</h2>
      <div className="tableau-defilant">
        <table className="tableau-legal">
          <thead>
            <tr>
              <th>Quand</th>
              <th>Données</th>
              <th>Pourquoi</th>
              <th>Base légale</th>
              <th>Durée</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Consultation du site</td>
              <td>Journaux techniques du serveur : adresse IP, date, page demandée, navigateur</td>
              <td>Faire fonctionner le site et le protéger des abus</td>
              <td>Intérêt légitime</td>
              <td>{CONSERVATION.journauxMois} mois maximum</td>
            </tr>
            <tr>
              <td>
                Envoi d’une{' '}
                <Link className="lien" href="/proposer">
                  proposition
                </Link>
              </td>
              <td>Contenu proposé et message ; nom et e-mail si vous les indiquez ; langue de l’interface</td>
              <td>Relire et publier la proposition ; vous prévenir de sa publication si vous l’avez demandé</td>
              <td>Intérêt légitime (enrichir le dictionnaire) ; consentement pour l’e-mail de notification</td>
              <td>
                Nom et e-mail : effacés automatiquement {CONSERVATION.contactMoisApresTraitement} mois après le traitement de la
                proposition. Contenu : conservé tant qu’il est utile à la gestion du dictionnaire.
              </td>
            </tr>
            <tr>
              <td>Envoi d’une proposition</td>
              <td>Empreinte chiffrée et non réversible de l’adresse IP</td>
              <td>Limiter le nombre d’envois et bloquer les robots</td>
              <td>Intérêt légitime</td>
              <td>Effacée automatiquement après {CONSERVATION.empreinteIpJours} jours</td>
            </tr>
            <tr>
              <td>Message envoyé à {CONTACT_EMAIL}</td>
              <td>Votre adresse e-mail et le contenu du message</td>
              <td>Vous répondre</td>
              <td>Intérêt légitime</td>
              <td>3 ans maximum après le dernier échange</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Les recherches et les essais du jeu Mo kaché sont traités par le serveur pour vous répondre, sans être enregistrés en base de
        données.
      </p>

      <h2>Cookies et stockage dans votre navigateur</h2>
      <div className="tableau-defilant">
        <table className="tableau-legal">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Rôle</th>
              <th>Durée</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                Cookie <code>langue</code>
              </td>
              <td>Retenir la langue choisie (kréyòl ou français)</td>
              <td>1 an</td>
            </tr>
            <tr>
              <td>
                Cookie <code>mofwaze_admin</code>
              </td>
              <td>Session de l’espace d’administration (administrateurs uniquement)</td>
              <td>7 jours</td>
            </tr>
            <tr>
              <td>
                Stockage local <code>mofwaze-jeu-…</code>
              </td>
              <td>Vos parties et statistiques de Mo kaché : elles restent sur votre appareil et ne nous sont pas envoyées</td>
              <td>Jusqu’à ce que vous effaciez les données du site</td>
            </tr>
            <tr>
              <td>
                Stockage local <code>mofwaze-direction</code>
              </td>
              <td>Dernier sens de recherche utilisé (créole → français ou l’inverse)</td>
              <td>Jusqu’à ce que vous effaciez les données du site</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Ces éléments servent uniquement aux fonctions que vous utilisez ; ils ne demandent donc pas de consentement. Les polices de
        caractères sont hébergées sur notre serveur : aucune donnée n’est transmise à Google ou à un autre service tiers lors de votre
        visite.
      </p>

      <h2>Qui a accès à vos données</h2>
      <p>
        Uniquement les personnes qui administrent le dictionnaire. Vos données ne sont ni vendues ni cédées. Elles passent seulement par
        nos prestataires techniques : l’hébergeur, <ValeurLegale valeur={hebergeur.nom} />
        {MENTIONS.administrationServeur && <>, et {MENTIONS.administrationServeur.nom}, qui administre le serveur</>} ; le fournisseur
        de messagerie, {MENTIONS.messagerie}.
      </p>
      <p>
        <ValeurLegale valeur={MENTIONS.localisationDonnees} />
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous pouvez demander l’accès à vos données, leur rectification ou leur effacement, vous opposer à leur traitement ou en demander
        la limitation, et retirer à tout moment votre accord pour l’e-mail de notification. Écrivez à {contact} ; nous répondons dans un
        délai d’un mois.
      </p>
      <p>
        Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL (
        <a className="lien" href="https://www.cnil.fr/fr/plaintes" rel="noopener noreferrer" target="_blank">
          cnil.fr
        </a>
        ).
      </p>

      <h2>Modifications</h2>
      <p>
        Cette politique peut évoluer, par exemple si le site propose de nouvelles fonctions. La date de dernière mise à jour figure en
        haut de la page. Voir aussi les{' '}
        <Link className="lien" href="/mentions-legales">
          mentions légales
        </Link>
        .
      </p>
    </div>
  );
}
