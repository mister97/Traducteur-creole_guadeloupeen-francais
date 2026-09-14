import Link from 'next/link';
import { notFound } from 'next/navigation';
import CarteMot from '@/components/CarteMot';
import Pagination from '@/components/Pagination';
import { lettresDisponibles, motsParLettre } from '@/lib/dico';
import { textes } from '@/lib/langue';
import { f, formaterNombre } from '@/lib/textes';

const PAR_PAGE = 40;

async function lireParametres(params, searchParams) {
  const { lettre } = await params;
  const { page } = await searchParams;
  const l = String(lettre).toLowerCase();
  return { lettre: /^[a-z]$/.test(l) ? l : null, page: Math.max(1, Number.parseInt(page, 10) || 1) };
}

export async function generateMetadata({ params, searchParams }) {
  const { lettre, page } = await lireParametres(params, searchParams);
  if (!lettre) return {};
  const { t } = await textes();
  const L = lettre.toUpperCase();
  return {
    title: f(t.lettre.titre, { l: L }) + (page > 1 ? ` (${page})` : ''),
    description: f(t.lettre.metaDescription, { l: L }),
    alternates: { canonical: `/lettre/${lettre}${page > 1 ? `?page=${page}` : ''}` },
  };
}

export default async function PageLettre({ params, searchParams }) {
  const { lettre, page } = await lireParametres(params, searchParams);
  if (!lettre) notFound();
  const { t } = await textes();
  const [lettres, { total, resultats }] = await Promise.all([
    lettresDisponibles(),
    motsParLettre(lettre, { limite: PAR_PAGE, decalage: (page - 1) * PAR_PAGE }),
  ]);
  const totalPages = Math.ceil(total / PAR_PAGE);
  if (page > 1 && page > totalPages) notFound();
  const presentes = new Set(lettres.map((l) => l.lettre));
  const L = lettre.toUpperCase();

  return (
    <div className="conteneur conteneur--etroit">
      <header className="page-entete">
        <h1 className="page-titre">{f(t.lettre.titre, { l: L })}</h1>
        <p className="page-intro">{f(t.lettre.compte, { n: formaterNombre(total), l: L })}</p>
        <nav className="alphabet" style={{ marginTop: 20 }}>
          {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((x) =>
            presentes.has(x) ? (
              <Link key={x} href={`/lettre/${x.toLowerCase()}`} aria-current={x === L ? 'page' : undefined}>
                {x}
              </Link>
            ) : (
              <span key={x} aria-hidden="true">
                {x}
              </span>
            ),
          )}
        </nav>
      </header>

      <div className="resultats">
        {resultats.map((mot) => (
          <CarteMot key={mot.id} mot={mot} t={t} maxSens={3} />
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} lien={(n) => `/lettre/${lettre}${n > 1 ? `?page=${n}` : ''}`} t={t} />
    </div>
  );
}
