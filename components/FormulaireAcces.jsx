'use client';

import { useActionState, useState } from 'react';
import { demanderAcces } from '@/app/(site)/api/actions';

// Formulaire public de demande d'accès à l'API (et de contact licence).
// Les champs sont contrôlés : React réinitialise un formulaire après chaque
// envoi, y compris refusé, et la saisie serait sinon perdue.
export default function FormulaireAcces({ debut }) {
  const [etat, action, enCours] = useActionState(demanderAcces, null);
  const [valeurs, setValeurs] = useState({ name: '', email: '', site_url: '', usage_desc: '', non_commercial: false });
  const maj = (champ) => (e) => setValeurs((v) => ({ ...v, [champ]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  if (etat?.ok) {
    return (
      <div className="alerte alerte--succes" role="status">
        <strong>Demande envoyée.</strong> Nous l’examinons et vous répondons par e-mail. Aucun compte n’est créé automatiquement.
      </div>
    );
  }

  return (
    <form action={action} className="carte" style={{ marginTop: 16 }}>
      <input type="hidden" name="debut" value={debut} />
      <div className="piege" aria-hidden="true">
        <label>
          Site web
          <input type="text" name="site_web" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {etat?.erreur && (
        <div className="alerte alerte--erreur" role="alert">
          {etat.erreur}
        </div>
      )}

      <div className="grille-2">
        <div className="champ">
          <label htmlFor="name">Nom ou structure</label>
          <input
            id="name"
            name="name"
            className="saisie"
            maxLength={120}
            required
            autoComplete="organization"
            value={valeurs.name}
            onChange={maj('name')}
          />
        </div>
        <div className="champ">
          <label htmlFor="email-acces">E-mail</label>
          <input
            id="email-acces"
            name="email"
            type="email"
            className="saisie"
            maxLength={190}
            required
            autoComplete="email"
            value={valeurs.email}
            onChange={maj('email')}
          />
        </div>
      </div>

      <div className="champ">
        <label htmlFor="site_url">
          Adresse du site <span className="champ__facultatif">(facultatif)</span>
        </label>
        <input
          id="site_url"
          name="site_url"
          type="url"
          className="saisie"
          maxLength={190}
          placeholder="https://"
          value={valeurs.site_url}
          onChange={maj('site_url')}
        />
      </div>

      <div className="champ">
        <label htmlFor="usage_desc">Usage prévu</label>
        <textarea
          id="usage_desc"
          name="usage_desc"
          className="saisie"
          rows={4}
          maxLength={3000}
          required
          value={valeurs.usage_desc}
          onChange={maj('usage_desc')}
        />
        <p className="champ__aide">Que voulez-vous faire des données, pour quel public, et à quel rythme interrogeriez-vous l’API ?</p>
      </div>

      <label className="case" style={{ marginBottom: 18 }}>
        <input type="checkbox" name="non_commercial" checked={valeurs.non_commercial} onChange={maj('non_commercial')} />
        <span>Je déclare que cet usage est non commercial, au sens de la licence CC BY-NC-SA 4.0.</span>
      </label>

      <button type="submit" className="bouton bouton--corail" disabled={enCours}>
        {enCours ? 'Envoi…' : 'Envoyer la demande'}
      </button>
    </form>
  );
}
