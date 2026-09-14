'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { enregistrerMot } from '@/app/admin/actions';
import EditeurFiche from '@/components/EditeurFiche';
import { TEXTES } from '@/lib/textes';

export default function FormulaireMot({ entree }) {
  const [etat, action, enCours] = useActionState(enregistrerMot, null);
  const slug = etat?.slug ?? entree?.slug;

  return (
    <form action={action}>
      {entree && <input type="hidden" name="id" value={entree.id} />}

      {etat?.erreur && (
        <div className="alerte alerte--erreur" role="alert">
          {etat.erreur}
        </div>
      )}
      {etat?.ok && (
        <div className="alerte alerte--succes" role="status">
          {etat.ok}{' '}
          {slug && (
            <Link className="lien" href={`/mo/${slug}`} target="_blank">
              Voir la fiche publique ↗
            </Link>
          )}
        </div>
      )}

      <div className="carte admin-bloc">
        <EditeurFiche key={entree?.modifie_le ?? 'nouveau'} ficheInitiale={entree?.fiche} mode="admin" l={TEXTES.fr.proposer} />
      </div>

      <div className="carte admin-bloc" style={{ marginTop: 20 }}>
        <h2>Réglages</h2>
        <div className="grille-2">
          <div className="champ">
            <label htmlFor="slug">Adresse de la fiche</label>
            <input id="slug" name="slug" className="saisie" defaultValue={entree?.slug ?? ''} placeholder="générée depuis le mot" />
            <p className="champ__aide">/mo/… — la changer casse les liens existants.</p>
          </div>
          <div style={{ display: 'grid', gap: 10, alignContent: 'center' }}>
            <label className="case">
              <input type="checkbox" name="exclu_quotidien" defaultChecked={Boolean(entree?.exclu_quotidien)} />
              Exclure du mot du jour
            </label>
            <label className="case">
              <input type="checkbox" name="exclu_jeu" defaultChecked={Boolean(entree?.exclu_jeu)} />
              Exclure du jeu Mo kaché
            </label>
          </div>
        </div>
      </div>

      <div className="barre-actions">
        <button type="submit" className="bouton bouton--turquoise" disabled={enCours}>
          {enCours ? 'Enregistrement…' : entree ? 'Enregistrer les modifications' : 'Créer le mot'}
        </button>
        <Link href="/admin/mots" className="bouton bouton--blanc">
          Retour à la liste
        </Link>
      </div>
    </form>
  );
}
