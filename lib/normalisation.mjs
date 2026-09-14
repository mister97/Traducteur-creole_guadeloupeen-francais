// Normalisation du texte, partagée entre le site et les scripts de base de données.
// Toute modification ici impose de régénérer les colonnes « recherche ».

export function sansAccents(texte) {
  return String(texte ?? '')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'AE')
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

// Créole : lettres et chiffres collés (« Mèt pyé » → « metpye », « A-A » → « aa »)
export function rechercheKreyol(texte) {
  return sansAccents(texte).toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Français : mots séparés par une espace (« s'habituer » → « s habituer »)
export function rechercheFrancais(texte) {
  return sansAccents(texte)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function slugifier(texte) {
  return (
    sansAccents(texte)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'mo'
  );
}

// Terme français ↔ segment d'URL : « se nourrir » ↔ « se-nourrir »
export function slugFrancais(recherche) {
  return recherche.replace(/ /g, '-');
}

export function rechercheDepuisSlugFrancais(slug) {
  return rechercheFrancais(decodeURIComponent(slug).replace(/-/g, ' '));
}

// Lettres utilisées par le jeu : A à Z uniquement
export function lettresJeu(texte) {
  return sansAccents(texte).toUpperCase().replace(/[^A-Z]/g, '');
}

// Un mot du jeu : un seul mot, sans tiret ni espace, 5 lettres après retrait des accents
export function estMotDeJeu(mot) {
  return /^[\p{L}]+$/u.test(mot) && lettresJeu(mot).length === 5;
}

// Découpe « Nourrir, manger, se nourrir. » en termes français indexables
export function termesDepuisTraduction(traduction) {
  const texte = String(traduction ?? '').trim();
  if (!texte || texte.length > 120) return [];
  return [
    ...new Set(
      texte
        .replace(/\([^)]*\)/g, ' ')
        .split(/[,;]/)
        .map((t) => t.replace(/\s+/g, ' ').replace(/^[\s.:!?]+|[\s.:!?]+$/g, '').trim().toLowerCase())
        .filter((t) => t && t.length <= 60 && rechercheFrancais(t)),
    ),
  ];
}
