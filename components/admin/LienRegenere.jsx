'use client';

import { useActionState } from 'react';
import BlocCopiable from '@/components/BlocCopiable';
import { renvoyerLienAdmin } from '@/app/admin/actions-comptes';

// Régénère un lien d'accès (invitation ou réinitialisation) et l'affiche une
// seule fois : seule son empreinte est conservée en base.
export default function LienRegenere({ id, nom, premiere }) {
  const [etat, action, enCours] = useActionState(renvoyerLienAdmin, null);

  if (etat?.lien) {
    return (
      <div style={{ marginTop: 8 }}>
        {etat.envoye ? (
          <p className="tableau__discret" style={{ margin: '0 0 6px' }}>
            Envoyé à {nom}. Même lien ci-dessous si vous préférez le transmettre vous-même ({etat.heures} h, usage unique).
          </p>
        ) : (
          <div className="alerte alerte--erreur">L’e-mail n’est pas parti (SMTP non configuré ou indisponible) : transmettez ce lien autrement.</div>
        )}
        <BlocCopiable texte={etat.lien} libelle="Copier" confirmation="Lien copié !" />
      </div>
    );
  }

  return (
    <form action={action} style={{ display: 'inline' }}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="bouton bouton--blanc bouton--petit" disabled={enCours}>
        {enCours ? '…' : premiere ? 'Renvoyer l’invitation' : 'Réinitialiser le mot de passe'}
      </button>
      {etat?.erreur && <span className="etat etat--rejetee"> {etat.erreur}</span>}
    </form>
  );
}
