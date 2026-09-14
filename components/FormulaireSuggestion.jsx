'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState } from 'react';
import { envoyerSuggestion } from '@/app/(site)/proposer/actions';
import { f } from '@/lib/textes';
import EditeurFiche from './EditeurFiche';
import { useTextes } from './FournisseurTextes';
import { IconeCrayon, IconeMail } from './Icones';

export default function FormulaireSuggestion({ entree, typeInitial, debut, email }) {
  const { t } = useTextes();
  const l = t.proposer;
  const router = useRouter();
  const [type, setType] = useState(typeInitial);
  const [etat, action, enCours] = useActionState(envoyerSuggestion, null);
  const [adresse, setAdresse] = useState('');
  const haut = useRef(null);

  useEffect(() => {
    if (etat) haut.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [etat]);

  if (etat?.ok) {
    return (
      <div className="message-vide" ref={haut}>
        <h2 className="page-titre" style={{ marginBottom: 12 }}>
          {l.merciTitre}
        </h2>
        <p>{l.merciTexte}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20 }}>
          {entree && (
            <Link href={`/mo/${entree.slug}`} className="bouton bouton--contour">
              {entree.mot}
            </Link>
          )}
          <a href="/proposer" className="bouton bouton--principal">
            {l.encore}
          </a>
        </div>
      </div>
    );
  }

  function choisirType(nouveau) {
    setType(nouveau);
    // Passer de « corriger tel mot » à « ajouter » repart d'une fiche vide
    if (entree && nouveau !== 'correction') router.replace(`/proposer?type=${nouveau}`);
  }

  return (
    <form action={action} ref={haut}>
      <input type="hidden" name="debut" value={debut} />
      <input type="hidden" name="type" value={type} />
      {entree && <input type="hidden" name="entree_id" value={entree.id} />}
      <div className="piege" aria-hidden="true">
        <label>
          Site web
          <input type="text" name="site_web" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {etat?.erreur && (
        <div className="alerte alerte--erreur" role="alert">
          {l[etat.erreur] ?? l.erreurTechnique}
        </div>
      )}

      <fieldset className="choix-type">
        <legend>{l.type}</legend>
        {[
          ['ajout', l.typeAjout],
          ['correction', l.typeCorrection],
          ['remarque', l.typeRemarque],
        ].map(([valeur, libelle]) => (
          <label key={valeur}>
            <input type="radio" name="choix_type" value={valeur} checked={type === valeur} onChange={() => choisirType(valeur)} />
            {libelle}
          </label>
        ))}
      </fieldset>

      {type === 'correction' && !entree && (
        <div className="champ">
          <span className="champ__libelle">{l.choisirMot}</span>
          <p className="champ__aide">{l.choisirMotAide}</p>
          <ChoixMot />
        </div>
      )}

      {type === 'correction' && entree && (
        <div className="alerte alerte--info" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span>
            <IconeCrayon taille={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
            {f(l.corrige, { mot: entree.mot })}
          </span>
          <Link href="/proposer?type=correction" className="lien">
            {l.changerMot}
          </Link>
        </div>
      )}

      {type === 'ajout' && <EditeurFiche key="ajout" ficheInitiale={null} l={l} />}
      {type === 'correction' && entree && <EditeurFiche key={entree.slug} ficheInitiale={entree.fiche} l={l} />}

      {(type !== 'correction' || entree) && (
        <>
          <div className="champ" style={{ marginTop: 24 }}>
            <label htmlFor="message">
              {l.message} {type !== 'remarque' && <span className="champ__facultatif">({l.facultatif})</span>}
            </label>
            <textarea id="message" name="message" className="saisie" rows={4} maxLength={5000} required={type === 'remarque'} />
            <p className="champ__aide">{l.messageAide}</p>
          </div>

          <div className="grille-2">
            <div className="champ">
              <label htmlFor="nom">
                {l.nom} <span className="champ__facultatif">({l.facultatif})</span>
              </label>
              <input id="nom" name="nom" className="saisie" maxLength={120} autoComplete="name" />
            </div>
            <div className="champ">
              <label htmlFor="email">
                {l.email} <span className="champ__facultatif">({l.facultatif})</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="saisie"
                maxLength={190}
                autoComplete="email"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
              />
            </div>
          </div>
          {adresse && type !== 'remarque' && (
            <label className="case" style={{ marginBottom: 18 }}>
              <input type="checkbox" name="notifier" defaultChecked />
              {l.notifier}
            </label>
          )}

          <p className="champ__aide" style={{ marginBottom: 16 }}>
            {l.rgpd}{' '}
            <Link className="lien" href="/confidentialite" target="_blank">
              {l.enSavoirPlus}
            </Link>
          </p>

          <button type="submit" className="bouton bouton--corail" disabled={enCours}>
            {enCours ? l.envoi : l.envoyer}
          </button>
        </>
      )}

      <p className="champ__aide" style={{ marginTop: 24, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <IconeMail taille={16} /> {l.contact}{' '}
        <a className="lien" href={`mailto:${email}`}>
          {email}
        </a>
      </p>
    </form>
  );
}

// Choix du mot à corriger (sans <form> imbriqué) : mène à /proposer?mot=…
function ChoixMot() {
  const { t } = useTextes();
  const [valeur, setValeur] = useState('');
  const [propositions, setPropositions] = useState([]);

  useEffect(() => {
    const q = valeur.trim();
    if (!q) return setPropositions([]);
    const controleur = new AbortController();
    const minuterie = setTimeout(async () => {
      try {
        const reponse = await fetch(`/api/autocompletion?q=${encodeURIComponent(q)}&dir=kr`, { signal: controleur.signal });
        if (reponse.ok) setPropositions(await reponse.json());
      } catch {
        /* requête annulée */
      }
    }, 140);
    return () => {
      clearTimeout(minuterie);
      controleur.abort();
    };
  }, [valeur]);

  return (
    <div className="recherche">
      <input
        className="saisie"
        type="search"
        value={valeur}
        placeholder={t.recherche.placeholderKr}
        autoComplete="off"
        onChange={(e) => setValeur(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (propositions[0]) window.location.assign(`/proposer?mot=${propositions[0].href.slice(4)}`);
          }
        }}
      />
      {propositions.length > 0 && (
        <ul className="propositions" role="listbox">
          {propositions.map((p) => (
            <li key={p.href} role="option" aria-selected="false">
              <a href={`/proposer?mot=${p.href.slice(4)}`}>
                <span className="propositions__libelle">{p.libelle}</span>
                {p.detail && <span className="propositions__detail">{p.detail}</span>}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
