import CadreAdmin from '@/components/admin/CadreAdmin';
import { FormulaireOubli } from '@/components/admin/FormulairesMotDePasse';

export const metadata = { title: 'Mot de passe oublié' };

export default function PageOubli() {
  return (
    <CadreAdmin titre="Mot de passe oublié">
      <FormulaireOubli />
    </CadreAdmin>
  );
}
