# Mofwazé – Kréyòl Gwadloupéyen ↔ Fransé

Dictionnaire créole guadeloupéen ↔ français : https://mofwazajkreyolgwadloupeyen.fr

- recherche créole → français et français → créole, avec autocomplétion ;
- une page par mot (`/mo/manje`) et par terme français (`/fr/manger`) ;
- mot du jour sur l'accueil et jeu quotidien **Mo kaché** (façon Wordle, 5 lettres) ;
- formulaire de suggestion (nouveau mot, correction d'une fiche, remarque) ;
- espace d'administration : validation des suggestions, édition du dictionnaire, termes français, programmation du mot du jour, export Excel/JSON ;
- interface en kréyòl et en français.

Next.js 16 (App Router, `.jsx`), MySQL 8 ou MariaDB 10.6+, envoi de mails par SMTP (OVH).

## Démarrer en local

Prérequis : Node.js 22+ et Docker.

```bash
npm install
docker compose up -d                 # MariaDB locale sur le port 3307
cp .env.example .env.local           # puis adapter (voir ci-dessous)
npm run db:init                      # crée les tables et importe le dictionnaire
npm run dev                          # http://localhost:3000
```

Pour la base Docker, `.env.local` contient :

```
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=dico
DB_PASSWORD=dico
DB_NAME=dico_kreyol
SITE_URL=http://localhost:3000
SESSION_SECRET=une-chaine-aleatoire-d-au-moins-32-caracteres
ADMIN_PASSWORD=un-mot-de-passe-local
```

Sans configuration SMTP, les mails sont affichés dans le terminal au lieu d'être envoyés.

L'administration est sur http://localhost:3000/admin.

## Organisation

| Dossier | Contenu |
| --- | --- |
| `app/(site)/` | pages publiques (accueil, recherche, fiches, jeu, proposer, à propos) |
| `app/admin/` | espace d'administration et ses actions serveur (`actions.js`) |
| `app/api/` | autocomplétion et vérification des essais du jeu |
| `components/` | composants React (recherche, éditeur de fiche, jeu…) |
| `lib/` | accès base (`db.js`), requêtes (`dico.js`, `admin.js`), enregistrement des fiches (`fiches.js`), tirages quotidiens et jeu (`quotidien.js`), mails (`mail.js`), textes de l'interface (`textes.js`) |
| `database/` | `schema.sql`, base SQLite d'origine et données générées pour MySQL |
| `scripts/` | conversion SQLite → MySQL, initialisation de la base, génération du mot de passe admin |

### Modifier les textes de l'interface

Tous les textes publics, en kréyòl et en français, sont dans [`lib/textes.js`](lib/textes.js).

### Base de données

La base MySQL est la source officielle du dictionnaire. Les colonnes `recherche` contiennent une version sans accents ni majuscules du texte (calculée par [`lib/normalisation.mjs`](lib/normalisation.mjs)) : passez toujours par l'admin ou par `lib/fiches.js` pour modifier les données, afin qu'elles restent à jour.

Scripts :

- `npm run db:generer` : régénère `database/donnees.sql(.gz)` depuis `database/dico-kreyol.sqlite` (import initial uniquement) ;
- `npm run db:init` : crée les tables et importe les données si le dictionnaire est vide (`-- --ecraser` pour tout réimporter, suggestions conservées) ;
- `npm run admin:hash -- "mot de passe"` : produit `ADMIN_PASSWORD_HASH` et un `SESSION_SECRET`.

## Mise en production

Voir [DEPLOIEMENT.md](DEPLOIEMENT.md) (VPS Plesk).
