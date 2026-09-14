import { redirect } from 'next/navigation';
import FormulaireConnexion from '@/components/admin/FormulaireConnexion';
import { estAdmin } from '@/lib/auth';

export const metadata = { title: 'Connexion' };

export default async function PageConnexion() {
  if (await estAdmin()) redirect('/admin');
  return (
    <div className="connexion">
      <div className="carte">
        <div className="admin__marque" style={{ color: 'var(--encre)', padding: '0 0 16px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/logo-header.png" alt="" />
          <span>
            Mofwazé
            <small style={{ color: 'var(--turquoise-fonce)' }}>Administration</small>
          </span>
        </div>
        <FormulaireConnexion />
      </div>
    </div>
  );
}
