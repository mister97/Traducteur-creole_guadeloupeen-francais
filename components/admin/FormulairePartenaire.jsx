'use client';

import { useActionState, useState } from 'react';
import { ajouterPartenaire } from '@/app/admin/actions-partenaires';

// Ajout d'un partenaire sans demande préalable. Champs contrôlés : React vide
// un formulaire après chaque envoi, y compris refusé.
export default function FormulairePartenaire() {
  const [etat, action, enCours] = useActionState(ajouterPartenaire, null);
  const [ouvert, setOuvert] = useState(false);
  const [valeurs, setValeurs] = useState({ name: '', contact_email: '', site_url: '' });
  const maj = (champ) => (e) => setValeurs((v) => ({ ...v, [champ]: e.target.value }));

  if (!ouvert) {
    return (
      <button type="button" className="bouton bouton--turquoise" onClick={() => setOuvert(true)}>
        + Ajouter un partenaire
      </button>
    );
  }

  return (
    <form action={action} className="carte admin-bloc" style={{ marginBottom: 20 }}>
      <h2>Nouveau partenaire</h2>
      <p className="tableau__discret">
        Le compte est créé puis invité par e-mail à définir son mot de passe. Utile quand l’accès est convenu sans passer par le
        formulaire public.
      </p>

      {etat?.erreur && (
        <div className="alerte alerte--erreur" role="alert">
          {etat.erreur}
        </div>
      )}

      <div className="grille-2">
        <div className="champ">
          <label htmlFor="p-nom">Nom ou structure</label>
          <input id="p-nom" name="name" className="saisie" maxLength={120} required value={valeurs.name} onChange={maj('name')} />
        </div>
        <div className="champ">
          <label htmlFor="p-email">E-mail</label>
          <input
            id="p-email"
            name="contact_email"
            type="email"
            className="saisie"
            maxLength={190}
            required
            value={valeurs.contact_email}
            onChange={maj('contact_email')}
          />
        </div>
        <div className="champ">
          <label htmlFor="p-site">
            Site <span className="champ__facultatif">(facultatif)</span>
          </label>
          <input
            id="p-site"
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
          <label htmlFor="p-usage">Usage</label>
          <select id="p-usage" name="usage_type" className="saisie">
            <option value="non_commercial">Non commercial</option>
            <option value="commercial_autorise">Commercial autorisé</option>
          </select>
        </div>
      </div>

      <label className="case" style={{ marginBottom: 16 }}>
        <input type="checkbox" name="export_autorise" />
        <span>Autoriser l’export complet du dictionnaire (/api/v1/export)</span>
      </label>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="submit" className="bouton bouton--turquoise" disabled={enCours}>
          {enCours ? 'Création…' : 'Créer le compte et inviter'}
        </button>
        <button type="button" className="bouton bouton--blanc" onClick={() => setOuvert(false)}>
          Annuler
        </button>
      </div>
    </form>
  );
}
