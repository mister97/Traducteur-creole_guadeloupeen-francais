'use client';

import { useActionState, useState } from 'react';
import BlocCopiable from '@/components/BlocCopiable';
import { inviterUtilisateur } from '@/app/admin/actions-comptes';

// Création d'un compte d'administration. Champs contrôlés : React vide un
// formulaire après chaque envoi, y compris refusé.
export default function FormulaireUtilisateur() {
  const [etat, action, enCours] = useActionState(inviterUtilisateur, null);
  const [ouvert, setOuvert] = useState(false);
  const [valeurs, setValeurs] = useState({ nom: '', email: '', role: 'editeur' });
  const maj = (champ) => (e) => setValeurs((v) => ({ ...v, [champ]: e.target.value }));

  // Le lien n'est affiché qu'une fois : seule son empreinte est conservée en base
  if (etat?.lien) {
    return (
      <div className="carte admin-bloc" style={{ marginBottom: 20 }}>
        <div className="alerte alerte--succes">{etat.ok}</div>
        {etat.envoye ? (
          <p>L’invitation a été envoyée par e-mail. Le lien ci-dessous est le même, si vous préférez le transmettre vous-même.</p>
        ) : (
          <div className="alerte alerte--erreur">
            L’e-mail n’est pas parti : SMTP non configuré ou indisponible. Transmettez ce lien à la personne par un autre moyen.
          </div>
        )}
        <BlocCopiable texte={etat.lien} libelle="Copier le lien" confirmation="Lien copié !" />
        <p className="tableau__discret">
          Valable {etat.heures} heures, utilisable une seule fois. Il ne sera plus affiché : s’il se perd, régénérez-en un depuis la
          liste.
        </p>
        <button
          type="button"
          className="bouton bouton--blanc"
          onClick={() => {
            setValeurs({ nom: '', email: '', role: 'editeur' });
            setOuvert(false);
            window.location.reload();
          }}
        >
          Terminé
        </button>
      </div>
    );
  }

  if (!ouvert) {
    return (
      <button type="button" className="bouton bouton--turquoise" onClick={() => setOuvert(true)}>
        + Ajouter une personne
      </button>
    );
  }

  return (
    <form action={action} className="carte admin-bloc" style={{ marginBottom: 20 }}>
      <h2>Nouveau compte</h2>
      <p className="tableau__discret">
        La personne reçoit un lien pour choisir son mot de passe. Vous ne définissez jamais le mot de passe de quelqu’un d’autre.
      </p>

      {etat?.erreur && (
        <div className="alerte alerte--erreur" role="alert">
          {etat.erreur}
        </div>
      )}

      <div className="champ">
        <label htmlFor="u-nom">Nom</label>
        <input id="u-nom" name="nom" className="saisie" required maxLength={120} value={valeurs.nom} onChange={maj('nom')} />
      </div>
      <div className="champ">
        <label htmlFor="u-email">Adresse e-mail</label>
        <input
          id="u-email"
          name="email"
          type="email"
          className="saisie"
          required
          maxLength={190}
          value={valeurs.email}
          onChange={maj('email')}
        />
        <p className="champ__aide">C’est l’identifiant de connexion, et l’adresse qui reçoit l’invitation.</p>
      </div>
      <div className="champ">
        <label htmlFor="u-role">Rôle</label>
        <select id="u-role" name="role" className="saisie" value={valeurs.role} onChange={maj('role')}>
          <option value="editeur">Éditeur — dictionnaire, suggestions, partenaires</option>
          <option value="proprietaire">Propriétaire — en plus : gestion des comptes</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="submit" className="bouton bouton--principal" disabled={enCours}>
          {enCours ? 'Création…' : 'Créer le compte'}
        </button>
        <button type="button" className="bouton bouton--blanc" onClick={() => setOuvert(false)}>
          Annuler
        </button>
      </div>
    </form>
  );
}
