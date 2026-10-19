// Partie du cookie d'administration lisible sans accès à la base, pour proxy.js.
// La vérification qui fait foi est dans lib/comptes-admin.js (signature HMAC
// liée au compte et à son mot de passe) : ce fichier ne sert qu'à éviter un
// aller-retour inutile vers la base pour un visiteur qui n'a aucun cookie.

export const COOKIE_ADMIN = 'chalviraj_admin';
export const DUREE_SESSION = 7 * 24 * 3600; // secondes

// Forme attendue : « id.expiration.aléa.signature ». Ne prouve rien : un cookie
// bricolé passe ici et sera rejeté par utilisateurConnecte().
export function cookiePlausible(valeur) {
  if (!valeur) return false;
  const parties = String(valeur).split('.');
  if (parties.length !== 4 || parties.some((p) => !p)) return false;
  const [id, expiration] = parties;
  return /^\d+$/.test(id) && /^\d+$/.test(expiration) && Number(expiration) > Date.now();
}
