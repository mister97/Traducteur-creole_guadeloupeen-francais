import Link from 'next/link';
import { dateHeure } from '@/components/admin/utils';
import { exigerAdmin } from '@/lib/auth';
import { listerUtilisateurs } from '@/lib/comptes-admin';
import { FAMILLES, libelleAction, listerJournal } from '@/lib/journal';
import { CONSERVATION } from '@/lib/mentions';

export const metadata = { title: 'Journal' };

const PAR_PAGE = 60;

// Où mène une ligne du journal, quand la cible existe encore
function lienCible(ligne) {
  if (!ligne.cible_id) return null;
  switch (ligne.cible_type) {
    case 'mot':
      return `/admin/mots/${ligne.cible_id}`;
    case 'suggestion':
      return `/admin/suggestions/${ligne.cible_id}`;
    case 'partenaire':
      return `/admin/partenaires/${ligne.cible_id}`;
    default:
      return null;
  }
}

export default async function PageJournal({ searchParams }) {
  await exigerAdmin();
  const p = await searchParams;
  const famille = FAMILLES[p.famille] ? p.famille : '';
  const utilisateur = /^\d+$/.test(p.utilisateur ?? '') ? Number(p.utilisateur) : '';
  const depuis = /^\d{4}-\d{2}-\d{2}$/.test(p.depuis ?? '') ? p.depuis : '';
  const page = Math.max(1, Number(p.page) || 1);

  const [{ total, lignes }, utilisateurs] = await Promise.all([
    listerJournal({ famille, utilisateur, depuis, limite: PAR_PAGE, decalage: (page - 1) * PAR_PAGE }),
    listerUtilisateurs(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAR_PAGE));
  const lien = (modifs) => {
    const params = new URLSearchParams();
    const valeurs = { famille, utilisateur, depuis, ...modifs };
    for (const [cle, valeur] of Object.entries(valeurs)) if (valeur) params.set(cle, String(valeur));
    return `/admin/journal${params.size ? `?${params}` : ''}`;
  };

  return (
    <>
      <h1 className="admin__titre">Journal des actions</h1>
      <p className="admin__sous-titre">
        Qui a fait quoi, et quand. Les modifications et les connexions y sont inscrites automatiquement ; les simples consultations
        n’y figurent pas, à l’exception des exports. Les lignes sont conservées {CONSERVATION.journalAdminMois} mois.
      </p>

      <form className="carte admin-bloc" style={{ marginBottom: 18 }}>
        <div className="grille-filtres">
          <div className="champ" style={{ margin: 0 }}>
            <label htmlFor="f-famille">Type d’action</label>
            <select id="f-famille" name="famille" className="saisie" defaultValue={famille}>
              <option value="">Toutes</option>
              {Object.entries(FAMILLES).map(([cle, f]) => (
                <option key={cle} value={cle}>
                  {f.libelle}
                </option>
              ))}
            </select>
          </div>
          <div className="champ" style={{ margin: 0 }}>
            <label htmlFor="f-utilisateur">Personne</label>
            <select id="f-utilisateur" name="utilisateur" className="saisie" defaultValue={utilisateur}>
              <option value="">Tout le monde</option>
              {utilisateurs.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div className="champ" style={{ margin: 0 }}>
            <label htmlFor="f-depuis">Depuis le</label>
            <input id="f-depuis" name="depuis" type="date" className="saisie" defaultValue={depuis} />
          </div>
          <div style={{ display: 'flex', alignItems: 'end', gap: 8 }}>
            <button type="submit" className="bouton bouton--principal">
              Filtrer
            </button>
            {(famille || utilisateur || depuis) && (
              <Link className="bouton bouton--blanc" href="/admin/journal">
                Effacer
              </Link>
            )}
          </div>
        </div>
      </form>

      <p className="tableau__discret">
        {total} action{total > 1 ? 's' : ''}
        {total > PAR_PAGE ? ` · page ${page} sur ${pages}` : ''}
      </p>

      {lignes.length === 0 ? (
        <div className="carte">
          <p className="tableau__discret" style={{ margin: 0 }}>
            Aucune action ne correspond à ces filtres.
          </p>
        </div>
      ) : (
        <div className="tableau-conteneur">
          <table className="tableau">
            <thead>
              <tr>
                <th>Quand</th>
                <th>Qui</th>
                <th>Action</th>
                <th>Sur quoi</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => {
                const cible = lienCible(l);
                return (
                  <tr key={l.id}>
                    <td className="tableau__discret" style={{ whiteSpace: 'nowrap' }}>
                      {dateHeure(l.created_at)}
                    </td>
                    <td>
                      {l.utilisateur_nom ?? (
                        <span className="tableau__discret" title={l.user_label}>
                          {l.user_label.replace(/^.*<|>$/g, '') || 'inconnu'}
                        </span>
                      )}
                      {!l.user_id && l.utilisateur_nom === undefined && (
                        <span className="tableau__discret" style={{ display: 'block' }}>
                          compte supprimé
                        </span>
                      )}
                    </td>
                    <td>{libelleAction(l.action)}</td>
                    <td className="tableau__discret">
                      {cible ? (
                        <Link className="lien" href={cible}>
                          {l.cible_label ?? `#${l.cible_id}`}
                        </Link>
                      ) : (
                        (l.cible_label ?? '')
                      )}
                      {l.details && <span style={{ display: 'block' }}>{l.details}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav className="pagination" style={{ marginTop: 18 }}>
          {page > 1 && (
            <Link className="bouton bouton--blanc" href={lien({ page: page - 1 > 1 ? page - 1 : '' })}>
              Page précédente
            </Link>
          )}
          {page < pages && (
            <Link className="bouton bouton--blanc" href={lien({ page: page + 1 })}>
              Page suivante
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
