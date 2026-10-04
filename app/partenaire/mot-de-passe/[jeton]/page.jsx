import Link from 'next/link';
import CadreConnexion from '@/components/partenaire/CadreConnexion';
import { FormulaireMotDePasse } from '@/components/partenaire/FormulairesAuth';
import { partenaireDuJeton } from '@/lib/partenaires';

export const metadata = { title: 'Choisir un mot de passe' };

export default async function PageMotDePasse({ params }) {
  const { jeton } = await params;
  const invitation = Boolean(await partenaireDuJeton(jeton, 'invitation'));
  const valide = invitation || Boolean(await partenaireDuJeton(jeton, 'reset'));

  if (!valide) {
    return (
      <CadreConnexion titre="Lien expiré">
        <div className="alerte alerte--erreur">Ce lien a expiré ou a déjà été utilisé.</div>
        <p>
          <Link className="bouton bouton--principal bouton--bloc" href="/partenaire/mot-de-passe-oublie">
            Demander un nouveau lien
          </Link>
        </p>
      </CadreConnexion>
    );
  }

  return (
    <CadreConnexion titre={invitation ? 'Bienvenue' : 'Nouveau mot de passe'}>
      <FormulaireMotDePasse jeton={jeton} invitation={invitation} />
    </CadreConnexion>
  );
}
