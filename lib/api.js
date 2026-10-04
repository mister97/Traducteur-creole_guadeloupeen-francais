import crypto from 'node:crypto';
import { agregerSiNecessaire } from './api-agregation';
import { aAccepteVersionCourante } from './conditions';
import { premiere, requete } from './db';
import { BLOC_LICENCE, LICENCE, PAGE_LICENCE } from './licence';
import { hacherIp } from './suggestions';

export const VERSION_API = '1.0';
export const QUOTA_SANS_CLE = 10; // requêtes par minute et par IP

// ---------------------------------------------------------------------------
// Clés
// ---------------------------------------------------------------------------

export function hacherCle(cleClaire) {
  return crypto.createHash('sha256').update(String(cleClaire)).digest('hex');
}

// La clé en clair n'est jamais stockée : elle n'est affichée qu'une fois à son créateur
export function genererCle() {
  const claire = crypto.randomBytes(32).toString('base64url');
  return { claire, hash: hacherCle(claire), prefixe: claire.slice(0, 8) };
}

async function trouverCle(cleClaire) {
  return premiere(
    `SELECT k.id, k.partner_id, k.rate_limit, k.revoked_at, k.allowed_origins,
            p.name AS partner_name, p.is_active, p.suspended_at, p.export_autorise
       FROM api_keys k JOIN partners p ON p.id = k.partner_id
      WHERE k.key_hash = ?`,
    [hacherCle(cleClaire)],
  );
}

// ---------------------------------------------------------------------------
// Quotas : comptage en mémoire par instance, repli facultatif en base
// ---------------------------------------------------------------------------

const compteurs = new Map();

function quotaMemoire(cle, limite) {
  const minute = Math.floor(Date.now() / 60000);
  const actuel = compteurs.get(cle);
  if (!actuel || actuel.minute !== minute) {
    if (compteurs.size > 5000) compteurs.clear();
    compteurs.set(cle, { minute, n: 1 });
    return true;
  }
  actuel.n += 1;
  return actuel.n <= limite;
}

// Avec plusieurs instances Node, le compteur mémoire ne voit qu'une part du trafic :
// API_QUOTA_BASE=1 ajoute un décompte en base (une requête indexée de plus par appel).
async function quotaBase(apiKeyId, ipHash, limite) {
  if (process.env.API_QUOTA_BASE !== '1') return true;
  const { n } = apiKeyId
    ? await premiere('SELECT COUNT(*) AS n FROM api_requests WHERE api_key_id = ? AND created_at > NOW() - INTERVAL 1 MINUTE', [
        apiKeyId,
      ])
    : await premiere('SELECT COUNT(*) AS n FROM api_requests WHERE ip_hash = ? AND created_at > NOW() - INTERVAL 1 MINUTE', [
        ipHash,
      ]);
  return n < limite;
}

// ---------------------------------------------------------------------------
// Réponses
// ---------------------------------------------------------------------------

const MESSAGES = {
  invalid_request: 'Requête invalide : vérifiez les paramètres.',
  unauthorized: 'Clé d’API inconnue, révoquée ou suspendue.',
  terms_not_accepted: 'Les conditions d’utilisation en cours n’ont pas été acceptées.',
  export_not_allowed: 'L’export complet n’est pas ouvert sur cette clé. Faites-en la demande depuis le site.',
  not_found: 'Ressource introuvable.',
  rate_limited: 'Quota dépassé, réessayez dans une minute.',
  server_error: 'Erreur du service, réessayez plus tard.',
};

const STATUTS = {
  invalid_request: 400,
  unauthorized: 401,
  terms_not_accepted: 403,
  export_not_allowed: 403,
  not_found: 404,
  rate_limited: 429,
  server_error: 500,
};

export class ErreurApi extends Error {
  constructor(code, message) {
    super(message ?? MESSAGES[code] ?? MESSAGES.server_error);
    this.code = code;
    this.status = STATUTS[code] ?? 500;
  }
}

function entetes({ origine, cache }) {
  const h = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': cache,
    'X-License': LICENCE.nom,
    Link: `<${PAGE_LICENCE}>; rel="license"`,
    'Access-Control-Allow-Origin': origine,
    'Access-Control-Allow-Headers': 'X-API-Key, Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    Vary: 'Origin, X-API-Key',
  };
  return h;
}

function origineAutorisee(requete, cle) {
  const origine = requete.headers.get('origin');
  if (!cle) return '*'; // sans clé : ouvert, mais quota bas
  if (!origine) return '*';
  const liste = (cle.allowed_origins ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (!liste.length) return origine; // pas de restriction enregistrée
  return liste.includes(origine) ? origine : 'null';
}

// ---------------------------------------------------------------------------
// Journalisation
// ---------------------------------------------------------------------------

const dernierUsage = new Map();

async function journaliser({ apiKeyId, endpoint, query, status, ipHash }) {
  try {
    await requete('INSERT INTO api_requests (api_key_id, endpoint, query, status, ip_hash) VALUES (?, ?, ?, ?, ?)', [
      apiKeyId,
      endpoint,
      query ? String(query).slice(0, 190) : null,
      status,
      ipHash,
    ]);
    if (apiKeyId && Date.now() - (dernierUsage.get(apiKeyId) ?? 0) > 60000) {
      dernierUsage.set(apiKeyId, Date.now());
      await requete('UPDATE api_keys SET last_used_at = NOW() WHERE id = ?', [apiKeyId]);
    }
  } catch (erreur) {
    console.error('Journalisation API impossible :', erreur.message);
  }
  agregerSiNecessaire();
}

function ipDe(requete) {
  const entete = requete.headers.get('x-forwarded-for') || requete.headers.get('x-real-ip') || '';
  return entete.split(',')[0].trim() || 'inconnue';
}

// ---------------------------------------------------------------------------
// Enveloppe commune des points d'entrée
// ---------------------------------------------------------------------------

/**
 * Authentifie, applique le quota, appelle le traitement, journalise et renvoie
 * la réponse JSON avec le bloc de licence et les en-têtes d'attribution.
 * traitement : (params) => objet JSON (hors bloc « license »)
 */
export async function pointEntree(requete, { endpoint, query = null, journal = true }, traitement) {
  const ipHash = hacherIp(ipDe(requete));
  const cleClaire = requete.headers.get('x-api-key');
  let cle = null;
  let statut = 200;
  let corps;

  try {
    if (cleClaire) {
      cle = await trouverCle(cleClaire);
      if (!cle || cle.revoked_at || !cle.is_active || cle.suspended_at) throw new ErreurApi('unauthorized');
      if (!(await aAccepteVersionCourante(cle.partner_id))) throw new ErreurApi('terms_not_accepted');
    }

    const limite = cle ? cle.rate_limit : QUOTA_SANS_CLE;
    const compteur = cle ? `cle:${cle.id}` : `ip:${ipHash}`;
    if (!quotaMemoire(compteur, limite) || !(await quotaBase(cle?.id ?? null, ipHash, limite))) {
      throw new ErreurApi('rate_limited');
    }

    corps = { ...(await traitement({ cle })), license: BLOC_LICENCE };
  } catch (erreur) {
    const api = erreur instanceof ErreurApi ? erreur : null;
    if (!api) console.error(`[api ${endpoint}]`, erreur);
    const code = api?.code ?? 'server_error';
    statut = api?.status ?? 500;
    corps = { error: { code, message: api?.message ?? MESSAGES.server_error } };
    if (code === 'terms_not_accepted') corps.error.url = `${process.env.SITE_URL ?? ''}/partenaire`;
  }

  if (journal) await journaliser({ apiKeyId: cle?.id ?? null, endpoint, query, status: statut, ipHash });

  const h = entetes({
    origine: origineAutorisee(requete, cle),
    cache: statut === 200 ? 'public, max-age=300' : 'no-store',
  });
  if (statut === 429) h['Retry-After'] = '60';
  return new Response(JSON.stringify(corps), { status: statut, headers: h });
}

export function reponseOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'X-API-Key, Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// ---------------------------------------------------------------------------
// Lecture des paramètres
// ---------------------------------------------------------------------------

export function entier(valeur, { defaut, min, max, nom }) {
  if (valeur === null || valeur === '') return defaut;
  const n = Number.parseInt(valeur, 10);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new ErreurApi('invalid_request', `Le paramètre « ${nom} » doit être un entier entre ${min} et ${max}.`);
  }
  return n;
}
