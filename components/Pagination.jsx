import Link from 'next/link';
import { f } from '@/lib/textes';
import { IconeFlecheDroite, IconeFlecheGauche } from './Icones';

// lien(n) construit l'URL de la page n
export default function Pagination({ page, totalPages, lien, t }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      {page > 1 ? (
        <Link className="bouton bouton--blanc bouton--petit" href={lien(page - 1)} rel="prev">
          <IconeFlecheGauche taille={16} /> {t.pagination.precedent}
        </Link>
      ) : (
        <span />
      )}
      <span className="pagination__page">{f(t.pagination.page, { n: page, total: totalPages })}</span>
      {page < totalPages ? (
        <Link className="bouton bouton--blanc bouton--petit" href={lien(page + 1)} rel="next">
          {t.pagination.suivant} <IconeFlecheDroite taille={16} />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
