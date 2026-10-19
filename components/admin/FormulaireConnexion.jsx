'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { connexion } from '@/app/admin/actions';

export default function FormulaireConnexion() {
  const [etat, action, enCours] = useActionState(connexion, null);
  // Champ contrôlé : React vide un formulaire après chaque envoi, y compris refusé.
  const [email, setEmail] = useState('');

  return (
    <form action={action}>
      {etat?.erreur && (
        <div className="alerte alerte--erreur" role="alert">
          {etat.erreur}
        </div>
      )}
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
      <div className="champ">
        <label htmlFor="mot_de_passe">Mot de passe</label>
        <input id="mot_de_passe" name="mot_de_passe" type="password" className="saisie" required autoComplete="current-password" />
      </div>
      <button type="submit" className="bouton bouton--principal bouton--bloc" disabled={enCours}>
        {enCours ? 'Connexion…' : 'Se connecter'}
      </button>
      <p style={{ textAlign: 'center', marginTop: 14 }}>
        <Link className="lien" href="/admin/mot-de-passe-oublie">
          Mot de passe oublié ?
        </Link>
      </p>
    </form>
  );
}
