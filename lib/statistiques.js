import { premiere, requete } from './db';
import { jourGuadeloupe } from './dates';

// Statistiques du site : des compteurs agrégés, jamais des personnes.
// Aucun identifiant, aucune adresse IP, aucun cookie n'est écrit ici — on peut
// savoir combien de parties ont été jouées, jamais par qui.
//
// Conséquence assumée : un joueur qui recharge et rejoue compte deux fois.
// Ces chiffres donnent une tendance, pas un décompte de personnes.

// ---------------------------------------------------------------------------
// Mokaché
// ---------------------------------------------------------------------------

// Appelé par /api/jeu, qui connaît déjà l'issue de la partie.
export async function noterPartie({ jour, debut = false, fini = false, gagne = false, coups = 0 }) {
  try {
    const colonneCoups = gagne && coups >= 1 && coups <= 6 ? `coups${coups}` : null;
    await requete(
      `INSERT INTO jeu_stats (jour, commencees, terminees, gagnees${colonneCoups ? `, ${colonneCoups}` : ''})
       VALUES (?, ?, ?, ?${colonneCoups ? ', 1' : ''})
       ON DUPLICATE KEY UPDATE
         commencees = commencees + VALUES(commencees),
         terminees  = terminees  + VALUES(terminees),
         gagnees    = gagnees    + VALUES(gagnees)${colonneCoups ? `,
         ${colonneCoups} = ${colonneCoups} + 1` : ''}`,
      [jour, debut ? 1 : 0, fini ? 1 : 0, gagne ? 1 : 0],
    );
  } catch (erreur) {
    // Une mesure ne doit jamais faire échouer une partie
    console.error('[stats] partie non comptée :', erreur.message);
  }
}

export async function statsJeu({ jours = 30 } = {}) {
  const lignes = await requete(
    `SELECT j.*, e.mot, e.slug
       FROM jeu_stats j
       LEFT JOIN quotidien q ON q.jour = j.jour AND q.type = 'jeu'
       LEFT JOIN entrees e ON e.id = q.entree_id
      WHERE j.jour > CURDATE() - INTERVAL ? DAY
      ORDER BY j.jour DESC`,
    [jours],
  );

  const total = lignes.reduce(
    (acc, l) => {
      acc.commencees += l.commencees;
      acc.terminees += l.terminees;
      acc.gagnees += l.gagnees;
      for (let i = 1; i <= 6; i++) acc.coups[i] += l[`coups${i}`];
      return acc;
    },
    { commencees: 0, terminees: 0, gagnees: 0, coups: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 } },
  );

  return { lignes, total };
}

export async function statsJeuAujourdhui() {
  return premiere('SELECT * FROM jeu_stats WHERE jour = ?', [jourGuadeloupe()]);
}

// ---------------------------------------------------------------------------
// Recherches sans résultat
// ---------------------------------------------------------------------------

// Le mot cherché est conservé, jamais qui l'a cherché. On écarte ce qui n'a
// aucune valeur éditoriale : trop court, trop long, ou rempli de chiffres.
export async function noterRechercheVide(terme, direction) {
  const valeur = String(terme ?? '').replace(/\s+/g, ' ').trim().slice(0, 190);
  if (valeur.length < 2 || valeur.length > 60) return;
  if (!/[a-zà-ÿ]/i.test(valeur)) return;

  try {
    await requete(
      `INSERT INTO recherches_vides (terme, direction) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE occurrences = occurrences + 1, derniere = NOW()`,
      [valeur, direction === 'fr' ? 'fr' : 'kr'],
    );
  } catch (erreur) {
    console.error('[stats] recherche vide non comptée :', erreur.message);
  }
}

export async function listerRecherchesVides({ traite = 0, limite = 100 } = {}) {
  return requete(
    `SELECT * FROM recherches_vides WHERE traite = ?
      ORDER BY occurrences DESC, derniere DESC LIMIT ?`,
    [traite ? 1 : 0, limite],
  );
}

export async function compterRecherchesVides() {
  const lignes = await requete('SELECT traite, COUNT(*) AS n, SUM(occurrences) AS total FROM recherches_vides GROUP BY traite');
  const compte = { a_traiter: 0, traitees: 0, occurrences: 0 };
  for (const l of lignes) {
    if (l.traite) compte.traitees = l.n;
    else compte.a_traiter = l.n;
    compte.occurrences += Number(l.total);
  }
  return compte;
}

export async function marquerRechercheTraitee(id, traite) {
  await requete('UPDATE recherches_vides SET traite = ? WHERE id = ?', [traite ? 1 : 0, id]);
}

export async function supprimerRechercheVide(id) {
  await requete('DELETE FROM recherches_vides WHERE id = ?', [id]);
}
