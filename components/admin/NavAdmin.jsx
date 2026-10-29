'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LIENS = [
  { href: '/admin', libelle: 'Tableau de bord', exact: true },
  { href: '/admin/suggestions', libelle: 'Suggestions', badge: true },
  { href: '/admin/mots', libelle: 'Mots' },
  { href: '/admin/francais', libelle: 'Termes français' },
  { href: '/admin/quotidien', libelle: 'Mot du jour & jeu' },
  { href: '/admin/partenaires', libelle: 'Partenaires', badgeDemandes: true },
  { href: '/admin/export', libelle: 'Export' },
  { href: '/admin/statistiques', libelle: 'Statistiques', badgeLacunes: true },
  { href: '/admin/journal', libelle: 'Journal' },
  { href: '/admin/utilisateurs', libelle: 'Comptes', proprietaire: true },
];

export default function NavAdmin({ enAttente, demandesEnAttente, lacunes, proprietaire }) {
  const chemin = usePathname();
  return LIENS.filter((l) => !l.proprietaire || proprietaire).map((l) => {
    const actif = l.exact ? chemin === l.href : chemin.startsWith(l.href);
    const compte = (l.badge && enAttente) || (l.badgeDemandes && demandesEnAttente) || (l.badgeLacunes && lacunes) || 0;
    return (
      <Link key={l.href} href={l.href} className="admin__lien" aria-current={actif ? 'page' : undefined}>
        {l.libelle}
        {compte > 0 && <span className="admin__badge">{compte}</span>}
      </Link>
    );
  });
}
