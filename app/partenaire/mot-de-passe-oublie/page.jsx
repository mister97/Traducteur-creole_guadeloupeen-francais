import CadreConnexion from '@/components/partenaire/CadreConnexion';
import { FormulaireOubli } from '@/components/partenaire/FormulairesAuth';

export const metadata = { title: 'Mot de passe oublié' };

export default function PageOubli() {
  return (
    <CadreConnexion titre="Mot de passe oublié">
      <FormulaireOubli />
    </CadreConnexion>
  );
}
