// Licence des données du dictionnaire : valeurs partagées par le site, l'API et les pages légales.

import { SITE_URL } from './site';

export const LICENCE = {
  nom: 'CC BY-NC-SA 4.0',
  nomComplet:
    'Creative Commons Attribution - Pas d’Utilisation Commerciale - Partage dans les Mêmes Conditions 4.0 International',
  resume: 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr',
  texteIntegral: 'https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.fr',
  attribution: 'Chalviraj Kréyòl Gwadloupéyen — https://chalviraj.com — CC BY-NC-SA 4.0',
  source: 'https://chalviraj.com',
};

// Bloc « license » repris à la racine de chaque réponse de l'API
export const BLOC_LICENCE = {
  name: LICENCE.nom,
  url: LICENCE.resume,
  attribution: LICENCE.attribution,
  source: LICENCE.source,
};

export const PAGE_LICENCE = `${SITE_URL}/licence`;
