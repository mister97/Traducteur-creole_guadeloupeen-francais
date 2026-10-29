import Link from 'next/link';
import { classerRecherche, effacerRecherche } from '@/app/admin/actions-statistiques';
import BoutonConfirmation from '@/components/admin/BoutonConfirmation';
import { dateHeure } from '@/components/admin/utils';
import { exigerAdmin } from '@/lib/auth';
import { formaterJour } from '@/lib/dates';
import { compterRecherchesVides, listerRecherchesVides, purgerEmpreintes, statsJeu, statsVisites } from '@/lib/statistiques';
import { formaterNombre } from '@/lib/textes';

export const metadata = { title: 'Statistiques' };

const pourcent = (n, total) => (total ? Math.min(100, Math.round((n / total) * 100)) : 0);

export default async function PageStatistiques({ searchParams }) {
  await exigerAdmin();
  const p = await searchParams;
  const traite = p.traite === '1';

  await purgerEmpreintes();
  const [visites, { lignes, total }, recherches, compte] = await Promise.all([
    statsVisites({ jours: 30 }),
    statsJeu({ jours: 30 }),
    listerRecherchesVides({ traite, limite: 120 }),
    compterRecherchesVides(),
  ]);

  const maxCoups = Math.max(1, ...Object.values(total.coups));

  return (
    <>
      <h1 className="admin__titre">Statistiques</h1>
      <p className="admin__sous-titre">
        Aucun cookie, aucune adresse IP conservée. Les visiteurs sont comptés par une empreinte qui change chaque jour : on sait
        combien de personnes sont venues aujourd’hui, jamais si l’une d’elles était déjà là hier. Les robots d’indexation sont
        écartés.
      </p>

      {p.ok && <div className="alerte alerte--succes">Enregistré.</div>}

      {/* ------------------------------------------------------------- */}
      <h2 className="section__titre" style={{ fontSize: '1.2rem' }}>
        Fréquentation — 30 derniers jours
      </h2>

      <div className="chiffres">
        <div className="chiffre">
          <strong>{formaterNombre(visites.total.visiteurs)}</strong>
          <span>visiteurs</span>
        </div>
        <div className="chiffre">
          <strong>{formaterNombre(visites.total.pages)}</strong>
          <span>pages vues (au moins)</span>
        </div>
        <div className="chiffre">
          <strong>{visites.total.visiteurs ? (visites.total.pages / visites.total.visiteurs).toFixed(1) : '0'}</strong>
          <span>pages par visiteur</span>
        </div>
        <div className="chiffre">
          <strong>{formaterNombre(Math.round(visites.total.visiteurs / Math.max(1, visites.lignes.length)))}</strong>
          <span>visiteurs par jour</span>
        </div>
      </div>

      <p className="tableau__discret" style={{ marginTop: -6 }}>
        Le nombre de <strong>visiteurs est exact</strong> : l’arrivée sur le site passe toujours par le serveur. Les{' '}
        <strong>pages vues sont un minimum</strong> : quand le navigateur a déjà préchargé une page au survol du lien, l’ouvrir
        ensuite ne redemande rien au serveur. Mieux vaut manquer des pages réellement lues que compter des pages que personne n’a
        ouvertes.
      </p>

      {visites.lignes.length === 0 ? (
        <div className="carte">
          <p className="tableau__discret" style={{ margin: 0 }}>
            Aucune visite enregistrée pour l’instant.
          </p>
        </div>
      ) : (
        <div className="tableau-conteneur">
          <table className="tableau">
            <thead>
              <tr>
                <th>Jour</th>
                <th>Visiteurs</th>
                <th>Pages vues (au moins)</th>
              </tr>
            </thead>
            <tbody>
              {visites.lignes.map((v) => (
                <tr key={v.jour}>
                  <td className="tableau__discret" style={{ whiteSpace: 'nowrap' }}>
                    {formaterJour(v.jour, 'fr', { annee: true })}
                  </td>
                  <td>
                    <strong>{formaterNombre(v.visiteurs)}</strong>
                  </td>
                  <td className="tableau__discret">{formaterNombre(v.pages)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      <h2 className="section__titre" style={{ fontSize: '1.2rem', marginTop: 40 }}>
        Mokaché — 30 derniers jours
      </h2>

      <div className="chiffres">
        <div className="chiffre">
          <strong>{formaterNombre(total.commencees)}</strong>
          <span>parties commencées</span>
        </div>
        <div className="chiffre">
          <strong>{formaterNombre(total.terminees)}</strong>
          <span>parties terminées</span>
        </div>
        <div className="chiffre">
          <strong>{pourcent(total.gagnees, total.terminees)} %</strong>
          <span>de réussite</span>
        </div>
        <div className="chiffre">
          <strong>{pourcent(total.terminees, total.commencees)} %</strong>
          <span>vont au bout</span>
        </div>
      </div>

      <section className="carte admin-bloc" style={{ marginTop: 18 }}>
        <h2>En combien de coups</h2>
        {total.gagnees === 0 ? (
          <p className="tableau__discret">Aucune partie gagnée pour l’instant.</p>
        ) : (
          <ul className="barres">
            {[1, 2, 3, 4, 5, 6].map((c) => (
              <li key={c}>
                <span className="barres__cle">{c}</span>
                <span className="barres__piste">
                  <span className="barres__valeur" style={{ width: total.coups[c] > 0 ? `${Math.max(6, (total.coups[c] / maxCoups) * 100)}%` : 0 }}>
                    {total.coups[c] > 0 ? formaterNombre(total.coups[c]) : ''}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {lignes.length > 0 && (
        <div className="tableau-conteneur" style={{ marginTop: 18 }}>
          <table className="tableau">
            <thead>
              <tr>
                <th>Jour</th>
                <th>Mot</th>
                <th>Commencées</th>
                <th>Terminées</th>
                <th>Gagnées</th>
                <th>Réussite</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((j) => (
                <tr key={j.jour}>
                  <td className="tableau__discret" style={{ whiteSpace: 'nowrap' }}>
                    {formaterJour(j.jour, 'fr', { annee: true })}
                  </td>
                  <td>
                    {j.slug ? (
                      <Link className="tableau__mot" href={`/mo/${j.slug}`} target="_blank">
                        {j.mot}
                      </Link>
                    ) : (
                      <span className="tableau__discret">—</span>
                    )}
                  </td>
                  <td>{formaterNombre(j.commencees)}</td>
                  <td>{formaterNombre(j.terminees)}</td>
                  <td>{formaterNombre(j.gagnees)}</td>
                  <td className="tableau__discret">{pourcent(j.gagnees, j.terminees)} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      <h2 className="section__titre" style={{ fontSize: '1.2rem', marginTop: 40 }}>
        Mots recherchés et absents du dico
      </h2>
      <p className="tableau__discret" style={{ marginTop: -6 }}>
        Recherches restées sans résultat <strong>dans les deux sens</strong> — ni en créole, ni en français. Seul le mot cherché est
        conservé.
      </p>

      <nav className="onglets">
        <Link href="/admin/statistiques" aria-current={!traite ? 'page' : undefined}>
          À traiter ({compte.a_traiter})
        </Link>
        <Link href="/admin/statistiques?traite=1" aria-current={traite ? 'page' : undefined}>
          Classées ({compte.traitees})
        </Link>
      </nav>

      {recherches.length === 0 ? (
        <div className="carte">
          <p className="tableau__discret" style={{ margin: 0 }}>
            {traite ? 'Rien de classé pour l’instant.' : 'Aucune recherche sans résultat pour l’instant.'}
          </p>
        </div>
      ) : (
        <div className="tableau-conteneur">
          <table className="tableau">
            <thead>
              <tr>
                <th>Mot cherché</th>
                <th>Sens</th>
                <th>Fois</th>
                <th>Dernière</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {recherches.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link
                      className="tableau__mot"
                      href={`/recherche?q=${encodeURIComponent(r.terme)}&dir=${r.direction}`}
                      target="_blank"
                    >
                      {r.terme}
                    </Link>
                  </td>
                  <td className="tableau__discret">{r.direction === 'kr' ? 'kréyòl → fransé' : 'français → créole'}</td>
                  <td>
                    <strong>{formaterNombre(r.occurrences)}</strong>
                  </td>
                  <td className="tableau__discret" style={{ whiteSpace: 'nowrap' }}>
                    {dateHeure(r.derniere)}
                  </td>
                  <td className="tableau__actions">
                    <Link className="bouton bouton--turquoise bouton--petit" href={`/admin/mots/nouveau?mot=${encodeURIComponent(r.terme)}`}>
                      Créer la fiche
                    </Link>{' '}
                    <form action={classerRecherche} style={{ display: 'inline' }}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="terme" value={r.terme} />
                      <input type="hidden" name="traite" value={traite ? '0' : '1'} />
                      <input type="hidden" name="retour" value={traite ? '/admin/statistiques?traite=1' : '/admin/statistiques'} />
                      <button type="submit" className="bouton bouton--blanc bouton--petit">
                        {traite ? 'Remettre à traiter' : 'Classer'}
                      </button>
                    </form>{' '}
                    <form action={effacerRecherche} style={{ display: 'inline' }}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="terme" value={r.terme} />
                      <input type="hidden" name="retour" value={traite ? '/admin/statistiques?traite=1' : '/admin/statistiques'} />
                      <BoutonConfirmation message={`Effacer « ${r.terme} » de la liste ?`} className="bouton bouton--danger bouton--petit">
                        Effacer
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
