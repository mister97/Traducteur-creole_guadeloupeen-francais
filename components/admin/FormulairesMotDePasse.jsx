'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { changerMonMotDePasse, definirMonMotDePasse, demanderReinitialisation } from '@/app/admin/actions-comptes';

// Doit rester cohérent avec LONGUEUR_MOT_DE_PASSE (lib/mots-de-passe.js), que ce
// composant client ne peut pas importer : ce module charge un binaire natif.
const AIDE = 'Au moins douze caractères. Une phrase facile à retenir fait un très bon mot de passe.';

// Depuis un lien d'invitation ou de réinitialisation
export function FormulaireDefinition({ jeton, invitation }) {
  const [etat, action, enCours] = useActionState(definirMonMotDePasse, null);
  return (
    <form action={action}>
      <input type="hidden" name="jeton" value={jeton} />
      {etat?.erreur && (
        <div className="alerte alerte--erreur" role="alert">
          {etat.erreur}
        </div>
      )}
      <p className="tableau__discret">
        {invitation
          ? 'Choisissez votre mot de passe pour activer votre compte. Toutes vos actions seront enregistrées à votre nom.'
          : 'Choisissez un nouveau mot de passe. Vos autres sessions seront fermées.'}
      </p>
      <div className="champ">
        <label htmlFor="mot_de_passe">Mot de passe</label>
        <input id="mot_de_passe" name="mot_de_passe" type="password" className="saisie" required autoFocus autoComplete="new-password" />
        <p className="champ__aide">{AIDE}</p>
      </div>
      <div className="champ">
        <label htmlFor="confirmation">Répétez le mot de passe</label>
        <input id="confirmation" name="confirmation" type="password" className="saisie" required autoComplete="new-password" />
      </div>
      <button type="submit" className="bouton bouton--principal bouton--bloc" disabled={enCours}>
        {enCours ? 'Enregistrement…' : 'Enregistrer et me connecter'}
      </button>
    </form>
  );
}

// Page publique : la réponse est la même, que l'adresse existe ou non
export function FormulaireOubli() {
  const [etat, action, enCours] = useActionState(demanderReinitialisation, null);
  const [email, setEmail] = useState('');

  if (etat?.ok) {
    return (
      <>
        <div className="alerte alerte--succes">{etat.ok}</div>
        <p>
          <Link className="bouton bouton--blanc bouton--bloc" href="/admin/connexion">
            Retour à la connexion
          </Link>
        </p>
      </>
    );
  }

  return (
    <form action={action}>
      <p className="tableau__discret">
        Indiquez l’adresse de votre compte : vous recevrez un lien valable une heure, utilisable une seule fois.
      </p>
      <div className="champ">
        <label htmlFor="email">Adresse e-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          className="saisie"
          required
          autoFocus
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <button type="submit" className="bouton bouton--principal bouton--bloc" disabled={enCours}>
        {enCours ? 'Envoi…' : 'Envoyer le lien'}
      </button>
      <p style={{ textAlign: 'center', marginTop: 14 }}>
        <Link className="lien" href="/admin/connexion">
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}

// Depuis l'espace connecté
export function FormulaireChangement() {
  const [etat, action, enCours] = useActionState(changerMonMotDePasse, null);
  return (
    <form action={action} className="carte admin-bloc">
      <h2>Changer mon mot de passe</h2>
      {etat?.erreur && (
        <div className="alerte alerte--erreur" role="alert">
          {etat.erreur}
        </div>
      )}
      {etat?.ok && <div className="alerte alerte--succes">{etat.ok}</div>}
      <div className="champ">
        <label htmlFor="actuel">Mot de passe actuel</label>
        <input id="actuel" name="actuel" type="password" className="saisie" required autoComplete="current-password" />
      </div>
      <div className="champ">
        <label htmlFor="nouveau">Nouveau mot de passe</label>
        <input id="nouveau" name="mot_de_passe" type="password" className="saisie" required autoComplete="new-password" />
        <p className="champ__aide">{AIDE}</p>
      </div>
      <div className="champ">
        <label htmlFor="confirmation2">Répétez le nouveau mot de passe</label>
        <input id="confirmation2" name="confirmation" type="password" className="saisie" required autoComplete="new-password" />
      </div>
      <button type="submit" className="bouton bouton--principal" disabled={enCours}>
        {enCours ? 'Enregistrement…' : 'Changer le mot de passe'}
      </button>
    </form>
  );
}
