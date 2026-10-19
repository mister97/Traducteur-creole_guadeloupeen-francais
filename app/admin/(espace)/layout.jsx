import Link from 'next/link';
import NavAdmin from '@/components/admin/NavAdmin';
import { exigerAdmin } from '@/lib/auth';
import { compterDemandes } from '@/lib/acces';
import { compterSuggestions } from '@/lib/suggestions';
import { deconnexion } from '../actions';

export default async function EspaceAdminLayout({ children }) {
  const moi = await exigerAdmin();
  const [{ en_attente: enAttente }, demandes] = await Promise.all([compterSuggestions(), compterDemandes()]);

  return (
    <div className="admin">
      <aside className="admin__barre">
        <Link href="/admin" className="admin__marque">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-header.png" alt="" />
          <span>
            Chalviraj
            <small>Administration</small>
          </span>
        </Link>
        <NavAdmin enAttente={enAttente} demandesEnAttente={demandes.pending} proprietaire={moi.role === 'proprietaire'} />
        <div className="admin__bas">
          <Link href="/admin/compte" className="admin__lien admin__moi">
            <strong>{moi.name}</strong>
            <small>{moi.role === 'proprietaire' ? 'Propriétaire' : 'Éditeur'}</small>
          </Link>
          <Link href="/" className="admin__lien" target="_blank">
            Voir le site ↗
          </Link>
          <form action={deconnexion}>
            <button type="submit" className="admin__lien">
              Déconnexion
            </button>
          </form>
        </div>
      </aside>
      <main className="admin__contenu">{children}</main>
    </div>
  );
}
