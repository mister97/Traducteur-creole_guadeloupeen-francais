'use client';

import { useActionState } from 'react';
import { connexion } from '@/app/admin/actions';

export default function FormulaireConnexion() {
  const [etat, action, enCours] = useActionState(connexion, null);
  return (
    <form action={action}>
      {etat?.erreur && (
        <div className="alerte alerte--erreur" role="alert">
          {etat.erreur}
        </div>
      )}
      <div className="champ">
        <label htmlFor="mot_de_passe">Mot de passe</label>
        <input id="mot_de_passe" name="mot_de_passe" type="password" className="saisie" required autoFocus autoComplete="current-password" />
      </div>
      <button type="submit" className="bouton bouton--principal bouton--bloc" disabled={enCours}>
        {enCours ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  );
}
