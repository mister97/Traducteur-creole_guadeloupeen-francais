import { basculerSuspensionUtilisateur, modifierRole, retirerUtilisateur } from '@/app/admin/actions-comptes';
import BoutonConfirmation from '@/components/admin/BoutonConfirmation';
import FormulaireUtilisateur from '@/components/admin/FormulaireUtilisateur';
import LienRegenere from '@/components/admin/LienRegenere';
import { dateHeure } from '@/components/admin/utils';
import { exigerProprietaire } from '@/lib/auth';
import { listerUtilisateurs, ROLES } from '@/lib/comptes-admin';

export const metadata = { title: 'Comptes' };

export default async function PageUtilisateurs({ searchParams }) {
  const moi = await exigerProprietaire();
  const p = await searchParams;
  const utilisateurs = await listerUtilisateurs();

  const MESSAGES = {
    role: 'Rôle modifié.',
    suspendu: 'Compte suspendu : la personne ne peut plus se connecter.',
    reactive: 'Compte réactivé.',
    supprime: 'Compte supprimé. Ses actions restent dans le journal.',
  };

  return (
    <>
      <h1 className="admin__titre">Comptes d’administration</h1>
      <p className="admin__sous-titre">
        Chaque personne a son propre compte : les actions sont enregistrées à son nom dans le{' '}
        <a className="lien" href="/admin/journal">
          journal
        </a>
        . Un compte suspendu ou supprimé perd l’accès immédiatement.
      </p>

      {p.ok && MESSAGES[p.ok] && <div className="alerte alerte--succes">{MESSAGES[p.ok]}</div>}
      {p.erreur && <div className="alerte alerte--erreur">{p.erreur === 'introuvable' ? 'Compte introuvable.' : p.erreur}</div>}

      <div className="admin__entete" style={{ marginBottom: 16 }}>
        <h2 className="section__titre" style={{ fontSize: '1.2rem', margin: 0 }}>
          {utilisateurs.length} compte{utilisateurs.length > 1 ? 's' : ''}
        </h2>
        <FormulaireUtilisateur />
      </div>

      <div className="tableau-conteneur">
        <table className="tableau">
          <thead>
            <tr>
              <th>Personne</th>
              <th>Rôle</th>
              <th>État</th>
              <th>Dernière connexion</th>
              <th>Dernière action</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {utilisateurs.map((u) => {
              const soi = u.id === moi.id;
              const suspendu = Boolean(u.suspended_at) || !u.is_active;
              return (
                <tr key={u.id}>
                  <td>
                    <span className="tableau__mot">{u.name}</span>
                    {soi && <span className="etat etat--validee"> vous</span>}
                    <span className="tableau__discret" style={{ display: 'block' }}>
                      {u.email}
                    </span>
                    {u.cree_par && <span className="tableau__discret">invité par {u.cree_par}</span>}
                  </td>
                  <td>
                    <form action={modifierRole}>
                      <input type="hidden" name="id" value={u.id} />
                      <select name="role" defaultValue={u.role} className="saisie saisie--compacte" disabled={soi}>
                        {Object.entries(ROLES).map(([cle, libelle]) => (
                          <option key={cle} value={cle}>
                            {libelle}
                          </option>
                        ))}
                      </select>{' '}
                      {!soi && (
                        <button type="submit" className="bouton bouton--blanc bouton--petit">
                          Appliquer
                        </button>
                      )}
                    </form>
                  </td>
                  <td className="tableau__discret">
                    {suspendu ? (
                      <span className="etat etat--rejetee">suspendu</span>
                    ) : !u.password_hash ? (
                      <span className="etat etat--en_attente">
                        {u.invitation_en_cours > 0 ? 'invitation en cours' : 'invitation expirée'}
                      </span>
                    ) : (
                      <span className="etat etat--validee">actif</span>
                    )}
                  </td>
                  <td className="tableau__discret">{u.last_login_at ? dateHeure(u.last_login_at) : 'jamais'}</td>
                  <td className="tableau__discret">{u.derniere_action ? dateHeure(u.derniere_action) : '—'}</td>
                  <td className="tableau__actions">
                    <LienRegenere id={u.id} nom={u.name} premiere={!u.password_hash} />{' '}
                    {!soi && (
                      <>
                        <form action={basculerSuspensionUtilisateur} style={{ display: 'inline' }}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="suspendre" value={suspendu ? '0' : '1'} />
                          <BoutonConfirmation
                            message={suspendu ? `Réactiver le compte de ${u.name} ?` : `Suspendre le compte de ${u.name} ?`}
                            className="bouton bouton--blanc bouton--petit"
                          >
                            {suspendu ? 'Réactiver' : 'Suspendre'}
                          </BoutonConfirmation>
                        </form>{' '}
                        <form action={retirerUtilisateur} style={{ display: 'inline' }}>
                          <input type="hidden" name="id" value={u.id} />
                          <BoutonConfirmation
                            message={`Supprimer définitivement le compte de ${u.name} ? Ses actions resteront dans le journal.`}
                            className="bouton bouton--danger bouton--petit"
                          >
                            Supprimer
                          </BoutonConfirmation>
                        </form>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="carte admin-bloc" style={{ marginTop: 28 }}>
        <h2>Ce que chaque rôle peut faire</h2>
        <ul>
          <li>
            <strong>Éditeur</strong> : dictionnaire, suggestions, mot du jour, partenaires de l’API, exports.
          </li>
          <li>
            <strong>Propriétaire</strong> : tout cela, plus la création, la suspension et la suppression des comptes.
          </li>
        </ul>
        <p className="tableau__discret">
          Le dernier propriétaire actif ne peut être ni rétrogradé, ni suspendu, ni supprimé : sans lui, plus personne ne pourrait
          gérer les comptes.
        </p>
      </section>
    </>
  );
}
