import { redirect } from 'next/navigation';
import CadreConnexion from '@/components/partenaire/CadreConnexion';
import { FormulaireConnexionPartenaire } from '@/components/partenaire/FormulairesAuth';
import { partenaireConnecte } from '@/lib/partenaires';

export const metadata = { title: 'Connexion' };

export default async function PageConnexionPartenaire({ searchParams }) {
  if (await partenaireConnecte()) redirect('/partenaire');
  const { nouveau } = await searchParams;

  return (
    <CadreConnexion titre="Connexion">
      {nouveau && (
        <div className="alerte alerte--succes" role="status">
          Mot de passe enregistré. Connectez-vous.
        </div>
      )}
      <FormulaireConnexionPartenaire />
    </CadreConnexion>
  );
}
