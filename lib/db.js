import mysql from 'mysql2/promise';
import { configConnexion } from './config-db.mjs';

// Un seul pool par processus (le rechargement à chaud en dev réévalue ce module)
function pool() {
  if (!globalThis.__mofwazePool) {
    globalThis.__mofwazePool = mysql.createPool({
      ...configConnexion(),
      connectionLimit: Number(process.env.DB_CONNEXIONS || 10),
      waitForConnections: true,
      enableKeepAlive: true,
    });
    // Dates stockées en UTC, quel que soit le fuseau du serveur MySQL
    globalThis.__mofwazePool.pool.on('connection', (connexion) => {
      connexion.query("SET time_zone = '+00:00'");
    });
  }
  return globalThis.__mofwazePool;
}

export async function requete(sql, params = []) {
  const [lignes] = await pool().query(sql, params);
  return lignes;
}

export async function premiere(sql, params = []) {
  const lignes = await requete(sql, params);
  return lignes[0] ?? null;
}

// fn reçoit { requete, premiere } liés à la connexion de la transaction
export async function transaction(fn) {
  const connexion = await pool().getConnection();
  const tx = {
    requete: async (sql, params = []) => (await connexion.query(sql, params))[0],
    premiere: async (sql, params = []) => (await connexion.query(sql, params))[0][0] ?? null,
  };
  try {
    await connexion.beginTransaction();
    const resultat = await fn(tx);
    await connexion.commit();
    return resultat;
  } catch (erreur) {
    await connexion.rollback();
    throw erreur;
  } finally {
    connexion.release();
  }
}
