'use client';

import { useEffect, useRef } from 'react';

const CLE = 'chalviraj-annonce-nom';

// Annonce du changement de nom, montrée une seule fois par navigateur.
// <dialog> natif : la touche Échap, le piège à focus et le retour au bouton
// d'origine sont gérés par le navigateur, sans code de notre part.
export default function AnnonceNom({ t, ancienNom, ancienDomaine, nouveauDomaine }) {
  const boite = useRef(null);

  useEffect(() => {
    let dejaVue = false;
    try {
      dejaVue = localStorage.getItem(CLE) === 'vue';
    } catch {
      // Navigation privée ou stockage refusé : on s'abstient plutôt que
      // de montrer l'annonce à chaque page.
      dejaVue = true;
    }
    if (!dejaVue) boite.current?.showModal();
  }, []);

  function retenir() {
    try {
      localStorage.setItem(CLE, 'vue');
    } catch {
      /* rien à faire : l'annonce reviendra, c'est tout */
    }
  }

  return (
    <dialog ref={boite} className="annonce" aria-labelledby="annonce-titre" onClose={retenir}>
      <p className="annonce__surtitre">{t.surtitre}</p>
      <h2 className="annonce__titre" id="annonce-titre">
        <span className="annonce__avant">{ancienNom}</span>
        <span className="annonce__fleche" aria-hidden="true">
          ↓
        </span>
        <span className="annonce__apres">Chalviraj Kréyòl Gwadloupéyen</span>
      </h2>
      <p className="annonce__texte">{t.texte}</p>
      <p className="annonce__adresses">
        <s>{ancienDomaine}</s> <span aria-hidden="true">→</span> <strong>{nouveauDomaine}</strong>
      </p>
      <form method="dialog">
        <button type="submit" className="bouton bouton--principal bouton--bloc">
          {t.compris}
        </button>
      </form>
    </dialog>
  );
}
