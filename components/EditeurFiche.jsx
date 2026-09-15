'use client';

import { useId, useMemo, useState } from 'react';
import { termesDepuisTraduction } from '@/lib/normalisation.mjs';
import { IconeBas, IconeCroix, IconeHaut, IconePlus } from './Icones';

// Clés stables pour React : indices au premier rendu (identiques serveur/client), compteur ensuite
let compteur = 0;
const cle = () => `n${++compteur}`;

const joindre = (liste) => (liste ?? []).join(', ');
const decouper = (texte) =>
  String(texte ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

function versEdition(fiche) {
  return {
    mot: fiche?.mot ?? '',
    variantes: joindre(fiche?.variantes),
    sens: (fiche?.sens?.length ? fiche.sens : [{}]).map((s, i) => ({
      cle: `s${i}`,
      traduction: s.traduction ?? '',
      synonymes: joindre(s.synonymes),
      termes: joindre(s.termes),
      exemples: (s.exemples ?? []).map((ex, j) => ({ cle: `s${i}e${j}`, kr: ex.kr ?? '', fr: ex.fr ?? '' })),
    })),
    locutions: (fiche?.locutions ?? []).map((l, i) => ({
      cle: `l${i}`,
      expression: l.expression ?? '',
      traduction: l.traduction ?? '',
      exemple_kr: l.exemple_kr ?? '',
      exemple_fr: l.exemple_fr ?? '',
    })),
  };
}

function depuisEdition(e) {
  return {
    mot: e.mot.trim(),
    variantes: decouper(e.variantes),
    sens: e.sens.map((s) => ({
      traduction: s.traduction.trim(),
      synonymes: decouper(s.synonymes),
      termes: decouper(s.termes),
      exemples: s.exemples.map((ex) => ({ kr: ex.kr.trim(), fr: ex.fr.trim() })),
    })),
    locutions: e.locutions.map(({ cle: _cle, ...l }) => l),
  };
}

function deplacer(liste, index, delta) {
  const copie = [...liste];
  const cible = index + delta;
  if (cible < 0 || cible >= copie.length) return copie;
  [copie[index], copie[cible]] = [copie[cible], copie[index]];
  return copie;
}

/**
 * Éditeur d'une fiche (mot, graphies, sens, synonymes, expressions).
 * mode 'admin' : ajoute les termes français de chaque sens.
 * La fiche est transmise au formulaire parent via un champ caché « nom ».
 */
export default function EditeurFiche({ ficheInitiale, nom = 'donnees', mode = 'public', l }) {
  const id = useId();
  const [etat, setEtat] = useState(() => versEdition(ficheInitiale));
  const serialise = useMemo(() => JSON.stringify(depuisEdition(etat)), [etat]);
  const admin = mode === 'admin';

  function maj(modif) {
    setEtat((precedent) => (typeof modif === 'function' ? modif(precedent) : { ...precedent, ...modif }));
  }

  const majSens = (i, champ, valeur) =>
    maj((e) => ({ ...e, sens: e.sens.map((s, j) => (j === i ? { ...s, [champ]: valeur } : s)) }));
  const majExemples = (i, modif) =>
    maj((e) => ({ ...e, sens: e.sens.map((s, j) => (j === i ? { ...s, exemples: modif(s.exemples) } : s)) }));
  const majLocution = (i, champ, valeur) =>
    maj((e) => ({ ...e, locutions: e.locutions.map((x, j) => (j === i ? { ...x, [champ]: valeur } : x)) }));

  return (
    <div>
      <input type="hidden" name={nom} value={serialise} />

      <div className="grille-2">
        <div className="champ">
          <label htmlFor={`${id}-mot`}>{l.mot}</label>
          <input
            id={`${id}-mot`}
            className="saisie saisie--mot"
            value={etat.mot}
            onChange={(e) => maj({ mot: e.target.value })}
            maxLength={160}
            required
            autoCapitalize="characters"
          />
        </div>
        <div className="champ">
          <label htmlFor={`${id}-var`}>
            {l.variantes} <span className="champ__facultatif">({l.facultatif})</span>
          </label>
          <input id={`${id}-var`} className="saisie" value={etat.variantes} onChange={(e) => maj({ variantes: e.target.value })} />
          <p className="champ__aide">{l.variantesAide}</p>
        </div>
      </div>

      {etat.sens.map((s, i) => (
        <div key={s.cle} className="bloc-edition">
          <div className="bloc-edition__tete">
            <span className="bloc-edition__titre">{l.sens.replace('{n}', i + 1)}</span>
            <div className="bloc-edition__outils">
              <button type="button" className="bouton-icone" disabled={i === 0} onClick={() => maj((e) => ({ ...e, sens: deplacer(e.sens, i, -1) }))} aria-label={l.monter}>
                <IconeHaut taille={18} />
              </button>
              <button
                type="button"
                className="bouton-icone"
                disabled={i === etat.sens.length - 1}
                onClick={() => maj((e) => ({ ...e, sens: deplacer(e.sens, i, 1) }))}
                aria-label={l.descendre}
              >
                <IconeBas taille={18} />
              </button>
              <button
                type="button"
                className="bouton-icone bouton-icone--danger"
                disabled={etat.sens.length === 1}
                onClick={() => maj((e) => ({ ...e, sens: e.sens.filter((_, j) => j !== i) }))}
                aria-label={l.retirer}
              >
                <IconeCroix taille={18} />
              </button>
            </div>
          </div>
          <div className="champ">
            <label htmlFor={`${id}-trad-${s.cle}`}>{l.traduction}</label>
            <textarea
              id={`${id}-trad-${s.cle}`}
              className="saisie"
              rows={2}
              value={s.traduction}
              onChange={(e) => majSens(i, 'traduction', e.target.value)}
              style={{ minHeight: 60 }}
            />
          </div>
          <div className="champ">
            <span className="champ__libelle">
              {l.exemple} <span className="champ__facultatif">({l.facultatif})</span>
            </span>
            {s.exemples.map((ex, j) => (
              <div key={ex.cle} className="exemple-edition">
                <input
                  className="saisie"
                  value={ex.kr}
                  placeholder={l.exempleKr}
                  aria-label={`${l.exempleKr} ${j + 1}`}
                  onChange={(e) => majExemples(i, (liste) => liste.map((x, k) => (k === j ? { ...x, kr: e.target.value } : x)))}
                />
                <input
                  className="saisie"
                  value={ex.fr}
                  placeholder={l.exempleFr}
                  aria-label={`${l.exempleFr} ${j + 1}`}
                  onChange={(e) => majExemples(i, (liste) => liste.map((x, k) => (k === j ? { ...x, fr: e.target.value } : x)))}
                />
                <button
                  type="button"
                  className="bouton-icone bouton-icone--danger"
                  onClick={() => majExemples(i, (liste) => liste.filter((_, k) => k !== j))}
                  aria-label={l.retirer}
                >
                  <IconeCroix taille={18} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="bouton-ajout bouton-ajout--petit"
              onClick={() => majExemples(i, (liste) => [...liste, { cle: cle(), kr: '', fr: '' }])}
            >
              <IconePlus taille={16} /> {l.ajouterExemple}
            </button>
          </div>
          <div className="champ" style={{ marginBottom: admin ? 18 : 0 }}>
            <label htmlFor={`${id}-syn-${s.cle}`}>
              {l.synonymes} <span className="champ__facultatif">({l.facultatif})</span>
            </label>
            <input id={`${id}-syn-${s.cle}`} className="saisie" value={s.synonymes} onChange={(e) => majSens(i, 'synonymes', e.target.value)} />
            <p className="champ__aide">{l.synonymesAide}</p>
          </div>
          {admin && (
            <div className="champ" style={{ marginBottom: 0 }}>
              <label htmlFor={`${id}-fr-${s.cle}`}>Termes français (recherche français → créole)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input id={`${id}-fr-${s.cle}`} className="saisie" value={s.termes} onChange={(e) => majSens(i, 'termes', e.target.value)} />
                <button
                  type="button"
                  className="bouton bouton--blanc bouton--petit"
                  onClick={() => majSens(i, 'termes', termesDepuisTraduction(s.traduction).join(', '))}
                  title="Découper la traduction sur les virgules"
                >
                  Générer
                </button>
              </div>
              <p className="champ__aide">Séparés par des virgules. « Générer » découpe la traduction.</p>
            </div>
          )}
        </div>
      ))}
      <button
        type="button"
        className="bouton-ajout"
        onClick={() => maj((e) => ({ ...e, sens: [...e.sens, { cle: cle(), traduction: '', synonymes: '', termes: '', exemples: [] }] }))}
      >
        <IconePlus taille={18} /> {l.ajouterSens}
      </button>

      <div style={{ marginTop: 24 }}>
        {etat.locutions.map((x, i) => (
          <div key={x.cle} className="bloc-edition">
            <div className="bloc-edition__tete">
              <span className="bloc-edition__titre">{l.locution}</span>
              <div className="bloc-edition__outils">
                <button
                  type="button"
                  className="bouton-icone bouton-icone--danger"
                  onClick={() => maj((e) => ({ ...e, locutions: e.locutions.filter((_, j) => j !== i) }))}
                  aria-label={l.retirer}
                >
                  <IconeCroix taille={18} />
                </button>
              </div>
            </div>
            <div className="grille-2">
              <div className="champ">
                <label htmlFor={`${id}-exp-${x.cle}`}>{l.expression}</label>
                <input id={`${id}-exp-${x.cle}`} className="saisie" value={x.expression} onChange={(e) => majLocution(i, 'expression', e.target.value)} />
              </div>
              <div className="champ">
                <label htmlFor={`${id}-expfr-${x.cle}`}>{l.locutionTraduction}</label>
                <input id={`${id}-expfr-${x.cle}`} className="saisie" value={x.traduction} onChange={(e) => majLocution(i, 'traduction', e.target.value)} />
              </div>
              <div className="champ" style={{ marginBottom: 0 }}>
                <label htmlFor={`${id}-exkr-${x.cle}`}>{l.exempleKr}</label>
                <input id={`${id}-exkr-${x.cle}`} className="saisie" value={x.exemple_kr} onChange={(e) => majLocution(i, 'exemple_kr', e.target.value)} />
              </div>
              <div className="champ" style={{ marginBottom: 0 }}>
                <label htmlFor={`${id}-exfr-${x.cle}`}>{l.exempleFr}</label>
                <input id={`${id}-exfr-${x.cle}`} className="saisie" value={x.exemple_fr} onChange={(e) => majLocution(i, 'exemple_fr', e.target.value)} />
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="bouton-ajout"
          onClick={() => maj((e) => ({ ...e, locutions: [...e.locutions, { cle: cle(), expression: '', traduction: '', exemple_kr: '', exemple_fr: '' }] }))}
        >
          <IconePlus taille={18} /> {l.ajouterLocution}
        </button>
      </div>
    </div>
  );
}
