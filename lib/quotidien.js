import { premiere, requete } from './db';
import { decalerJour, jourGuadeloupe } from './dates';
import { estMotDeJeu, lettresJeu, rechercheFrancais } from './normalisation.mjs';

// Mots à éviter en page d'accueil et dans le jeu (comparés sur la traduction normalisée,
// mot entier). L'admin peut aussi exclure un mot à la main depuis sa fiche.
const MOTS_SENSIBLES = [
  'sexe', 'sexuel', 'sexuelle', 'sexuels', 'sexuelles', 'vulgaire', 'vulgairement', 'grossier', 'obscene',
  'cul', 'pet', 'pets', 'peter', 'penis', 'vagin', 'testicule', 'testicules', 'couille', 'couilles',
  'fesse', 'fesses', 'putain', 'pute', 'prostituee', 'prostitue', 'prostitution', 'injure', 'insulte',
  'juron', 'merde', 'con', 'conne', 'couillon', 'masturber', 'masturbation', 'copuler', 'coit', 'bander',
  'erection', 'excrement', 'excrements', 'vomir', 'vomi', 'diarrhee', 'caca', 'chier', 'pisser', 'urine',
].map(rechercheFrancais);

const clauseSensible = MOTS_SENSIBLES.map(() => "CONCAT(' ', s2.recherche, ' ') LIKE ?").join(' OR ');
const parametresSensibles = MOTS_SENSIBLES.map((m) => `% ${m} %`);

const JOURS_SANS_REPETITION = 730;

async function dejaTire(type, jour) {
  const ligne = await premiere('SELECT entree_id FROM quotidien WHERE jour = ? AND type = ?', [jour, type]);
  return ligne?.entree_id ?? null;
}

async function candidats(type, jour, { avecSynonymes }) {
  return requete(
    `SELECT e.id, e.mot
       FROM entrees e
      WHERE ${type === 'jeu' ? 'e.exclu_jeu' : 'e.exclu_quotidien'} = 0
        AND CHAR_LENGTH(e.mot) <= 24
        AND e.mot NOT LIKE '%:%' AND e.mot NOT LIKE '%(%'
        AND EXISTS (SELECT 1 FROM sens s WHERE s.entree_id = e.id AND s.traduction <> '')
        ${avecSynonymes ? 'AND EXISTS (SELECT 1 FROM sens s JOIN synonymes sy ON sy.sens_id = s.id WHERE s.entree_id = e.id)' : ''}
        AND NOT EXISTS (SELECT 1 FROM sens s2 WHERE s2.entree_id = e.id AND (${clauseSensible}))
        AND NOT EXISTS (
          SELECT 1 FROM quotidien q
           WHERE q.type = ? AND q.entree_id = e.id AND q.jour > ?
        )`,
    [...parametresSensibles, type, decalerJour(jour, -JOURS_SANS_REPETITION)],
  );
}

function auHasard(liste) {
  return liste.length ? liste[Math.floor(Math.random() * liste.length)] : null;
}

async function choisir(type, jour) {
  if (type === 'jeu') {
    const liste = (await candidats('jeu', jour, { avecSynonymes: false })).filter((c) => estMotDeJeu(c.mot));
    return auHasard(liste)?.id ?? null;
  }
  const riches = await candidats('mot', jour, { avecSynonymes: true });
  return (auHasard(riches) ?? auHasard(await candidats('mot', jour, { avecSynonymes: false })))?.id ?? null;
}

// Renvoie l'id du mot tiré pour ce jour, en le tirant au sort la première fois.
export async function tirage(type, jour = jourGuadeloupe()) {
  const existant = await dejaTire(type, jour);
  if (existant) return existant;
  const id = await choisir(type, jour);
  if (!id) return null;
  // INSERT IGNORE : si deux visiteurs arrivent en même temps, le premier tirage gagne
  await requete('INSERT IGNORE INTO quotidien (jour, type, entree_id) VALUES (?, ?, ?)', [jour, type, id]);
  return dejaTire(type, jour);
}

// ---------------------------------------------------------------------------
// Jeu
// ---------------------------------------------------------------------------

let cacheMotsValides = { expire: 0, mots: null };

// Tous les mots de 5 lettres acceptés comme essai (formes principales et variantes)
export async function motsValides() {
  if (cacheMotsValides.mots && cacheMotsValides.expire > Date.now()) return cacheMotsValides.mots;
  const lignes = await requete('SELECT forme FROM formes WHERE CHAR_LENGTH(recherche) = 5');
  const mots = new Set(lignes.filter((l) => estMotDeJeu(l.forme)).map((l) => lettresJeu(l.forme)));
  cacheMotsValides = { expire: Date.now() + 10 * 60 * 1000, mots };
  return mots;
}

export function viderCacheJeu() {
  cacheMotsValides = { expire: 0, mots: null };
}

// Couleurs façon Wordle, en gérant correctement les lettres en double
export function evaluer(essai, solution) {
  const resultat = Array(5).fill('absent');
  const restantes = {};
  for (let i = 0; i < 5; i++) {
    if (essai[i] === solution[i]) resultat[i] = 'bon';
    else restantes[solution[i]] = (restantes[solution[i]] ?? 0) + 1;
  }
  for (let i = 0; i < 5; i++) {
    if (resultat[i] !== 'bon' && restantes[essai[i]] > 0) {
      resultat[i] = 'place';
      restantes[essai[i]]--;
    }
  }
  return resultat;
}

export async function solutionDuJour(jour) {
  const id = await tirage('jeu', jour);
  if (!id) return null;
  const entree = await premiere('SELECT id, mot, slug FROM entrees WHERE id = ?', [id]);
  if (!entree) return null;
  const sens = await requete(
    "SELECT traduction FROM sens WHERE entree_id = ? AND traduction <> '' ORDER BY num LIMIT 3",
    [id],
  );
  return { ...entree, lettres: lettresJeu(entree.mot), traductions: sens.map((s) => s.traduction) };
}
