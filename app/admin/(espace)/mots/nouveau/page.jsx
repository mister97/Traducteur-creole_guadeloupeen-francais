import Link from 'next/link';
import FormulaireMot from '@/components/admin/FormulaireMot';
import { exigerAdmin } from '@/lib/auth';

export const metadata = { title: 'Nouveau mot' };

export default async function PageNouveauMot({ searchParams }) {
  await exigerAdmin();
  const { mot } = await searchParams;
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
      <FormulaireMot motInitial={typeof mot === 'string' ? mot.slice(0, 160) : ''} />
    </>
  );
}
