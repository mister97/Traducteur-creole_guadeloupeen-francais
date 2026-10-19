import Link from 'next/link';
import CadreAdmin from '@/components/admin/CadreAdmin';
import { FormulaireDefinition } from '@/components/admin/FormulairesMotDePasse';
import { utilisateurDuJeton } from '@/lib/comptes-admin';

export const metadata = { title: 'Choisir un mot de passe' };

export default async function PageMotDePasseAdmin({ params }) {
  const { jeton } = await params;
  const invitation = Boolean(await utilisateurDuJeton(jeton, 'invitation'));
  const valide = invitation || Boolean(await utilisateurDuJeton(jeton, 'reset'));

  if (!valide) {
    return (
      <CadreAdmin titre="Lien expiré">
        <div className="alerte alerte--erreur">
          Ce lien a expiré, a déjà été utilisé, ou le compte n’est plus actif.
        </div>
        <p>
          <Link className="bouton bouton--principal bouton--bloc" href="/admin/mot-de-passe-oublie">
            Demander un nouveau lien
          </Link>
        </p>
      </CadreAdmin>
    );
  }

  return (
    <CadreAdmin titre={invitation ? 'Bienvenue' : 'Nouveau mot de passe'}>
      <FormulaireDefinition jeton={jeton} invitation={invitation} />
    </CadreAdmin>
  );
}
