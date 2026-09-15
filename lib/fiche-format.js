// Format d'une fiche, commun au formulaire de suggestion, à l'éditeur de l'admin
// et à la colonne suggestions.donnees. Aucune dépendance serveur : utilisable côté client.
//
// {
//   mot: 'MANJÉ',
//   variantes: ['MANGÉ'],
//   sens: [{
//     traduction: 'Nourrir, manger',
//     synonymes: ['nannan'],
//     termes: ['manger', 'nourrir'],
//     exemples: [{ kr: 'Nou ka manjé', fr: 'Nous mangeons' }],
//   }],
//   locutions: [{ expression: '', traduction: '', exemple_kr: '', exemple_fr: '' }],
// }

const LIMITES = { mot: 160, texte: 2000, liste: 60, sens: 60, locutions: 60, terme: 190, exemples: 20 };

function texte(v, max = LIMITES.texte) {
  return String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function liste(v, max = LIMITES.mot) {
  const brut = Array.isArray(v) ? v : String(v ?? '').split(',');
  return [...new Set(brut.map((x) => texte(x, max)).filter(Boolean))].slice(0, LIMITES.liste);
}

export function ficheVide() {
  return { mot: '', variantes: [], sens: [{ traduction: '', synonymes: [], termes: [], exemples: [] }], locutions: [] };
}

export function normaliserFiche(brut) {
  const b = brut && typeof brut === 'object' ? brut : {};
  const mot = texte(b.mot, LIMITES.mot);
  return {
    mot,
    variantes: liste(b.variantes).filter((v) => v !== mot),
    sens: (Array.isArray(b.sens) ? b.sens : [])
      .map((s) => ({
        traduction: texte(s?.traduction),
        synonymes: liste(s?.synonymes),
        termes: liste(s?.termes, LIMITES.terme),
        exemples: (Array.isArray(s?.exemples) ? s.exemples : [])
          .map((ex) => ({ kr: texte(ex?.kr), fr: texte(ex?.fr) }))
          .filter((ex) => ex.kr)
          .slice(0, LIMITES.exemples),
      }))
      .filter((s) => s.traduction || s.synonymes.length || s.exemples.length)
      .slice(0, LIMITES.sens),
    locutions: (Array.isArray(b.locutions) ? b.locutions : [])
      .map((l) => ({
        expression: texte(l?.expression, 255),
        traduction: texte(l?.traduction),
        exemple_kr: texte(l?.exemple_kr),
        exemple_fr: texte(l?.exemple_fr),
      }))
      .filter((l) => l.expression || l.exemple_kr)
      .map((l) => ({ ...l, expression: l.expression || l.exemple_kr.slice(0, 255) }))
      .slice(0, LIMITES.locutions),
  };
}

// Représentation texte ligne à ligne, pour afficher les différences dans l'admin
export function ficheEnLignes(fiche, { avecTermes = true } = {}) {
  if (!fiche) return [];
  const lignes = [`Mot : ${fiche.mot}`];
  if (fiche.variantes?.length) lignes.push(`Autres graphies : ${fiche.variantes.join(', ')}`);
  fiche.sens?.forEach((s, i) => {
    lignes.push(`Sens ${i + 1} : ${s.traduction}`);
    s.exemples?.forEach((ex) => lignes.push(`   Exemple : ${ex.kr}${ex.fr ? ` → ${ex.fr}` : ''}`));
    if (s.synonymes?.length) lignes.push(`   Synonymes : ${s.synonymes.join(', ')}`);
    if (avecTermes && s.termes?.length) lignes.push(`   Termes français : ${s.termes.join(', ')}`);
  });
  fiche.locutions?.forEach((l) => {
    lignes.push(`Expression : ${l.expression}${l.traduction ? ` = ${l.traduction}` : ''}`);
    if (l.exemple_kr || l.exemple_fr) lignes.push(`   Exemple de l’expression : ${l.exemple_kr}${l.exemple_fr ? ` → ${l.exemple_fr}` : ''}`);
  });
  return lignes;
}

// Différence ligne à ligne (plus longue sous-séquence commune)
// → [{ type: 'egal' | 'retire' | 'ajoute', ligne }]
export function differences(avant, apres) {
  const n = avant.length;
  const m = apres.length;
  const lcs = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = avant[i] === apres[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const resultat = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (avant[i] === apres[j]) {
      resultat.push({ type: 'egal', ligne: avant[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      resultat.push({ type: 'retire', ligne: avant[i++] });
    } else {
      resultat.push({ type: 'ajoute', ligne: apres[j++] });
    }
  }
  while (i < n) resultat.push({ type: 'retire', ligne: avant[i++] });
  while (j < m) resultat.push({ type: 'ajoute', ligne: apres[j++] });
  return resultat;
}

export function fichesIdentiques(a, b) {
  return JSON.stringify(ficheEnLignes(normaliserFiche(a))) === JSON.stringify(ficheEnLignes(normaliserFiche(b)));
}
