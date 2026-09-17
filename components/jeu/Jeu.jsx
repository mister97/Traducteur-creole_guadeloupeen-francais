'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { lettresJeu } from '@/lib/normalisation.mjs';
import { f } from '@/lib/textes';
import { IconeAide, IconeCroix, IconePartage, IconeRetour, IconeStats } from '../Icones';
import styles from './jeu.module.css';

const LONGUEUR = 5;
const ESSAIS_MAX = 6;
const CLE_STATS = 'mofwaze-jeu-stats';
const CLE_REGLES = 'mofwaze-jeu-regles-vues';
// Disposition du clavier guadeloupéen : pas de Q ni de X (K à la place du Q),
// et pas de touches accentuées puisque les accents ne comptent pas dans le jeu.
const CLAVIER = [
  ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['K', 'S', 'D', 'F', 'G', 'H', 'J', 'L', 'M'],
  ['ENTREE', 'W', 'C', 'V', 'B', 'N', 'EFFACER'],
];
// Lettres acceptées, y compris depuis un clavier d'ordinateur (é → E, q et x ignorés)
const LETTRES = new Set(CLAVIER.flat().filter((cle) => cle.length === 1));
const PRIORITE = { absent: 1, place: 2, bon: 3 };
const EMOJI = { bon: '🟩', place: '🟧', absent: '⬜' };
const STATS_VIDES = { joues: 0, gagnes: 0, serie: 0, meilleure: 0, distribution: [0, 0, 0, 0, 0, 0], dernierJour: null, dernierGagne: null };

function lire(cle, defaut) {
  try {
    const valeur = localStorage.getItem(cle);
    return valeur ? JSON.parse(valeur) : defaut;
  } catch {
    return defaut;
  }
}

function ecrire(cle, valeur) {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    /* stockage indisponible (navigation privée…) */
  }
}

function veille(jour) {
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function compteARebours(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

export default function Jeu({ jour, dateTexte, numero, finDuJour, urlSite, t }) {
  const router = useRouter();
  const clePartie = `mofwaze-jeu-${jour}`;
  const [pret, setPret] = useState(false);
  const [essais, setEssais] = useState([]);
  const [saisie, setSaisie] = useState('');
  const [solution, setSolution] = useState(null);
  const [stats, setStats] = useState(STATS_VIDES);
  const [message, setMessage] = useState(null);
  const [secoue, setSecoue] = useState(false);
  const [enAttente, setEnAttente] = useState(false);
  const [animee, setAnimee] = useState(-1);
  const [modale, setModale] = useState(null);
  const [restant, setRestant] = useState(finDuJour - Date.now());
  const minuterieMessage = useRef(null);

  const gagne = essais.some((e) => e.resultat.every((r) => r === 'bon'));
  const fini = gagne || essais.length >= ESSAIS_MAX;

  // Reprise de la partie du jour
  useEffect(() => {
    const partie = lire(clePartie, null);
    if (partie) {
      setEssais(partie.essais ?? []);
      setSolution(partie.solution ?? null);
    }
    setStats({ ...STATS_VIDES, ...lire(CLE_STATS, {}) });
    if (!lire(CLE_REGLES, false)) setModale('regles');
    setPret(true);
  }, [clePartie]);

  useEffect(() => {
    if (pret) ecrire(clePartie, { essais, solution });
  }, [pret, clePartie, essais, solution]);

  useEffect(() => {
    const id = setInterval(() => {
      const ms = finDuJour - Date.now();
      setRestant(ms);
      if (ms <= 0) {
        clearInterval(id);
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [finDuJour, router]);

  const afficherMessage = useCallback((texte, duree = 1800) => {
    clearTimeout(minuterieMessage.current);
    setMessage(texte);
    if (duree) minuterieMessage.current = setTimeout(() => setMessage(null), duree);
  }, []);

  const etatsClavier = useMemo(() => {
    const etats = {};
    for (const e of essais) {
      [...e.lettres].forEach((lettre, i) => {
        const r = e.resultat[i];
        if (!etats[lettre] || PRIORITE[r] > PRIORITE[etats[lettre]]) etats[lettre] = r;
      });
    }
    return etats;
  }, [essais]);

  function terminer(nouveauxEssais, aGagne) {
    const actuelles = { ...STATS_VIDES, ...lire(CLE_STATS, {}) };
    if (actuelles.dernierJour === jour) return;
    const distribution = [...actuelles.distribution];
    if (aGagne) distribution[nouveauxEssais.length - 1] += 1;
    const serie = aGagne ? (actuelles.dernierGagne === veille(jour) ? actuelles.serie + 1 : 1) : 0;
    const nouvelles = {
      joues: actuelles.joues + 1,
      gagnes: actuelles.gagnes + (aGagne ? 1 : 0),
      serie,
      meilleure: Math.max(actuelles.meilleure, serie),
      distribution,
      dernierJour: jour,
      dernierGagne: aGagne ? jour : actuelles.dernierGagne,
    };
    ecrire(CLE_STATS, nouvelles);
    setStats(nouvelles);
  }

  async function valider() {
    if (enAttente || fini) return;
    if (saisie.length < LONGUEUR) {
      setSecoue(true);
      afficherMessage(t.tropCourt);
      return;
    }
    setEnAttente(true);
    try {
      const reponse = await fetch('/api/jeu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jour, essai: saisie, numero: essais.length + 1 }),
      });
      const donnees = await reponse.json();
      if (donnees.erreur === 'inconnu' || donnees.erreur === 'longueur') {
        setSecoue(true);
        afficherMessage(donnees.erreur === 'inconnu' ? t.inconnu : t.tropCourt);
        return;
      }
      if (donnees.erreur === 'jour') {
        router.refresh();
        return;
      }
      if (!reponse.ok || donnees.erreur) {
        afficherMessage(t.erreur);
        return;
      }
      const nouveauxEssais = [...essais, { lettres: donnees.essai, resultat: donnees.resultat }];
      setAnimee(nouveauxEssais.length - 1);
      setEssais(nouveauxEssais);
      setSaisie('');
      if (donnees.solution) setSolution(donnees.solution);
      if (donnees.gagne || nouveauxEssais.length >= ESSAIS_MAX) {
        terminer(nouveauxEssais, donnees.gagne);
        setTimeout(() => {
          if (donnees.gagne) afficherMessage(t.gagne[nouveauxEssais.length - 1], 2200);
          setModale('stats');
        }, LONGUEUR * 140 + 500);
      }
    } catch {
      afficherMessage(t.erreur);
    } finally {
      setEnAttente(false);
    }
  }

  const touche = useCallback(
    (cle) => {
      if (fini || modale) return;
      if (cle === 'ENTREE') return valider();
      if (cle === 'EFFACER') return setSaisie((s) => s.slice(0, -1));
      const lettre = lettresJeu(cle);
      if (LETTRES.has(lettre)) setSaisie((s) => (s.length < LONGUEUR ? s + lettre : s));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fini, modale, saisie, essais, enAttente],
  );

  useEffect(() => {
    function clavierPhysique(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape' && modale) return setModale(null);
      if (e.key === 'Enter') {
        e.preventDefault();
        touche('ENTREE');
      } else if (e.key === 'Backspace') touche('EFFACER');
      else if (e.key.length === 1) touche(e.key);
    }
    window.addEventListener('keydown', clavierPhysique);
    return () => window.removeEventListener('keydown', clavierPhysique);
  }, [touche, modale]);

  async function partager() {
    const lignes = essais.map((e) => e.resultat.map((r) => EMOJI[r]).join(''));
    const texte = `${t.titre} ${f(t.numero, { n: numero })} ${gagne ? essais.length : 'X'}/${ESSAIS_MAX}\n\n${lignes.join('\n')}\n\n${urlSite}/jeu`;
    try {
      if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ text: texte });
        return;
      }
      await navigator.clipboard.writeText(texte);
      afficherMessage(t.copie);
    } catch {
      /* partage annulé */
    }
  }

  function fermerModale() {
    if (modale === 'regles') ecrire(CLE_REGLES, true);
    setModale(null);
  }

  const lignes = Array.from({ length: ESSAIS_MAX }, (_, i) => {
    if (i < essais.length) return { lettres: essais[i].lettres, resultat: essais[i].resultat };
    if (i === essais.length && !fini) return { lettres: saisie, resultat: null, courante: true };
    return { lettres: '', resultat: null };
  });

  const pourcentage = stats.joues ? Math.round((stats.gagnes / stats.joues) * 100) : 0;
  const maxDistribution = Math.max(1, ...stats.distribution);

  return (
    <div className={styles.jeu}>
      <div className={styles.tete}>
        <button type="button" className={styles.boutonRond} onClick={() => setModale('regles')} aria-label={t.regles}>
          <IconeAide />
        </button>
        <div className={styles.titre}>
          <h1>{t.titre}</h1>
          <p>
            {f(t.numero, { n: numero })} · {dateTexte}
          </p>
        </div>
        <button type="button" className={styles.boutonRond} onClick={() => setModale('stats')} aria-label={t.stats}>
          <IconeStats />
        </button>
      </div>

      <div className={styles.grille} aria-label={t.titre}>
        {lignes.map((ligne, i) => (
          <div
            key={i}
            className={`${styles.ligne} ${ligne.courante && secoue ? styles.secoue : ''}`}
            onAnimationEnd={() => setSecoue(false)}
          >
            {Array.from({ length: LONGUEUR }, (_, j) => {
              const lettre = ligne.lettres[j] ?? '';
              const etat = ligne.resultat?.[j];
              return (
                <div
                  key={j}
                  className={[
                    styles.tuile,
                    lettre && !etat ? styles.remplie : '',
                    etat ? styles[etat] : '',
                    etat && i === animee ? styles.revele : '',
                  ].join(' ')}
                  style={{ '--i': j }}
                  aria-label={etat ? `${lettre} ${etat}` : lettre || undefined}
                >
                  {lettre}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div aria-live="polite" className="sr-only">
        {message}
      </div>
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}

      {fini && solution ? (
        <div className={`carte ${styles.fin}`}>
          <p className={styles.finTitre}>{gagne ? t.gagne[Math.max(0, essais.length - 1)] : t.perdu}</p>
          <Link href={`/mo/${solution.slug}`} className={styles.finMot}>
            {solution.mot}
          </Link>
          {solution.traductions?.length > 0 && <p className={styles.finSens}>{solution.traductions.join(' ; ')}</p>}
          <div className={styles.finActions}>
            <button type="button" className="bouton bouton--principal" onClick={partager}>
              <IconePartage taille={18} /> {t.partager}
            </button>
            <Link href={`/mo/${solution.slug}`} className="bouton bouton--contour">
              {t.voirFiche}
            </Link>
          </div>
          <p className={styles.prochain}>
            {t.prochain} <strong>{compteARebours(restant)}</strong>
          </p>
        </div>
      ) : (
        <div className={styles.clavier} aria-hidden={!pret}>
          {CLAVIER.map((rangee, i) => (
            <div key={i} className={styles.rangee}>
              {rangee.map((cle) => (
                <button
                  key={cle}
                  type="button"
                  className={`${styles.touche} ${cle.length > 1 ? styles.large : ''} ${etatsClavier[cle] ? styles[etatsClavier[cle]] : ''}`}
                  onClick={() => touche(cle)}
                  disabled={enAttente && cle === 'ENTREE'}
                  aria-label={cle === 'EFFACER' ? t.effacer : cle === 'ENTREE' ? t.entree : cle}
                >
                  {cle === 'EFFACER' ? <IconeRetour taille={22} /> : cle === 'ENTREE' ? t.entree : cle}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {modale && (
        <div className={styles.fond} onClick={fermerModale} role="presentation">
          <div
            className={styles.modale}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titre-modale"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className={styles.fermer} onClick={fermerModale} aria-label={t.fermer}>
              <IconeCroix />
            </button>

            {modale === 'regles' ? (
              <>
                <h2 id="titre-modale">{t.regles}</h2>
                <p>{t.regle1}</p>
                <Exemple lettres="KACHE" etat="bon" index={0} texte={t.regleBon} />
                <Exemple lettres="LAKOU" etat="place" index={2} texte={t.reglePlace} />
                <Exemple lettres="MANJE" etat="absent" index={4} texte={t.regleAbsent} />
                <p className={styles.note}>{t.regleAccents}</p>
                <p className={styles.note}>{t.regleDico}</p>
                <button type="button" className="bouton bouton--turquoise bouton--bloc" onClick={fermerModale}>
                  {t.fermer}
                </button>
              </>
            ) : (
              <>
                <h2 id="titre-modale">{t.stats}</h2>
                <div className={styles.stats}>
                  <div>
                    <strong>{stats.joues}</strong>
                    <span>{t.joues}</span>
                  </div>
                  <div>
                    <strong>{pourcentage}</strong>
                    <span>{t.victoires}</span>
                  </div>
                  <div>
                    <strong>{stats.serie}</strong>
                    <span>{t.serie}</span>
                  </div>
                  <div>
                    <strong>{stats.meilleure}</strong>
                    <span>{t.meilleureSerie}</span>
                  </div>
                </div>
                <h3>{t.distribution}</h3>
                <div className={styles.distribution}>
                  {stats.distribution.map((n, i) => (
                    <div key={i} className={styles.barreLigne}>
                      <span>{i + 1}</span>
                      <div
                        className={`${styles.barre} ${fini && gagne && essais.length === i + 1 ? styles.barreActive : ''}`}
                        style={{ width: `${Math.max(8, (n / maxDistribution) * 100)}%` }}
                      >
                        {n}
                      </div>
                    </div>
                  ))}
                </div>
                {fini && (
                  <>
                    <p className={styles.prochain}>
                      {t.prochain} <strong>{compteARebours(restant)}</strong>
                    </p>
                    <button type="button" className="bouton bouton--principal bouton--bloc" onClick={partager}>
                      <IconePartage taille={18} /> {t.partager}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Exemple({ lettres, etat, index, texte }) {
  return (
    <div className={styles.exemple}>
      <div className={styles.exempleTuiles}>
        {[...lettres].map((l, i) => (
          <div key={i} className={`${styles.tuile} ${styles.petite} ${i === index ? styles[etat] : styles.remplie}`}>
            {l}
          </div>
        ))}
      </div>
      <p>{texte}</p>
    </div>
  );
}
