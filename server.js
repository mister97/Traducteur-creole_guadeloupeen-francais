// Point d'entrée de production : « npm start » ou fichier de démarrage dans Plesk (Node.js).
// Lancer « npm run build » avant. Plesk/Passenger fournit lui-même le port.

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const { createServer } = require('node:http');
const next = require('next');

const port = Number.parseInt(process.env.PORT || '3000', 10);
// hostname et port permettent à Next de précharger la page cible après une redirection d'action serveur
const app = next({ dev: false, dir: __dirname, hostname: 'localhost', port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => handle(req, res)).listen(port, () => {
      console.log(`> Mofwazé démarré sur le port ${port}`);
    });
  })
  .catch((erreur) => {
    console.error('Impossible de démarrer Mofwazé :', erreur);
    process.exit(1);
  });
