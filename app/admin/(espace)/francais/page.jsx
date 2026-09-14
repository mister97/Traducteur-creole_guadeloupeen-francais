import Link from 'next/link';
import { effacerTerme } from '@/app/admin/actions';
import BoutonConfirmation from '@/components/admin/BoutonConfirmation';
import LigneTerme from '@/components/admin/LigneTerme';
import Pagination from '@/components/Pagination';
import { listerTermes } from '@/lib/admin';
import { slugFrancais } from '@/lib/normalisation.mjs';
import { formaterNombre, TEXTES } from '@/lib/textes';

export const metadata = { title: 'Termes français' };
const PAR_PAGE = 50;

export default async function PageTermes({ searchParams }) {
  const p = await searchParams;
  const q = String(p.q ?? '').slice(0, 80);
  const page = Math.max(1, Number.parseInt(p.page, 10) || 1);
  const { total, termes } = await listerTermes({ q, limite: PAR_PAGE, decalage: (page - 1) * PAR_PAGE });
  const retour = `/admin/francais?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page) })}`;

  return (
    <>
      <h1 className="admin__titre">Termes français</h1>
      <p className="admin__sous-titre">
        Index de la recherche français → créole ({formaterNombre(total)} termes). Les termes se rattachent aux sens depuis la fiche de
        chaque mot ; ici vous pouvez corriger l’orthographe (deux termes identiques sont fusionnés) ou supprimer un terme.
      </p>

      <form className="filtres" action="/admin/francais">
        <input type="search" name="q" defaultValue={q} placeholder="Chercher un terme…" className="saisie" />
        <button type="submit" className="bouton bouton--principal bouton--petit">
          Chercher
        </button>
      </form>

      <div className="tableau-conteneur">
        <table className="tableau">
          <thead>
            <tr>
              <th>Terme</th>
              <th>Mots créoles</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {termes.map((t) => (
              <tr key={t.id}>
                <td>
                  <LigneTerme terme={t} />
                </td>
                <td className="tableau__discret">{t.mots}</td>
                <td className="tableau__actions">
                  <Link className="bouton bouton--blanc bouton--petit" href={`/fr/${slugFrancais(t.recherche)}`} target="_blank">
                    Voir ↗
                  </Link>{' '}
                  <form action={effacerTerme} style={{ display: 'inline' }}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="retour" value={retour} />
                    <BoutonConfirmation message={`Supprimer le terme « ${t.terme} » ?`} className="bouton bouton--danger bouton--petit">
                      Supprimer
                    </BoutonConfirmation>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={Math.ceil(total / PAR_PAGE)}
        lien={(n) => `/admin/francais?${new URLSearchParams({ ...(q ? { q } : {}), page: String(n) })}`}
        t={TEXTES.fr}
      />
    </>
  );
}
