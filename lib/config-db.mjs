// Paramètres de connexion MySQL, lus depuis l'environnement.
// Soit DATABASE_URL=mysql://utilisateur:motdepasse@hote:3306/base
// soit DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME (plus simple dans Plesk).

export function configConnexion() {
  const commun = {
    charset: 'utf8mb4_unicode_ci',
    dateStrings: true,
    timezone: 'Z',
  };
  if (process.env.DATABASE_URL) {
    return { uri: process.env.DATABASE_URL, ...commun };
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ...commun,
  };
}
