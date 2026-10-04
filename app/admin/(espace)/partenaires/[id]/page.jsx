import Link from 'next/link';
import { notFound } from 'next/navigation';
import { basculerExport, basculerSuspension, renvoyerInvitation, revoquerCleAdmin } from '@/app/admin/actions-partenaires';
import BoutonConfirmation from '@/components/admin/BoutonConfirmation';
import { dateHeure } from '@/components/admin/utils';
import { agregerSiNecessaire } from '@/lib/api-agregation';
import { historiqueAcceptations, TERMS_VERSION } from '@/lib/conditions';
import { listerCles, obtenirPartenaire, usagePartenaire } from '@/lib/partenaires';

export const metadata = { title: 'Partenaire' };

export default async function PagePartenaire({ params, searchParams }) {
  const { id } = await params;
  const p = await searchParams;
  const partenaire = await obtenirPartenaire(Number(id));
  if (!partenaire) notFound();

  await agregerSiNecessaire();
  const [cles, usage, acceptations] = await Promise.all([
    listerCles(partenaire.id),
    usagePartenaire(partenaire.id),
    historiqueAcceptations(partenaire.id),
  ]);
  const totalAppels = usage.reduce((n, l) => n + Number(l.calls), 0);
  const totalErreurs = usage.reduce((n, l) => n + Number(l.errors), 0);
  const retour = `/admin/partenaires/${partenaire.id}`;

  return (
    <>
      <p className="tableau__discret" style={{ margin: 0 }}>
        <Link className="lien" href="/admin/partenaires">
          ← Partenaires
        </Link>
      </p>
      <div className="admin__entete">
        <div>
          <h1 className="admin__titre">{partenaire.name}</h1>
          <p className="tableau__discret" style={{ margin: 0 }}>
            {partenaire.contact_email}
            {partenaire.site_url ? ` · ${partenaire.site_url}` : ''} · compte créé {dateHeure(partenaire.created_at)}
            {partenaire.last_login_at ? ` · dernière connexion ${dateHeure(partenaire.last_login_at)}` : ' · jamais connecté'}
          </p>
        </div>
        {partenaire.suspended_at ? <span className="etat etat--rejetee">suspendu</span> : <span className="etat etat--validee">actif</span>}
      </div>

      {p.revoquee && <div className="alerte alerte--succes">Clé révoquée, le partenaire a été prévenu.</div>}
      {p.invitation && <div className="alerte alerte--succes">Invitation renvoyée.</div>}
      {p.reinitialisation && <div className="alerte alerte--succes">Lien de réinitialisation envoyé.</div>}
      {p.export && <div className="alerte alerte--succes">Autorisation d’export modifiée.</div>}
      {p.statut && <div className="alerte alerte--succes">Statut modifié.</div>}

      <div className="admin-colonnes">
        <div style={{ display: 'grid', gap: 20 }}>
          <section className="carte admin-bloc">
            <h2>Usage des 30 derniers jours</h2>
            {usage.length === 0 ? (
              <p className="tableau__discret">Aucun appel enregistré.</p>
            ) : (
              <>
                <p className="champ__aide">
                  <strong>{totalAppels}</strong> appels, dont <strong>{totalErreurs}</strong> en erreur.
                </p>
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
              </>
            )}
          </section>

          <section className="carte admin-bloc">
            <h2>Clés</h2>
            {cles.length === 0 ? (
              <p className="tableau__discret">Aucune clé créée.</p>
            ) : (
              <div className="tableau-conteneur">
                <table className="tableau">
                  <thead>
                    <tr>
                      <th>Libellé</th>
                      <th>Préfixe</th>
                      <th>Quota</th>
                      <th>Créée</th>
                      <th>Dernier appel</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {cles.map((c) => (
                      <tr key={c.id}>
                        <td>
                          {c.label}
                          {c.revoked_at && <span className="etat etat--rejetee"> révoquée</span>}
                        </td>
                        <td>
                          <code>{c.key_prefix}…</code>
                        </td>
                        <td className="tableau__discret">{c.rate_limit}/min</td>
                        <td className="tableau__discret">{dateHeure(c.created_at)}</td>
                        <td className="tableau__discret">{c.last_used_at ? dateHeure(c.last_used_at) : 'jamais'}</td>
                        <td className="tableau__actions">
                          {!c.revoked_at && (
                            <form action={revoquerCleAdmin}>
                              <input type="hidden" name="partenaire_id" value={partenaire.id} />
                              <input type="hidden" name="cle_id" value={c.id} />
                              <input type="hidden" name="label" value={c.label} />
                              <BoutonConfirmation
                                message={`Révoquer la clé « ${c.label} » ? Les appels cesseront immédiatement et le partenaire sera prévenu.`}
                                className="bouton bouton--danger bouton--petit"
                              >
                                Révoquer
                              </BoutonConfirmation>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="carte admin-bloc">
            <h2>Conditions acceptées</h2>
            {acceptations.length === 0 ? (
              <p className="tableau__discret">
                Aucune acceptation : les clés de ce partenaire renvoient <code>403 terms_not_accepted</code>.
              </p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {acceptations.map((a) => (
                  <li key={`${a.terms_version}-${a.accepted_at}`}>
                    Version {a.terms_version} le {dateHeure(a.accepted_at)}
                    {a.terms_version !== TERMS_VERSION && <span className="tableau__discret"> (version antérieure)</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="admin-aside">
          <section className="carte admin-bloc">
            <h2>Réglages</h2>
            <dl className="meta">
              <dt>Usage</dt>
              <dd>{partenaire.usage_type === 'commercial_autorise' ? 'commercial autorisé' : 'non commercial'}</dd>
              <dt>Mot de passe</dt>
              <dd>{partenaire.password_set_at ? `défini ${dateHeure(partenaire.password_set_at)}` : 'en attente'}</dd>
              <dt>Export complet</dt>
              <dd>{partenaire.export_autorise ? 'autorisé' : 'non autorisé'}</dd>
            </dl>

            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              <form action={basculerExport}>
                <input type="hidden" name="partenaire_id" value={partenaire.id} />
                <input type="hidden" name="retour" value={retour} />
                <button type="submit" className={`bouton bouton--bloc ${partenaire.export_autorise ? 'bouton--danger' : 'bouton--turquoise'}`}>
                  {partenaire.export_autorise ? 'Retirer l’export complet' : 'Autoriser l’export complet'}
                </button>
              </form>

              <form action={renvoyerInvitation}>
                <input type="hidden" name="partenaire_id" value={partenaire.id} />
                <input type="hidden" name="retour" value={retour} />
                <button type="submit" className="bouton bouton--blanc bouton--bloc">
                  {partenaire.password_set_at ? 'Envoyer un lien de réinitialisation' : 'Renvoyer l’invitation'}
                </button>
              </form>

              <form action={basculerSuspension}>
                <input type="hidden" name="partenaire_id" value={partenaire.id} />
                <input type="hidden" name="retour" value={retour} />
                <BoutonConfirmation
                  message={
                    partenaire.suspended_at
                      ? `Rétablir l’accès de ${partenaire.name} ?`
                      : `Suspendre ${partenaire.name} ? Ses clés cesseront de répondre immédiatement.`
                  }
                  className={`bouton bouton--bloc ${partenaire.suspended_at ? 'bouton--turquoise' : 'bouton--danger'}`}
                >
                  {partenaire.suspended_at ? 'Rétablir l’accès' : 'Suspendre l’accès'}
                </BoutonConfirmation>
              </form>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
