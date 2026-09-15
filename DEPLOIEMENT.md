# Déploiement sur le VPS Plesk

Ce guide met en ligne Mofwazé sur le VPS (Plesk), avec la base MySQL/MariaDB de Plesk et les mails OVH, puis bascule le domaine depuis GitHub Pages.

L'ancien site reste en ligne sur GitHub Pages jusqu'à l'étape 7. Ne fusionnez pas cette branche dans `main` avant, sinon GitHub Pages publierait le code source à la place du site.

## 0. Avant la mise en ligne

- **Mentions légales :** relisez `lib/mentions.js` (éditeur, hébergeur, crédits). Si une valeur est remise à `A_COMPLETER`, les pages `/mentions-legales` et `/confidentialite` l'affichent en rouge et le tableau de bord de l'admin le signale.
- **Journaux du serveur :** vérifiez dans Plesk (Sites Web & Domaines › *domaine* › Journaux › Rotation des journaux) que les journaux ne sont pas conservés plus longtemps que la durée annoncée dans la politique de confidentialité (12 mois, réglable dans `lib/mentions.js`).

## 1. Prérequis Plesk

- L'extension **Node.js** est installée (Extensions › Node.js). Il faut Node.js **20.9 ou plus récent**, idéalement 22 ou 24.
- L'extension **Git** est recommandée pour déployer depuis GitHub.
- Le VPS doit avoir au moins 1,5 Go de mémoire libre pendant `npm run build`.

## 2. Base de données

1. **Créer la base :** Sites Web & Domaines › *domaine* › **Bases de données** › **Ajouter une base de données**.
   - Base : `mofwaze` (MariaDB ou MySQL).
   - Utilisateur : `mofwaze`, avec un mot de passe fort. Notez-le.
2. **Importer les données**, au choix :
   - **phpMyAdmin** (depuis la page de la base) : onglet *Importer*, fichier `database/schema.sql`, puis fichier `database/donnees.sql.gz`. Si le `.gz` n'existe pas sur votre poste, générez-le avec `npm run db:generer`.
   - **Terminal SSH**, une fois l'application en place (étape 4) : `npm run db:init` depuis le dossier de l'application, avec les variables `DB_*` définies.

## 3. Récupérer le code

**Avec Git (recommandé) :** Sites Web & Domaines › *domaine* › **Git**.

1. Dépôt distant : l'URL GitHub du projet, branche `refonte-next` (puis `main` après la bascule).
2. Chemin de déploiement : `/httpdocs`.
3. Mode de déploiement : automatique, avec une notification GitHub (webhook) si vous voulez un déploiement à chaque push.
4. **Actions de déploiement supplémentaires** :
   ```bash
   export PATH=/opt/plesk/node/22/bin:$PATH
   npm ci
   npm run build
   mkdir -p tmp && touch tmp/restart.txt
   ```
   Adaptez `22` à la version de Node choisie. `tmp/restart.txt` redémarre l'application.

**Sans Git :** envoyez les fichiers du projet dans `/httpdocs` (sans `node_modules` ni `.next`).

## 4. Application Node.js

Sites Web & Domaines › *domaine* › **Node.js** :

| Réglage | Valeur |
| --- | --- |
| Version de Node.js | 22.x (ou 24.x) |
| Gestionnaire de paquets | npm |
| Racine du document | `/httpdocs/public` |
| Mode d'application | `production` |
| Racine d'application | `/httpdocs` |
| Fichier de démarrage | `server.js` |

Ajoutez ensuite les **variables d'environnement** (bouton *Variables d'environnement personnalisées*) :

| Variable | Exemple / explication |
| --- | --- |
| `DB_HOST` | `localhost` |
| `DB_PORT` | `3306` |
| `DB_USER` | `mofwaze` |
| `DB_PASSWORD` | le mot de passe de l'étape 2 |
| `DB_NAME` | `mofwaze` |
| `DB_SOCKET` | *facultatif* : `/var/run/mysqld/mysqld.sock` pour se connecter par socket local (remplace `DB_HOST`/`DB_PORT`) si l'utilisateur MySQL n'accepte que « localhost » |
| `SITE_URL` | `https://mofwazajkreyolgwadloupeyen.fr` |
| `CONTACT_EMAIL` | `kontakt@mofwazajkreyolgwadloupeyen.fr` |
| `ADMIN_PASSWORD_HASH` | résultat de `npm run admin:hash -- "votre mot de passe"` (à lancer sur votre poste) |
| `SESSION_SECRET` | également fourni par `admin:hash` (32 caractères minimum) |
| `SMTP_HOST` | `ssl0.ovh.net` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `kontakt@mofwazajkreyolgwadloupeyen.fr` (adresse complète) |
| `SMTP_PASS` | mot de passe de la boîte mail OVH |
| `MAIL_FROM` | `Mofwazé <kontakt@mofwazajkreyolgwadloupeyen.fr>` |
| `ADMIN_EMAIL` | adresse qui reçoit les nouvelles suggestions |

Ensuite :

1. Cliquez sur **Activer Node.js**.
2. Cliquez sur **NPM install**.
3. Lancez **Exécuter le script** › `build`. Refaites-le après chaque mise à jour du code, si vous n'utilisez pas les actions Git.
4. Cliquez sur **Redémarrer l'application**.

Les variables `DB_*` doivent être définies avant de lancer `db:init` (étape 2, option SSH) ou d'ouvrir le site.

## 5. Tester avant de basculer le domaine

Tant que le domaine pointe vers GitHub Pages, testez avec l'une de ces méthodes :

- **Sous-domaine temporaire :** créez par exemple `beta.mofwazajkreyolgwadloupeyen.fr` dans Plesk, avec la même application Node, et un enregistrement DNS `A` chez OVH vers l'IP du VPS.
- **Fichier `hosts` de votre ordinateur :** ajoutez `IP_DU_VPS mofwazajkreyolgwadloupeyen.fr`, testez, puis retirez la ligne.

Commencez par ouvrir **`/api/sante`** : elle doit afficher `"ok": true` et le nombre de mots. Sinon, elle donne le code d'erreur MySQL (voir *Dépannage*) et indique quelles variables d'environnement sont définies.

À vérifier :

- l'accueil affiche le mot du jour ;
- la recherche fonctionne dans les deux sens ;
- une fiche de mot s'ouvre ;
- une partie de Mo kaché se joue ;
- une suggestion envoyée arrive par mail ;
- elle apparaît dans `/admin` et peut être validée.

## 6. HTTPS

Une fois le DNS en place (étape 7) : Sites Web & Domaines › *domaine* › **SSL/TLS** › **Let's Encrypt**, puis activez la redirection HTTP → HTTPS.

## 7. Bascule du domaine

1. **Chez OVH :** Domaines › *mofwazajkreyolgwadloupeyen.fr* › **Zone DNS**.
   - Remplacez les enregistrements `A`/`AAAA` qui pointent vers GitHub (`185.199.108–111.153`) par l'IP du VPS.
   - Faites de même pour `www` (`CNAME` vers le domaine, ou `A` vers le VPS).
   - **Ne touchez pas aux enregistrements `MX`** : les mails restent chez OVH.
2. **Attendez la propagation** (quelques minutes à quelques heures), puis générez le certificat (étape 6).
3. **Sur GitHub :** *Settings › Pages*, désactivez GitHub Pages.
4. **Fusionnez** `refonte-next` dans `main`, et faites pointer le déploiement Git de Plesk sur `main`.

L'ancien site enregistrait un *service worker*. Le nouveau fichier `public/service-worker.js` le désinstalle automatiquement chez les anciens visiteurs.

## Mises à jour

- **Avec les actions Git :** un `git push` suffit.
- **Sinon :** NPM install › Exécuter le script `build` › Redémarrer l'application.

Le dictionnaire lui-même se modifie dans `/admin` : aucune mise en ligne n'est nécessaire.

## Sauvegardes

La base contient désormais tout le dictionnaire et les suggestions :
- activez les **sauvegardes planifiées** de Plesk (Outils & Paramètres › Gestionnaire de sauvegardes), avec la base de données incluse ;
- l'admin propose aussi un export Excel/JSON (`/admin/export`).

## Dépannage

| Symptôme | Piste |
| --- | --- |
| Erreur 500 sur l'accueil et les fiches, mais `/a-propos` fonctionne ; « Minified React error #441 » dans la console | La base ne répond pas. Ouvrez `/api/sante` pour obtenir le code, et consultez les journaux (Sites Web & Domaines › *domaine* › Journaux). |
| `/api/sante` → `ER_ACCESS_DENIED_ERROR` | Mauvais utilisateur ou mot de passe, ou utilisateur limité à « localhost » : essayez `DB_SOCKET=/var/run/mysqld/mysqld.sock` (ou `DB_HOST=127.0.0.1`). |
| `/api/sante` → `ER_BAD_DB_ERROR` | `DB_NAME` ne correspond à aucune base : reprenez le nom exact affiché dans Plesk (souvent préfixé). |
| `/api/sante` → `ER_NO_SUCH_TABLE` | Les tables n'ont pas été importées : étape 2. |
| `/api/sante` → `ECONNREFUSED` / `ENOENT` | Hôte, port ou socket incorrect. |
| Variables affichées `false` dans `/api/sante` | Elles ne sont pas prises en compte : vérifiez leur saisie dans le panneau Node.js puis **Redémarrer l'application**. |
| Images de `/icons/…` en 404 | Apache réserve l'adresse `/icons/` sur le serveur : c'est pourquoi les logos sont dans `public/img/`. N'utilisez pas de dossier `public/icons`. |
| Erreur `SESSION_SECRET doit être défini` | Ajoutez la variable (32 caractères minimum) puis redémarrez. |
| Les mails ne partent pas | Vérifiez `SMTP_USER` (adresse complète) et `SMTP_PASS`. Le port 465 sortant doit être ouvert sur le VPS. Les erreurs apparaissent dans les journaux, la suggestion est tout de même enregistrée. |
| Formulaires admin refusés derrière un proxy (erreur d'origine des *Server Actions*) | Vérifiez que nginx transmet l'en-tête `Host`, ou ajoutez le domaine à `experimental.serverActions.allowedOrigins` dans `next.config.mjs`. |
| `failed to get redirect response … ECONNREFUSED` dans les journaux | Sans gravité : après une action de l'admin, Next n'a pas pu précharger la page suivante (Passenger n'écoute pas sur un port classique). Le navigateur fait la redirection lui-même. |
| Heure du mot du jour décalée | Le jour suit l'heure de Guadeloupe (`lib/dates.js`), indépendamment du fuseau du serveur. |
