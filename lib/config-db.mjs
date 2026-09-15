// Paramètres de connexion MySQL, lus depuis l'environnement.
// Soit DATABASE_URL=mysql://utilisateur:motdepasse@hote:3306/base
// soit DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME (plus simple dans Plesk).
// DB_SOCKET (ex. /var/run/mysqld/mysqld.sock) force une connexion par socket local :
// utile quand l'utilisateur MySQL n'est autorisé que depuis « localhost ».

export function configConnexion() {
  const commun = {
    charset: 'utf8mb4_unicode_ci',
    dateStrings: true,
    timezone: 'Z',
  };
  if (process.env.DATABASE_URL) {
    return { uri: process.env.DATABASE_URL, ...commun };
  }
  const identifiants = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };
  if (process.env.DB_SOCKET) {
    return { socketPath: process.env.DB_SOCKET, ...identifiants, ...commun };
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    ...identifiants,
    ...commun,
  };
}

// Mode de connexion lisible, sans secret (pour /api/sante et les journaux)
export function descriptionConnexion(config = configConnexion()) {
  if (config.uri) return 'DATABASE_URL';
  if (config.socketPath) return `socket ${config.socketPath}`;
  return `tcp ${config.host}:${config.port}`;
}
