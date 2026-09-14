'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { useTextes } from './FournisseurTextes';
import { IconeCroix, IconeEchange, IconeLoupe } from './Icones';

const CLE_DIRECTION = 'mofwaze-direction';

function lireDirection() {
  try {
    return localStorage.getItem(CLE_DIRECTION) === 'fr' ? 'fr' : 'kr';
  } catch {
    return 'kr';
  }
}

/**
 * Barre de recherche avec choix du sens et autocomplétion.
 * taille : 'grande' (accueil), 'normale', 'compacte' (en-tête)
 */
export default function Recherche({ taille = 'normale', valeurInitiale = '', directionInitiale, autoFocus = false }) {
  const { t } = useTextes();
  const router = useRouter();
  const idListe = useId();
  const champ = useRef(null);
  const [valeur, setValeur] = useState(valeurInitiale);
  const [direction, setDirection] = useState(directionInitiale ?? 'kr');
  const [propositions, setPropositions] = useState([]);
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(-1);

  // Sans sens imposé par la page, on reprend le dernier sens utilisé
  useEffect(() => {
    if (!directionInitiale) setDirection(lireDirection());
  }, [directionInitiale]);

  useEffect(() => {
    setValeur(valeurInitiale);
  }, [valeurInitiale]);

  useEffect(() => {
    const q = valeur.trim();
    if (q.length < 1) {
      setPropositions([]);
      return;
    }
    const controleur = new AbortController();
    const minuterie = setTimeout(async () => {
      try {
        const reponse = await fetch(`/api/autocompletion?q=${encodeURIComponent(q)}&dir=${direction}`, {
          signal: controleur.signal,
        });
        if (reponse.ok) {
          setPropositions(await reponse.json());
          setActif(-1);
        }
      } catch {
        /* requête annulée ou réseau indisponible */
      }
    }, 140);
    return () => {
      clearTimeout(minuterie);
      controleur.abort();
    };
  }, [valeur, direction]);

  function changerDirection() {
    const nouvelle = direction === 'kr' ? 'fr' : 'kr';
    setDirection(nouvelle);
    try {
      localStorage.setItem(CLE_DIRECTION, nouvelle);
    } catch {
      /* stockage indisponible */
    }
    champ.current?.focus();
  }

  function lancer(evenement) {
    evenement?.preventDefault();
    const q = valeur.trim();
    if (!q) return champ.current?.focus();
    setOuvert(false);
    router.push(`/recherche?q=${encodeURIComponent(q)}&dir=${direction}`);
  }

  function clavier(e) {
    if (!ouvert || !propositions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActif((i) => (i + 1) % propositions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActif((i) => (i <= 0 ? propositions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && actif >= 0) {
      e.preventDefault();
      setOuvert(false);
      router.push(propositions[actif].href);
    } else if (e.key === 'Escape') {
      setOuvert(false);
    }
  }

  const placeholder = direction === 'kr' ? t.recherche.placeholderKr : t.recherche.placeholderFr;
  const libelleDirection = direction === 'kr' ? t.recherche.krFr : t.recherche.frKr;
  const afficherListe = ouvert && propositions.length > 0 && valeur.trim();

  return (
    <form role="search" className={`recherche recherche--${taille}`} onSubmit={lancer}>
      <div className="recherche__boite">
        <button
          type="button"
          className="recherche__direction"
          onClick={changerDirection}
          title={t.recherche.inverser}
          aria-label={`${libelleDirection} – ${t.recherche.inverser}`}
        >
          <span className="recherche__direction-texte">{libelleDirection}</span>
          <span className="recherche__direction-court">{direction === 'kr' ? 'KR → FR' : 'FR → KR'}</span>
          <IconeEchange />
        </button>
        <label htmlFor={`${idListe}-champ`} className="sr-only">
          {placeholder}
        </label>
        <input
          ref={champ}
          id={`${idListe}-champ`}
          className="recherche__champ"
          type="search"
          value={valeur}
          placeholder={placeholder}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck="false"
          autoFocus={autoFocus}
          enterKeyHint="search"
          role="combobox"
          aria-expanded={Boolean(afficherListe)}
          aria-controls={idListe}
          aria-autocomplete="list"
          aria-activedescendant={actif >= 0 ? `${idListe}-${actif}` : undefined}
          onChange={(e) => {
            setValeur(e.target.value);
            setOuvert(true);
          }}
          onFocus={() => setOuvert(true)}
          onBlur={() => setTimeout(() => setOuvert(false), 150)}
          onKeyDown={clavier}
        />
        {valeur && (
          <button
            type="button"
            className="recherche__effacer"
            aria-label={t.recherche.effacer}
            onClick={() => {
              setValeur('');
              setPropositions([]);
              champ.current?.focus();
            }}
          >
            <IconeCroix taille={18} />
          </button>
        )}
        <button type="submit" className="recherche__envoyer">
          <IconeLoupe taille={18} />
          <span>{t.recherche.bouton}</span>
        </button>
      </div>

      {afficherListe && (
        <ul className="propositions" id={idListe} role="listbox">
          {propositions.map((p, i) => (
            <li key={p.href} id={`${idListe}-${i}`} role="option" aria-selected={i === actif}>
              <Link href={p.href} onMouseDown={(e) => e.preventDefault()} onClick={() => setOuvert(false)}>
                <span className="propositions__libelle">{p.libelle}</span>
                {p.detail && <span className="propositions__detail">{p.detail}</span>}
              </Link>
            </li>
          ))}
          <li className="propositions__tout">
            <Link href={`/recherche?q=${encodeURIComponent(valeur.trim())}&dir=${direction}`} onMouseDown={(e) => e.preventDefault()} onClick={() => setOuvert(false)}>
              {t.recherche.voirTout} →
            </Link>
          </li>
        </ul>
      )}
    </form>
  );
}
