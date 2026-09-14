'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LIENS = [
  { href: '/admin', libelle: 'Tableau de bord', exact: true },
  { href: '/admin/suggestions', libelle: 'Suggestions', badge: true },
  { href: '/admin/mots', libelle: 'Mots' },
  { href: '/admin/francais', libelle: 'Termes français' },
  { href: '/admin/quotidien', libelle: 'Mot du jour & jeu' },
  { href: '/admin/export', libelle: 'Export' },
];

export default function NavAdmin({ enAttente }) {
  const chemin = usePathname();
  return LIENS.map((l) => {
    const actif = l.exact ? chemin === l.href : chemin.startsWith(l.href);
    return (
      <Link key={l.href} href={l.href} className="admin__lien" aria-current={actif ? 'page' : undefined}>
        {l.libelle}
        {l.badge && enAttente > 0 && <span className="admin__badge">{enAttente}</span>}
      </Link>
    );
  });
}
