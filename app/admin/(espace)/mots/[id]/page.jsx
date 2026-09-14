import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supprimerMot } from '@/app/admin/actions';
import BoutonConfirmation from '@/components/admin/BoutonConfirmation';
import FormulaireMot from '@/components/admin/FormulaireMot';
import { dateHeure } from '@/components/admin/utils';
import { requete } from '@/lib/db';
import { chargerFiche } from '@/lib/fiches';

export const metadata = { title: 'Modifier un mot' };

export default async function PageMot({ params, searchParams }) {
  const { id } = await params;
  const { cree } = await searchParams;
  const entree = await chargerFiche(Number(id));
  if (!entree) notFound();

  const [suggestions, tirages] = await Promise.all([
    requete('SELECT id, type, statut, cree_le FROM suggestions WHERE entree_id = ? ORDER BY cree_le DESC LIMIT 10', [entree.id]),
    requete('SELECT jour, type FROM quotidien WHERE entree_id = ? ORDER BY jour DESC LIMIT 10', [entree.id]),
  ]);

  return (
    <>
      <p className="tableau__discret" style={{ margin: 0 }}>
        <Link className="lien" href="/admin/mots">
          ← Mots
        </Link>
      </p>
      <div className="admin__entete">
        <div>
          <h1 className="admin__titre">{entree.mot}</h1>
          <p className="tableau__discret" style={{ margin: 0 }}>
            Créé {dateHeure(entree.cree_le)} · modifié {dateHeure(entree.modifie_le)} ·{' '}
            <Link className="lien" href={`/mo/${entree.slug}`} target="_blank">
              /mo/{entree.slug} ↗
            </Link>
          </p>
        </div>
      </div>

      {cree && <div className="alerte alerte--succes">Mot créé.</div>}

      <div className="admin-colonnes">
        <FormulaireMot entree={entree} />

        <aside className="admin-aside">
          {suggestions.length > 0 && (
            <section className="carte admin-bloc">
              <h2>Suggestions liées</h2>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {suggestions.map((s) => (
                  <li key={s.id}>
                    <Link className="lien" href={`/admin/suggestions/${s.id}`}>
                      n°{s.id}
                    </Link>{' '}
                    <span className="tableau__discret">
                      {s.statut.replace('_', ' ')} · {dateHeure(s.cree_le)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {tirages.length > 0 && (
            <section className="carte admin-bloc">
              <h2>Tirages</h2>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {tirages.map((x) => (
                  <li key={`${x.jour}-${x.type}`}>
                    {x.jour} · {x.type === 'jeu' ? 'Mo kaché' : 'mot du jour'}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="carte admin-bloc">
            <h2>Supprimer</h2>
            <p className="tableau__discret">Supprime le mot, ses sens, synonymes et expressions.</p>
            <form action={supprimerMot}>
              <input type="hidden" name="id" value={entree.id} />
              <BoutonConfirmation message={`Supprimer définitivement « ${entree.mot} » ?`} className="bouton bouton--danger bouton--bloc">
                Supprimer ce mot
              </BoutonConfirmation>
            </form>
          </section>
        </aside>
      </div>
    </>
  );
}
