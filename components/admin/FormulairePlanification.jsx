'use client';

import { useActionState } from 'react';
import { planifierMot } from '@/app/admin/actions';

export default function FormulairePlanification({ jourParDefaut }) {
  const [etat, action, enCours] = useActionState(planifierMot, null);
  return (
    <form action={action}>
      {etat?.erreur && <div className="alerte alerte--erreur">{etat.erreur}</div>}
      {etat?.ok && <div className="alerte alerte--succes">{etat.ok}</div>}
      <div className="champ">
        <label htmlFor="jour">Date</label>
        <input id="jour" name="jour" type="date" className="saisie" defaultValue={jourParDefaut} required />
      </div>
      <div className="champ">
        <label htmlFor="type">Pour</label>
        <select id="type" name="type" className="saisie">
          <option value="mot">Mot du jour</option>
          <option value="jeu">Mo kaché (5 lettres)</option>
        </select>
      </div>
      <div className="champ">
        <label htmlFor="mot">Mot</label>
        <input id="mot" name="mot" className="saisie" placeholder="ex. MANJÉ ou manje" required />
      </div>
      <button type="submit" className="bouton bouton--turquoise" disabled={enCours}>
        Programmer
      </button>
    </form>
  );
}
