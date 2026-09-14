import { sansAccents } from './normalisation.mjs';

/**
 * Découpe un texte en segments pour surligner la recherche, sans tenir compte
 * des accents ni de la ponctuation (« manje » surligne « MANJÉ »).
 * mode 'kr' : ignore espaces et tirets ; mode 'fr' : mots séparés.
 * → [{ texte, marque }]
 */
export function segmentsSurlignes(texte, recherche, mode = 'kr') {
  const source = String(texte ?? '');
  const q =
    mode === 'kr'
      ? sansAccents(recherche).toLowerCase().replace(/[^a-z0-9]/g, '')
      : sansAccents(recherche).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!q || !source) return [{ texte: source, marque: false }];

  // Version normalisée + position d'origine de chaque caractère
  let normalise = '';
  const origine = [];
  for (let i = 0; i < source.length; i++) {
    const car = sansAccents(source[i]).toLowerCase();
    for (const c of car) {
      if (/[a-z0-9]/.test(c)) {
        normalise += c;
        origine.push(i);
      } else if (mode === 'fr' && !normalise.endsWith(' ')) {
        normalise += ' ';
        origine.push(i);
      }
    }
  }

  const segments = [];
  let curseur = 0;
  let depart = normalise.indexOf(q);
  while (depart !== -1) {
    const debut = origine[depart];
    const fin = origine[depart + q.length - 1] + 1;
    if (debut > curseur) segments.push({ texte: source.slice(curseur, debut), marque: false });
    segments.push({ texte: source.slice(debut, fin), marque: true });
    curseur = fin;
    depart = normalise.indexOf(q, depart + q.length);
  }
  if (curseur < source.length) segments.push({ texte: source.slice(curseur), marque: false });
  return segments;
}
