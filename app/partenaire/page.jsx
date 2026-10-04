import Link from 'next/link';
import { redirect } from 'next/navigation';
import BlocCopiable from '@/components/BlocCopiable';
import { dateHeure } from '@/components/admin/utils';
import AcceptationConditions from '@/components/partenaire/AcceptationConditions';
import GestionCles from '@/components/partenaire/GestionCles';
import { agregerSiNecessaire } from '@/lib/api-agregation';
import { QUOTA_SANS_CLE } from '@/lib/api';
import { aAccepteVersionCourante, derniereAcceptation, TERMS_VERSION, texteConditions } from '@/lib/conditions';
import { LICENCE } from '@/lib/licence';
import { markdownVersHtml } from '@/lib/markdown';
import { CLES_MAX, listerCles, partenaireConnecte, usagePartenaire } from '@/lib/partenaires';
import { SITE_URL } from '@/lib/site';
import { deconnexionPartenaire } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tableau de bord' };

export default async function PagePartenaire({ searchParams }) {
  const partenaire = await partenaireConnecte();
  if (!partenaire) redirect('/partenaire/connexion');
  const { revoquee } = await searchParams;

  const aAccepte = await aAccepteVersionCourante(partenaire.id);

  return (
    <div className="partenaire">
      <header className="partenaire__entete">
        <div className="conteneur">
          <div className="partenaire__rangee">
            <Link href="/partenaire" className="partenaire__marque">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/logo-header.png" alt="" />
              <span>
                Chalviraj
                <small>Espace partenaire</small>
              </span>
            </Link>
            <div className="partenaire__outils">
              <span>{partenaire.name}</span>
              <Link href="/api" className="lien">
                Documentation
              </Link>
              <form action={deconnexionPartenaire}>
                <button type="submit">Déconnexion</button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="partenaire__contenu">
        <div className="conteneur conteneur--etroit">
          {aAccepte ? (
            <Tableau partenaire={partenaire} revoquee={revoquee} />
          ) : (
            <AcceptationConditions
              version={TERMS_VERSION}
              html={markdownVersHtml(texteConditions())}
              nouvelleVersion={Boolean(await derniereAcceptation(partenaire.id))}
            />
          )}
        </div>
      </main>
    </div>
  );
}

async function Tableau({ partenaire, revoquee }) {
  await agregerSiNecessaire();
  const [cles, usage, acceptation] = await Promise.all([
    listerCles(partenaire.id),
    usagePartenaire(partenaire.id),
    derniereAcceptation(partenaire.id),
  ]);
  const totalAppels = usage.reduce((n, l) => n + Number(l.calls), 0);
  const quota = cles.find((c) => !c.revoked_at)?.rate_limit ?? QUOTA_SANS_CLE;

  return (
    <>
      {revoquee && <div className="alerte alerte--succes">Clé révoquée.</div>}

      <GestionCles cles={cles} maximum={CLES_MAX} />

      <section className="carte admin-bloc" style={{ marginTop: 20 }}>
        <h2>Usage des 30 derniers jours</h2>
        <p className="champ__aide">
          Quota en vigueur : <strong>{quota} appels par minute</strong> et par clé. Vous voyez ici exactement ce que nous voyons.
        </p>
        {usage.length === 0 ? (
          <p className="usage-vide">Aucun appel enregistré pour l’instant.</p>
        ) : (
          <div className="tableau-conteneur">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Jour</th>
                  <th>Point d’entrée</th>
                  <th>Appels</th>
                  <th>Erreurs</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((l) => (
                  <tr key={`${l.jour}-${l.endpoint}`}>
                    <td style={{ whiteSpace: 'nowrap' }}>{l.jour}</td>
                    <td>
                      <code>{l.endpoint}</code>
                    </td>
                    <td>{Number(l.calls)}</td>
                    <td className={Number(l.errors) > 0 ? '' : 'tableau__discret'}>{Number(l.errors)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalAppels > 0 && (
          <p className="champ__aide" style={{ marginTop: 10 }}>
            Total sur la période : <strong>{totalAppels}</strong> appels.
          </p>
        )}
      </section>

      <section className="carte admin-bloc" style={{ marginTop: 20 }}>
        <h2>Vos obligations</h2>
        <p>
          Les données sont sous licence <strong>{LICENCE.nom}</strong>. Affichez cette mention à l’endroit où elles apparaissent, et
          pas seulement sur une page de crédits :
        </p>
        <BlocCopiable texte={LICENCE.attribution} libelle="Copier la citation" confirmation="Citation copiée !" />
        <p className="champ__aide">
          Conditions acceptées : version {acceptation?.terms_version} le {dateHeure(acceptation?.accepted_at)} —{' '}
          <Link className="lien" href="/api/conditions" target="_blank">
            relire le texte
          </Link>
          . Détail de la licence sur{' '}
          <Link className="lien" href="/licence" target="_blank">
            la page licence
          </Link>
          .
        </p>
      </section>

      <section className="carte admin-bloc" style={{ marginTop: 20 }}>
        <h2>Export complet</h2>
        {partenaire.export_autorise ? (
          <>
            <p>
              Votre accès permet de récupérer le dictionnaire entier en un appel, par exemple pour une application qui fonctionne hors
              ligne. Deux exports par heure au maximum.
            </p>
            <BlocCopiable texte={`curl -H "X-API-Key: VOTRE_CLÉ" "${SITE_URL}/api/v1/export" -o chalviraj.json`} libelle="Copier" />
            <p className="champ__aide">
              Pensez à vous synchroniser ensuite avec <code>/api/v1/updates?since=…</code> plutôt qu’à réexporter : c’est plus léger
              pour vous comme pour nous, et votre copie reste à jour.
            </p>
          </>
        ) : (
          <p className="tableau__discret">
            L’export complet n’est pas ouvert sur votre compte. Si votre projet en a besoin (application hors ligne, miroir),{' '}
            <Link className="lien" href="/api#demande" target="_blank">
              demandez-le nous
            </Link>
            . En attendant, <code>/api/v1/updates</code> permet de se synchroniser page par page.
          </p>
        )}
      </section>

      <section className="carte admin-bloc" style={{ marginTop: 20 }}>
        <h2>Documentation</h2>
        <p>
          Les quatre points d’entrée, leurs paramètres et des exemples complets sont sur la{' '}
          <Link className="lien" href="/api">
            page API
          </Link>
          . Exemple d’appel avec votre clé :
        </p>
        <BlocCopiable
          texte={`curl -H "X-API-Key: VOTRE_CLÉ" "${SITE_URL}/api/v1/search?q=manjé&from=gcf&limit=5"`}
          libelle="Copier"
        />
      </section>
    </>
  );
}
