import { FormulaireChangement } from '@/components/admin/FormulairesMotDePasse';
import { dateHeure } from '@/components/admin/utils';
import { exigerAdmin } from '@/lib/auth';
import { ROLES } from '@/lib/comptes-admin';
import { listerJournal } from '@/lib/journal';
import { libelleAction } from '@/lib/journal';

export const metadata = { title: 'Mon compte' };

export default async function PageCompte() {
  const moi = await exigerAdmin();
  const { lignes } = await listerJournal({ utilisateur: moi.id, limite: 15 });

  return (
    <>
      <h1 className="admin__titre">Mon compte</h1>
      <p className="admin__sous-titre">
        {moi.name} · {moi.email} · {ROLES[moi.role]}
      </p>

      <div className="grille-deux">
        <FormulaireChangement />

        <section className="carte admin-bloc">
          <h2>Mes dernières actions</h2>
          <p className="tableau__discret">
            Dernière connexion : {moi.last_login_at ? dateHeure(moi.last_login_at) : 'inconnue'}. Si vous ne reconnaissez pas une
            ligne, changez votre mot de passe : toutes vos sessions seront fermées.
          </p>
          {lignes.length === 0 ? (
            <p className="tableau__discret">Aucune action enregistrée pour l’instant.</p>
          ) : (
            <ul className="liste-journal">
              {lignes.map((l) => (
                <li key={l.id}>
                  <span className="tableau__discret">{dateHeure(l.created_at)}</span> — {libelleAction(l.action)}
                  {l.cible_label ? ` : ${l.cible_label}` : ''}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
