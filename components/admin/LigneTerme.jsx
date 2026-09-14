'use client';

import { useActionState } from 'react';
import { modifierTerme } from '@/app/admin/actions';

export default function LigneTerme({ terme }) {
  const [etat, action, enCours] = useActionState(modifierTerme, null);
  return (
    <form action={action} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <input type="hidden" name="id" value={terme.id} />
      <input name="terme" defaultValue={terme.terme} className="saisie" style={{ padding: '6px 10px', maxWidth: 280 }} aria-label="Terme" />
      <button type="submit" className="bouton bouton--blanc bouton--petit" disabled={enCours}>
        {enCours ? '…' : 'Renommer'}
      </button>
      {etat?.ok && <span className="tableau__discret">{etat.ok}</span>}
      {etat?.erreur && <span style={{ color: '#b3300f', fontWeight: 700 }}>{etat.erreur}</span>}
    </form>
  );
}
