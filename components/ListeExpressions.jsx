'use client';

import { useMemo, useState } from 'react';
import { rechercheKreyol } from '@/lib/normalisation.mjs';

// Les expressions d'un mot. La plupart des fiches en ont une poignée : elles
// gardent l'affichage en blocs. FÈ en a 115, et empiler 115 blocs donne une
// page interminable. Au-delà d'un seuil on passe en liste compacte sur deux
// colonnes, puis on n'en montre qu'un aperçu, avec un filtre au-dessus.
//
// Les expressions repliées restent dans le HTML : elles sont seulement
// masquées en CSS. Les moteurs de recherche les voient donc toujours, et le
// filtre les retrouve sans qu'on ait à déplier.

const SEUIL_COMPACT = 15;
const SEUIL_FILTRE = 30;
const APERCU = 24;

export default function ListeExpressions({ locutions, titre, l }) {
  const [filtre, setFiltre] = useState('');
  const [tout, setTout] = useState(false);

  const compact = locutions.length > SEUIL_COMPACT;
  const filtrable = locutions.length > SEUIL_FILTRE;

  const visibles = useMemo(() => {
    const q = filtre.trim();
    if (!filtrable || !q) return locutions;
    const kr = rechercheKreyol(q);
    const fr = q.toLowerCase();
    return locutions.filter(
      (x) => (kr && rechercheKreyol(x.expression).includes(kr)) || (x.traduction ?? '').toLowerCase().includes(fr),
    );
  }, [locutions, filtre, filtrable]);

  // On ne replie que la liste entière : dès qu'on filtre, tout ce qui reste s'affiche
  const replie = compact && !tout && !filtre.trim() && visibles.length > APERCU;
  const caches = replie ? visibles.length - APERCU : 0;

  return (
    <>
      <h2 className="fiche__section-titre">
        {titre} <span className="fiche__compte">{locutions.length}</span>
      </h2>

      {filtrable && (
        <div className="expressions__filtre">
          <label htmlFor="filtre-expressions" className="sr-only">
            {l.filtrer}
          </label>
          <input
            id="filtre-expressions"
            type="search"
            className="saisie"
            placeholder={l.filtrer}
            value={filtre}
            onChange={(e) => setFiltre(e.target.value)}
          />
          {filtre.trim() && (
            <p className="expressions__compte" aria-live="polite">
              {visibles.length === 0 ? l.aucune : `${visibles.length} / ${locutions.length}`}
            </p>
          )}
        </div>
      )}

      {visibles.length === 0 ? (
        <p className="message-vide">{l.aucune}</p>
      ) : compact ? (
        <>
          <ul className={`expressions${replie ? ' expressions--repliee' : ''}`}>
            {visibles.map((x, i) => (
              <li key={i} className="expressions__item">
                <span className="expressions__mot">{x.expression}</span>
                {x.traduction && <span className="expressions__sens">{x.traduction}</span>}
                {x.exemple_kr && (
                  <span className="expressions__exemple">
                    « {x.exemple_kr} »{x.exemple_fr ? ` ${x.exemple_fr}` : ''}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {caches > 0 && (
            <button type="button" className="bouton bouton--blanc expressions__plus" onClick={() => setTout(true)}>
              {l.voirPlus.replace('{n}', caches)}
            </button>
          )}
        </>
      ) : (
        visibles.map((x, i) => (
          <div key={i} className="locution">
            <div className="locution__expression">{x.expression}</div>
            {x.traduction && <div className="locution__traduction">{x.traduction}</div>}
            {x.exemple_kr && (
              <p className="locution__exemple">
                « {x.exemple_kr} »{x.exemple_fr && <span>{x.exemple_fr}</span>}
              </p>
            )}
          </div>
        ))
      )}
    </>
  );
}
