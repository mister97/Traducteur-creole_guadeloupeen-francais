import FormulaireSuggestion from '@/components/FormulaireSuggestion';
import { premiere } from '@/lib/db';
import { chargerFiche } from '@/lib/fiches';
import { textes } from '@/lib/langue';
import { CONTACT_EMAIL } from '@/lib/site';

export async function generateMetadata() {
  const { t } = await textes();
  return { title: t.proposer.titre, description: t.proposer.intro, alternates: { canonical: '/proposer' } };
}

export default async function PageProposer({ searchParams }) {
  const { mot, type } = await searchParams;
  const { t } = await textes();

  let entree = null;
  if (mot) {
    const ligne = await premiere('SELECT id FROM entrees WHERE slug = ?', [String(mot)]);
    if (ligne) {
      const complete = await chargerFiche(ligne.id);
      entree = { id: complete.id, slug: complete.slug, mot: complete.mot, fiche: complete.fiche };
    }
  }
  const typeInitial = entree ? 'correction' : ['ajout', 'correction', 'remarque'].includes(type) ? type : 'ajout';

  return (
    <div className="conteneur conteneur--etroit">
      <header className="page-entete">
        <h1 className="page-titre">{t.proposer.titre}</h1>
        <p className="page-intro">{t.proposer.intro}</p>
      </header>
      <div className="carte" style={{ marginTop: 20 }}>
        <FormulaireSuggestion
          key={entree?.slug ?? typeInitial}
          entree={entree}
          typeInitial={typeInitial}
          debut={Date.now()}
          email={CONTACT_EMAIL}
        />
      </div>
    </div>
  );
}
