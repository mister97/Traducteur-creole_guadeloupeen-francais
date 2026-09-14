import Link from 'next/link';
import Pagination from '@/components/Pagination';
import { dateHeure, extrait, libelleStatut, libelleType } from '@/components/admin/utils';
import { TEXTES } from '@/lib/textes';
import { compterSuggestions, listerSuggestions, STATUTS } from '@/lib/suggestions';

export const metadata = { title: 'Suggestions' };
const PAR_PAGE = 30;

export default async function PageSuggestions({ searchParams }) {
  const p = await searchParams;
  const statut = STATUTS.includes(p.statut) ? p.statut : 'en_attente';
  const page = Math.max(1, Number.parseInt(p.page, 10) || 1);
  const [compte, { total, suggestions }] = await Promise.all([
    compterSuggestions(),
    listerSuggestions({ statut, limite: PAR_PAGE, decalage: (page - 1) * PAR_PAGE }),
  ]);

  return (
    <>
      <h1 className="admin__titre">Suggestions</h1>
      <p className="admin__sous-titre">Propositions envoyées depuis le site. Validez-les pour les enregistrer dans le dictionnaire.</p>

      {p.traitee && <div className="alerte alerte--succes">Suggestion n°{p.traitee} traitée.</div>}

      <nav className="onglets">
        {STATUTS.map((s) => (
          <Link key={s} href={`/admin/suggestions?statut=${s}`} aria-current={s === statut ? 'page' : undefined}>
            {libelleStatut(s)} ({compte[s]})
          </Link>
        ))}
      </nav>

      {suggestions.length === 0 ? (
        <div className="carte">
          <p className="tableau__discret" style={{ margin: 0 }}>
            Aucune suggestion ici.
          </p>
        </div>
      ) : (
        <div className="tableau-conteneur">
          <table className="tableau">
            <thead>
              <tr>
                <th>Reçue le</th>
                <th>Type</th>
                <th>Mot</th>
                <th>Message</th>
                <th>De</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {suggestions.map((s) => (
                <tr key={s.id}>
                  <td className="tableau__discret">{dateHeure(s.cree_le)}</td>
                  <td>
                    <span className={`etat etat--${s.type}`}>{libelleType(s.type)}</span>
                  </td>
                  <td>
                    <Link className="tableau__mot" href={`/admin/suggestions/${s.id}`}>
                      {s.mot || s.entree_mot || '—'}
                    </Link>
                  </td>
                  <td className="tableau__discret">{extrait(s.message, 80) || '—'}</td>
                  <td className="tableau__discret">{s.nom || s.email || 'anonyme'}</td>
                  <td className="tableau__actions">
                    <Link className="bouton bouton--blanc bouton--petit" href={`/admin/suggestions/${s.id}`}>
                      {statut === 'en_attente' ? 'Examiner' : 'Voir'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={page}
        totalPages={Math.ceil(total / PAR_PAGE)}
        lien={(n) => `/admin/suggestions?statut=${statut}&page=${n}`}
        t={TEXTES.fr}
      />
    </>
  );
}
