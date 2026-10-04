import Link from 'next/link';
import { basculerExport, basculerSuspension, rejeterDemande, renvoyerInvitation } from '@/app/admin/actions-partenaires';
import BoutonConfirmation from '@/components/admin/BoutonConfirmation';
import FormulaireApprobation from '@/components/admin/FormulaireApprobation';
import FormulairePartenaire from '@/components/admin/FormulairePartenaire';
import { dateHeure } from '@/components/admin/utils';
import { compterDemandes, listerDemandes } from '@/lib/acces';
import { TERMS_VERSION } from '@/lib/conditions';
import { listerPartenaires, usageTousPartenaires } from '@/lib/partenaires';

export const metadata = { title: 'Partenaires' };

const STATUTS = { pending: 'En attente', approved: 'Approuvées', rejected: 'Rejetées' };

export default async function PagePartenaires({ searchParams }) {
  const p = await searchParams;
  const statut = STATUTS[p.statut_demande] ? p.statut_demande : 'pending';
  const [compte, demandes, partenaires, usage] = await Promise.all([
    compterDemandes(),
    listerDemandes(statut),
    listerPartenaires(),
    usageTousPartenaires(),
  ]);

  return (
    <>
      <h1 className="admin__titre">Partenaires de l’API</h1>
      <p className="admin__sous-titre">
        Les demandes arrivent par le formulaire public. Aucun compte n’est créé automatiquement : vous examinez, puis vous créez le
        partenaire, qui reçoit une invitation pour définir son mot de passe.
      </p>

      {p.cree && <div className="alerte alerte--succes">Compte créé, invitation envoyée.</div>}
      {p.rejetee && <div className="alerte alerte--info">Demande rejetée.</div>}
      {p.invitation && <div className="alerte alerte--succes">Nouvelle invitation envoyée.</div>}
      {p.statut && <div className="alerte alerte--succes">Statut du partenaire modifié.</div>}
      {p.export && <div className="alerte alerte--succes">Autorisation d’export modifiée.</div>}
      {p.reinitialisation && <div className="alerte alerte--succes">Lien de réinitialisation envoyé.</div>}

      <h2 className="section__titre" style={{ fontSize: '1.2rem' }}>
        Demandes d’accès
      </h2>
      <nav className="onglets">
        {Object.entries(STATUTS).map(([cle, libelle]) => (
          <Link key={cle} href={`/admin/partenaires?statut_demande=${cle}`} aria-current={cle === statut ? 'page' : undefined}>
            {libelle} ({compte[cle]})
          </Link>
        ))}
      </nav>

      {demandes.length === 0 ? (
        <div className="carte">
          <p className="tableau__discret" style={{ margin: 0 }}>
            Aucune demande ici.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {demandes.map((d) => (
            <section key={d.id} className="carte admin-bloc">
              <div className="admin__entete" style={{ marginBottom: 10 }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--police-titre)', fontSize: '1.2rem' }}>{d.name}</h3>
                  <p className="tableau__discret" style={{ margin: 0 }}>
                    {d.email}
                    {d.site_url ? ` · ${d.site_url}` : ''} · reçue {dateHeure(d.created_at)}
                  </p>
                </div>
                <span className={`etat etat--${d.non_commercial ? 'ajout' : 'correction'}`}>
                  {d.non_commercial ? 'usage non commercial déclaré' : 'non commercial NON coché'}
                </span>
              </div>
              <p style={{ whiteSpace: 'pre-wrap' }}>{d.usage_desc}</p>

              {statut === 'pending' && (
                <>
                  <FormulaireApprobation demande={d} />
                  <form action={rejeterDemande} style={{ marginTop: 10 }}>
                    <input type="hidden" name="demande_id" value={d.id} />
                    <BoutonConfirmation message="Rejeter cette demande ?" className="bouton bouton--danger bouton--petit">
                      Rejeter
                    </BoutonConfirmation>
                  </form>
                </>
              )}
            </section>
          ))}
        </div>
      )}

      <div className="admin__entete" style={{ marginTop: 36 }}>
        <h2 className="section__titre" style={{ fontSize: '1.2rem', margin: 0 }}>
          Comptes partenaires ({partenaires.length})
        </h2>
        <FormulairePartenaire />
      </div>
      {partenaires.length === 0 ? (
        <div className="carte">
          <p className="tableau__discret" style={{ margin: 0 }}>
            Aucun partenaire pour l’instant.
          </p>
        </div>
      ) : (
        <div className="tableau-conteneur">
          <table className="tableau">
            <thead>
              <tr>
                <th>Partenaire</th>
                <th>Usage</th>
                <th>Mot de passe</th>
                <th>Conditions</th>
                <th>Clés</th>
                <th>Export</th>
                <th>Appels 30 j</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {partenaires.map((x) => (
                <tr key={x.id}>
                  <td>
                    <Link className="tableau__mot" href={`/admin/partenaires/${x.id}`}>
                      {x.name}
                    </Link>
                    <span className="tableau__discret" style={{ display: 'block' }}>
                      {x.contact_email}
                    </span>
                    {x.suspended_at && <span className="etat etat--rejetee">suspendu</span>}
                  </td>
                  <td className="tableau__discret">{x.usage_type === 'commercial_autorise' ? 'commercial autorisé' : 'non commercial'}</td>
                  <td className="tableau__discret">{x.password_set_at ? 'défini' : 'en attente'}</td>
                  <td className="tableau__discret">
                    {x.version_acceptee ? (
                      x.version_acceptee === TERMS_VERSION ? (
                        `v${x.version_acceptee}`
                      ) : (
                        <span className="etat etat--en_attente">v{x.version_acceptee} (ancienne)</span>
                      )
                    ) : (
                      <span className="etat etat--en_attente">non acceptées</span>
                    )}
                  </td>
                  <td>{x.cles_actives}</td>
                  <td>
                    <form action={basculerExport}>
                      <input type="hidden" name="partenaire_id" value={x.id} />
                      <button type="submit" className={`bouton bouton--petit ${x.export_autorise ? 'bouton--turquoise' : 'bouton--blanc'}`}>
                        {x.export_autorise ? 'autorisé' : 'non'}
                      </button>
                    </form>
                  </td>
                  <td className="tableau__discret" style={{ whiteSpace: 'nowrap' }}>
                    {usage.get(x.id)?.appels ?? 0}
                    {usage.get(x.id)?.erreurs > 0 && <span> · {usage.get(x.id).erreurs} err.</span>}
                    <span style={{ display: 'block' }}>{x.dernier_appel ? dateHeure(x.dernier_appel) : 'aucun appel'}</span>
                  </td>
                  <td className="tableau__actions">
                    {!x.password_set_at && (
                      <>
                        <form action={renvoyerInvitation} style={{ display: 'inline' }}>
                          <input type="hidden" name="partenaire_id" value={x.id} />
                          <button type="submit" className="bouton bouton--blanc bouton--petit">
                            Renvoyer l’invitation
                          </button>
                        </form>{' '}
                      </>
                    )}
                    <Link className="bouton bouton--blanc bouton--petit" href={`/admin/partenaires/${x.id}`}>
                      Détail
                    </Link>{' '}
                    <form action={basculerSuspension} style={{ display: 'inline' }}>
                      <input type="hidden" name="partenaire_id" value={x.id} />
                      <BoutonConfirmation
                        message={
                          x.suspended_at
                            ? `Rétablir l’accès de ${x.name} ?`
                            : `Suspendre ${x.name} ? Ses clés cesseront de répondre immédiatement.`
                        }
                        className={`bouton bouton--petit ${x.suspended_at ? 'bouton--turquoise' : 'bouton--danger'}`}
                      >
                        {x.suspended_at ? 'Rétablir' : 'Suspendre'}
                      </BoutonConfirmation>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
