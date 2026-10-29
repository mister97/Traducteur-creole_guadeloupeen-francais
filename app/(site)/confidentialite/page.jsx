import Link from 'next/link';
import ValeurLegale from '@/components/ValeurLegale';
import { formaterJour } from '@/lib/dates';
import { textes } from '@/lib/langue';
import { CONSERVATION, MENTIONS } from '@/lib/mentions';
import { CONTACT_FORMULAIRE } from '@/lib/site';

export const metadata = {
  title: 'Politique de confidentialité',
  alternates: { canonical: '/confidentialite' },
};

export default async function Confidentialite() {
  const { t } = await textes();
  const { editeur, hebergeur } = MENTIONS;
  const contact = (
    <Link className="lien" href={CONTACT_FORMULAIRE}>
      le formulaire de contact
    </Link>
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
        Chalviraj ne fait pas de publicité, ne pose aucun cookie de suivi et n’utilise aucun traceur tiers : rien de ce que vous faites ici n’est transmis à Google, à Meta ou à qui que ce soit. Nous comptons en revanche nos visiteurs, nous-mêmes et sans conserver d’adresse IP — comment, c’est expliqué ci-dessous. Cette page explique quelles données sont
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
              <td>Visite d’une page</td>
              <td>
                Un compteur de visiteurs et de pages vues, par jour. Votre adresse IP et votre navigateur sont transformés en une
                empreinte illisible qui <strong>change chaque jour</strong> : elle sert à ne pas vous compter deux fois dans la
                journée, et ne permet pas de savoir si vous étiez déjà venu la veille. L’adresse IP elle-même n’est jamais
                enregistrée, et aucun cookie n’est posé. Les robots d’indexation ne sont pas comptés.
              </td>
              <td>Savoir si le dictionnaire est consulté, et combien</td>
              <td>Intérêt légitime</td>
              <td>
                Empreintes effacées après {CONSERVATION.empreinteIpJours} jours ; seuls les totaux du jour sont conservés
              </td>
            </tr>
            <tr>
              <td>Partie de Mokaché</td>
              <td>
                Des compteurs par jour : parties commencées, terminées, gagnées, et en combien de coups. Aucun identifiant, aucune
                adresse IP, aucun cookie — rien qui permette de savoir qui a joué.
              </td>
              <td>Savoir si le jeu est trop difficile et l’ajuster</td>
              <td>Intérêt légitime</td>
              <td>Conservés sans limite : ce sont des totaux, pas des données personnelles</td>
            </tr>
            <tr>
              <td>Recherche sans résultat</td>
              <td>
                Le mot cherché, quand il ne donne aucun résultat ni en créole ni en français, et le nombre de fois qu’il a été
                demandé. Le mot est conservé, jamais qui l’a cherché.
              </td>
              <td>Savoir quels mots manquent au dictionnaire et les ajouter</td>
              <td>Intérêt légitime</td>
              <td>Jusqu’à ce que le mot soit traité</td>
            </tr>
            <tr>
              <td>Administration du site</td>
              <td>
                Journal des actions des personnes qui gèrent le dictionnaire : nom, adresse e-mail, action effectuée, date,
                empreinte de l’adresse IP. Ne concerne pas les visiteurs.
              </td>
              <td>Savoir qui a modifié quoi, et pouvoir revenir sur une erreur</td>
              <td>Intérêt légitime</td>
              <td>{CONSERVATION.journalAdminMois} mois</td>
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
              <td>Message envoyé par le formulaire de contact</td>
              <td>Votre message, et votre adresse e-mail si vous l’indiquez</td>
              <td>Vous répondre</td>
              <td>Intérêt légitime</td>
              <td>3 ans maximum après le dernier échange</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Les recherches et les essais du jeu Mokaché sont traités par le serveur pour vous répondre, sans être enregistrés en base de
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
                Cookie <code>chalviraj_admin</code>
              </td>
              <td>Session de l’espace d’administration (personnes qui gèrent le dictionnaire uniquement)</td>
              <td>7 jours</td>
            </tr>
            <tr>
              <td>
                Stockage local <code>chalviraj-jeu-…</code>
              </td>
              <td>Vos parties et statistiques de Mokaché : elles restent sur votre appareil et ne nous sont pas envoyées</td>
              <td>Jusqu’à ce que vous effaciez les données du site</td>
            </tr>
            <tr>
              <td>
                Stockage local <code>chalviraj-direction</code>
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
