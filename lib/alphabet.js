// Alphabet du dictionnaire. En créole, « C » n'existe pas seul : on range les mots
// sous « CH ». Les lettres sans aucun mot (C, Q, X…) s'affichent grisées.

export const ALPHABET = [
  'A', 'B', 'C', 'CH', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
];

const LETTRES_DOUBLES = ALPHABET.filter((l) => l.length > 1).map((l) => l.toLowerCase());

// Lettre de rangement d'un texte déjà normalisé (« chache » → « ch », « manje » → « m »)
export function lettreDe(recherche) {
  const texte = String(recherche ?? '').toLowerCase();
  return LETTRES_DOUBLES.find((d) => texte.startsWith(d)) ?? texte.charAt(0);
}

export function lettreValide(slug) {
  return ALPHABET.some((l) => l.toLowerCase() === String(slug).toLowerCase());
}

// Condition SQL (sur une colonne « recherche ») pour les mots rangés sous une lettre
export function conditionLettre(lettre, colonne = 'recherche') {
  const l = lettre.toLowerCase();
  const doublesCommencantPar = LETTRES_DOUBLES.filter((d) => d !== l && d.startsWith(l));
  return {
    sql: [`${colonne} LIKE ?`, ...doublesCommencantPar.map(() => `${colonne} NOT LIKE ?`)].join(' AND '),
    params: [`${l}%`, ...doublesCommencantPar.map((d) => `${d}%`)],
  };
}
