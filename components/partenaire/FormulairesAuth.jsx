'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { connexionPartenaire, definirMotDePasseAction, demanderReinitialisation } from '@/app/partenaire/actions';

export function FormulaireConnexionPartenaire() {
  const [etat, action, enCours] = useActionState(connexionPartenaire, null);
  // Champ contrôlé : React vide le formulaire après un envoi refusé
  const [email, setEmail] = useState('');
  return (
    <form action={action}>
      {etat?.erreur && (
        <div className="alerte alerte--erreur" role="alert">
          {etat.erreur}
        </div>
      )}
      <div className="champ">
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          className="saisie"
          required
          autoFocus
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="champ">
        <label htmlFor="mot_de_passe">Mot de passe</label>
        <input id="mot_de_passe" name="mot_de_passe" type="password" className="saisie" required autoComplete="current-password" />
      </div>
      <button type="submit" className="bouton bouton--principal bouton--bloc" disabled={enCours}>
        {enCours ? 'Connexion…' : 'Se connecter'}
      </button>
      <p className="champ__aide" style={{ marginTop: 14 }}>
        <Link className="lien" href="/partenaire/mot-de-passe-oublie">
          Mot de passe oublié ?
        </Link>
      </p>
    </form>
  );
}

export function FormulaireOubli() {
  const [etat, action, enCours] = useActionState(demanderReinitialisation, null);
  if (etat?.ok) {
    return (
      <div className="alerte alerte--succes" role="status">
        Si un compte existe pour cette adresse, un lien vient d’être envoyé. Il est valable une heure et ne fonctionne qu’une fois.
      </div>
    );
  }
  return (
    <form action={action}>
      <p className="champ__aide" style={{ marginBottom: 14 }}>
        Indiquez l’adresse de votre compte : nous vous enverrons un lien pour choisir un nouveau mot de passe.
      </p>
      <div className="champ">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" className="saisie" required autoFocus autoComplete="email" />
      </div>
      <button type="submit" className="bouton bouton--principal bouton--bloc" disabled={enCours}>
        {enCours ? 'Envoi…' : 'Envoyer le lien'}
      </button>
    </form>
  );
}

export function FormulaireMotDePasse({ jeton, invitation }) {
  const [etat, action, enCours] = useActionState(definirMotDePasseAction, null);
  return (
    <form action={action}>
      <input type="hidden" name="jeton" value={jeton} />
      {etat?.erreur && (
        <div className="alerte alerte--erreur" role="alert">
          {etat.erreur}
        </div>
      )}
      <p className="champ__aide" style={{ marginBottom: 14 }}>
        {invitation
          ? 'Choisissez le mot de passe de votre espace partenaire.'
          : 'Choisissez un nouveau mot de passe. Vos sessions ouvertes seront déconnectées.'}
      </p>
      <div className="champ">
        <label htmlFor="mot_de_passe">Mot de passe</label>
        <input
          id="mot_de_passe"
          name="mot_de_passe"
          type="password"
          className="saisie"
          required
          minLength={12}
          autoFocus
          autoComplete="new-password"
        />
        <p className="champ__aide">Au moins douze caractères. Une phrase facile à retenir fait un très bon mot de passe.</p>
      </div>
      <div className="champ">
        <label htmlFor="confirmation">Confirmation</label>
        <input id="confirmation" name="confirmation" type="password" className="saisie" required autoComplete="new-password" />
      </div>
      <button type="submit" className="bouton bouton--principal bouton--bloc" disabled={enCours}>
        {enCours ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  );
}
