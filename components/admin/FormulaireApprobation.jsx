'use client';

import { useActionState } from 'react';
import { approuverDemande } from '@/app/admin/actions-partenaires';

// Création du compte partenaire à partir d'une demande (envoie l'invitation)
export default function FormulaireApprobation({ demande }) {
  const [etat, action, enCours] = useActionState(approuverDemande, null);

  return (
    <form action={action} style={{ display: 'grid', gap: 8 }}>
      <input type="hidden" name="demande_id" value={demande.id} />
      {etat?.erreur && (
        <div className="alerte alerte--erreur" role="alert">
          {etat.erreur}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="champ" style={{ marginBottom: 0, flex: 1, minWidth: 180 }}>
          <label htmlFor={`nom-${demande.id}`}>Nom du partenaire</label>
          <input id={`nom-${demande.id}`} name="name" className="saisie" defaultValue={demande.name} maxLength={120} />
        </div>
        <div className="champ" style={{ marginBottom: 0 }}>
          <label htmlFor={`usage-${demande.id}`}>Usage</label>
          <select id={`usage-${demande.id}`} name="usage_type" className="saisie">
            <option value="non_commercial">Non commercial</option>
            <option value="commercial_autorise">Commercial autorisé</option>
          </select>
        </div>
        <button type="submit" className="bouton bouton--turquoise" disabled={enCours}>
          {enCours ? 'Création…' : 'Créer le compte et inviter'}
        </button>
      </div>
    </form>
  );
}
