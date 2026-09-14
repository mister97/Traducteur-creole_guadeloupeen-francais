import Link from 'next/link';
import Pagination from '@/components/Pagination';
import { dateHeure, extrait } from '@/components/admin/utils';
import { FILTRES_MOTS, listerMots } from '@/lib/admin';
import { formaterNombre, TEXTES } from '@/lib/textes';

export const metadata = { title: 'Mots' };
const PAR_PAGE = 50;

export default async function PageMots({ searchParams }) {
  const p = await searchParams;
  const q = String(p.q ?? '').slice(0, 80);
  const filtre = FILTRES_MOTS[p.filtre] ? p.filtre : 'tous';
  const page = Math.max(1, Number.parseInt(p.page, 10) || 1);
  const { total, mots } = await listerMots({ q, filtre, limite: PAR_PAGE, decalage: (page - 1) * PAR_PAGE });
  const lien = (changements) => {
    const params = new URLSearchParams({ ...(q ? { q } : {}), filtre, ...changements });
    if (params.get('filtre') === 'tous') params.delete('filtre');
    if (params.get('page') === '1') params.delete('page');
    return `/admin/mots${params.size ? `?${params}` : ''}`;
  };

  return (
    <>
      <div className="admin__entete">
        <div>
          <h1 className="admin__titre">Mots</h1>
          <p className="admin__sous-titre" style={{ margin: 0 }}>
            {formaterNombre(total)} résultat{total > 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/admin/mots/nouveau" className="bouton bouton--turquoise">
          + Nouveau mot
        </Link>
      </div>

      {p.supprime && <div className="alerte alerte--succes">Mot supprimé.</div>}

      <form className="filtres" action="/admin/mots">
        <input type="search" name="q" defaultValue={q} placeholder="Chercher un mot créole…" className="saisie" />
        <select name="filtre" defaultValue={filtre} className="saisie">
          {Object.entries(FILTRES_MOTS).map(([cle, f]) => (
            <option key={cle} value={cle}>
              {f.libelle}
            </option>
          ))}
        </select>
        <button type="submit" className="bouton bouton--principal bouton--petit">
          Filtrer
        </button>
      </form>

      <div className="tableau-conteneur">
        <table className="tableau">
          <thead>
            <tr>
              <th>Mot</th>
              <th>Sens</th>
              <th>Première traduction</th>
              <th>Modifié</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {mots.map((m) => (
              <tr key={m.id}>
                <td>
                  <Link className="tableau__mot" href={`/admin/mots/${m.id}`}>
                    {m.mot}
                  </Link>
                  {(m.exclu_quotidien > 0 || m.exclu_jeu > 0) && (
                    <span className="tableau__discret" title="Exclu du mot du jour ou du jeu">
                      {' '}
                      ⊘
                    </span>
                  )}
                </td>
                <td>{m.nb_sens}</td>
                <td className="tableau__discret">{extrait(m.premiere_traduction, 90) || '—'}</td>
                <td className="tableau__discret" style={{ whiteSpace: 'nowrap' }}>
                  {dateHeure(m.modifie_le)}
                </td>
                <td className="tableau__actions">
                  <Link className="bouton bouton--blanc bouton--petit" href={`/mo/${m.slug}`} target="_blank">
                    Voir ↗
                  </Link>{' '}
                  <Link className="bouton bouton--principal bouton--petit" href={`/admin/mots/${m.id}`}>
                    Modifier
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={Math.ceil(total / PAR_PAGE)} lien={(n) => lien({ page: String(n) })} t={TEXTES.fr} />
    </>
  );
}
