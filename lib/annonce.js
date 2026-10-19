// Annonce du changement de nom : « Mofwazé » est devenu « Chalviraj ».
// Affichée une seule fois par navigateur, et seulement jusqu'à la date fixée —
// passé un certain temps, l'ancien nom n'est plus qu'un souvenir et le rappel
// devient du bruit.
//
// Réglage par la variable FIN_ANNONCE_NOM (date ISO) :
//   FIN_ANNONCE_NOM=2027-04-30
// Non définie ou vide : aucune annonce. Rien ne s'affiche par défaut.

export const ANCIEN_NOM = 'Mofwazé Kréyòl Gwadloupéyen';
export const ANCIEN_DOMAINE = 'mofwazajkreyolgwadloupeyen.fr';

export function annonceActive(maintenant = Date.now()) {
  const valeur = (process.env.FIN_ANNONCE_NOM ?? '').trim();
  if (!valeur) return false;
  const t = Date.parse(valeur);
  if (Number.isNaN(t)) {
    console.warn(`[annonce] FIN_ANNONCE_NOM illisible (${valeur}) : annonce ignorée.`);
    return false;
  }
  return maintenant < t;
}
