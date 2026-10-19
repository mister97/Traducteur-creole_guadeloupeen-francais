// Rideau d'avant-lancement : le site public est remplacé par un décompte
// tant que la date n'est pas passée. L'administration reste accessible.
//
// Réglage par la variable DATE_LANCEMENT (date ISO avec décalage horaire) :
//   DATE_LANCEMENT=2026-10-28T00:00:00-04:00   (minuit, heure de Guadeloupe)
// Non définie ou vide : aucun rideau. Le site ne se ferme jamais tout seul.
// Une fois la date passée, le rideau se lève sans intervention : inutile de
// retirer la variable, mais vous pouvez le faire pour alléger la config.
//
// Ce fichier est importé par proxy.js : il ne doit dépendre ni de la base,
// ni de next/headers.

export const CHEMIN_RIDEAU = '/bientot';

export function instantLancement() {
  const valeur = (process.env.DATE_LANCEMENT ?? '').trim();
  if (!valeur) return null;
  const t = Date.parse(valeur);
  if (Number.isNaN(t)) {
    console.warn(`[lancement] DATE_LANCEMENT illisible (${valeur}) : rideau ignoré.`);
    return null;
  }
  return t;
}

export function rideauActif(maintenant = Date.now()) {
  const t = instantLancement();
  return t !== null && maintenant < t;
}
