// Le « jour » du site suit l'heure de Guadeloupe (UTC−4, sans heure d'été).

export const FUSEAU = 'America/Guadeloupe';

// Premier jour du jeu : sert à numéroter les parties (#1, #2…)
export const DEBUT_JEU = '2026-09-14';

export function jourGuadeloupe(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSEAU,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function decalerJour(jour, jours) {
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + jours);
  return d.toISOString().slice(0, 10);
}

export function ecartJours(de, a) {
  return Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86400000);
}

export function numeroJeu(jour) {
  return Math.max(1, ecartJours(DEBUT_JEU, jour) + 1);
}

// Minuit en Guadeloupe = 04:00 UTC
export function prochainMinuit(jour) {
  return Date.parse(`${decalerJour(jour, 1)}T04:00:00Z`);
}

const MOIS_KREYOL = ['janvyé', 'févriyé', 'maws', 'avril', 'mé', 'jwen', 'juiyé', 'out', 'sèptanm', 'oktòb', 'novanm', 'désanm'];

// « 14 sèktanm » / « 14 septembre » (avec l'année si demandé)
export function formaterJour(jour, langue, { annee = false } = {}) {
  const [a, m, j] = jour.split('-').map(Number);
  if (langue === 'kr') return `${j} ${MOIS_KREYOL[m - 1]}${annee ? ` ${a}` : ''}`;
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    ...(annee ? { year: 'numeric' } : {}),
  }).format(new Date(`${jour}T12:00:00Z`));
}
