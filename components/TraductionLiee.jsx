import Link from 'next/link';
import { rechercheFrancais } from '@/lib/normalisation.mjs';

// La traduction d'un sens, dont chaque mot renvoie vers la liste des mots
// créoles qui le traduisent (/fr/…).
//
// Avant, la traduction était affichée en clair puis répétée en dessous sous
// forme de puces « An fransé » : le lecteur lisait deux fois la même chose
// sans comprendre pourquoi. Les liens sont désormais posés sur la traduction
// elle-même, ce qui dit la même chose une seule fois.

// « Voici, tiens, quel, que (exclamatif) » → les quatre mots, séparateurs gardés,
// la parenthèse laissée hors du lien.
function morceaux(traduction) {
  return String(traduction ?? '')
    .split(/([,;])/)
    .map((brut) => {
      if (brut === ',' || brut === ';') return { separateur: brut };
      const texte = brut.trim();
      if (!texte) return { brut };
      const parenthese = texte.match(/\s*\([^)]*\)\s*$/)?.[0] ?? '';
      const coeur = parenthese ? texte.slice(0, texte.length - parenthese.length).trim() : texte;
      return {
        avant: brut.match(/^\s*/)[0],
        coeur,
        parenthese,
        apres: brut.match(/\s*$/)[0],
      };
    });
}

function indexer(termes) {
  const parRecherche = new Map();
  for (const t of termes ?? []) {
    const cle = rechercheFrancais(t.terme);
    if (cle && !parRecherche.has(cle)) parRecherche.set(cle, t);
  }
  return parRecherche;
}

// Termes ajoutés pour la recherche qui ne figurent pas dans la traduction :
// eux seuls méritent encore une ligne à part.
export function termesEnPlus(traduction, termes = []) {
  const parRecherche = indexer(termes);
  const utilises = new Set();
  for (const m of morceaux(traduction)) {
    if (!m.coeur) continue;
    const t = parRecherche.get(rechercheFrancais(m.coeur));
    if (t) utilises.add(t.slug);
  }
  return termes.filter((t) => !utilises.has(t.slug));
}

export default function TraductionLiee({ traduction, termes = [] }) {
  if (!traduction) return null;
  const parRecherche = indexer(termes);

  return (
    <p className="sens-detail__traduction">
      {morceaux(traduction).map((m, i) => {
        if (m.separateur) return <span key={i}>{m.separateur}</span>;
        if (m.brut !== undefined) return <span key={i}>{m.brut}</span>;

        const terme = parRecherche.get(rechercheFrancais(m.coeur));
        return (
          <span key={i}>
            {m.avant}
            {terme ? (
              <Link className="lien-traduction" href={`/fr/${terme.slug}`}>
                {m.coeur}
              </Link>
            ) : (
              m.coeur
            )}
            {m.parenthese}
            {m.apres}
          </span>
        );
      })}
    </p>
  );
}
