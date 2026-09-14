'use client';

import { useActionState } from 'react';
import { validerSuggestion } from '@/app/admin/actions';
import EditeurFiche from '@/components/EditeurFiche';
import { TEXTES } from '@/lib/textes';

export default function ValidationSuggestion({ suggestion, cible, ficheInitiale }) {
  const [etat, action, enCours] = useActionState(validerSuggestion, null);
  const remarque = suggestion.type === 'remarque';

  return (
    <form action={action} className="carte admin-bloc">
      <h2>{remarque ? 'Traiter la remarque' : cible ? `Fiche à enregistrer (remplace « ${cible.mot} »)` : 'Nouveau mot à enregistrer'}</h2>
      <input type="hidden" name="suggestion_id" value={suggestion.id} />
      {cible && <input type="hidden" name="entree_cible" value={cible.id} />}

      {etat?.erreur && (
        <div className="alerte alerte--erreur" role="alert">
          {etat.erreur}
        </div>
      )}

      {!remarque && (
        <>
          <p className="tableau__discret">Vous pouvez retoucher la fiche avant de valider : c’est cette version qui sera enregistrée.</p>
          <EditeurFiche ficheInitiale={ficheInitiale} mode="admin" l={TEXTES.fr.proposer} />
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 20 }}>
            <label className="case">
              <input type="checkbox" name="exclu_quotidien" defaultChecked={Boolean(cible?.exclu_quotidien)} />
              Exclure du mot du jour
            </label>
            <label className="case">
              <input type="checkbox" name="exclu_jeu" defaultChecked={Boolean(cible?.exclu_jeu)} />
              Exclure du jeu
            </label>
          </div>
        </>
      )}

      <div className="champ" style={{ marginTop: 20 }}>
        <label htmlFor="note-validation">Note interne (facultatif)</label>
        <textarea id="note-validation" name="note" className="saisie" rows={2} />
      </div>

      {suggestion.peutPrevenir && (
        <label className="case">
          <input type="checkbox" name="prevenir" defaultChecked />
          Envoyer un mail de remerciement à l’auteur
        </label>
      )}

      <div className="barre-actions">
        <button type="submit" className="bouton bouton--turquoise" disabled={enCours}>
          {enCours ? 'Enregistrement…' : remarque ? 'Marquer comme traitée' : 'Valider et enregistrer'}
        </button>
      </div>
    </form>
  );
}
