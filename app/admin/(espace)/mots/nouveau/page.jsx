import Link from 'next/link';
import FormulaireMot from '@/components/admin/FormulaireMot';

export const metadata = { title: 'Nouveau mot' };

export default function PageNouveauMot() {
  return (
    <>
      <p className="tableau__discret" style={{ margin: 0 }}>
        <Link className="lien" href="/admin/mots">
          ← Mots
        </Link>
      </p>
      <h1 className="admin__titre" style={{ marginBottom: 20 }}>
        Nouveau mot
      </h1>
      <FormulaireMot />
    </>
  );
}
