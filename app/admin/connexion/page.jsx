import { redirect } from 'next/navigation';
import CadreAdmin from '@/components/admin/CadreAdmin';
import FormulaireConnexion from '@/components/admin/FormulaireConnexion';
import { estAdmin } from '@/lib/auth';

export const metadata = { title: 'Connexion' };

export default async function PageConnexion() {
  if (await estAdmin()) redirect('/admin');
  return (
    <CadreAdmin>
      <FormulaireConnexion />
    </CadreAdmin>
  );
}
