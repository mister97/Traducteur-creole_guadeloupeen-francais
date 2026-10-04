// L'espace partenaire réutilise les tableaux et blocs de l'administration
import '../admin/admin.css';
import './partenaire.css';

export const metadata = {
  title: { default: 'Espace partenaire', template: '%s | Espace partenaire Chalviraj' },
  robots: { index: false, follow: false },
};

export default function PartenaireLayout({ children }) {
  return children;
}
