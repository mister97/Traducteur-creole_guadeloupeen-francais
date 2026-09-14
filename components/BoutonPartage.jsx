'use client';

import { useState } from 'react';
import { IconePartage } from './Icones';

export default function BoutonPartage({ titre, libelle, confirmation, className = 'bouton bouton--blanc bouton--bloc' }) {
  const [copie, setCopie] = useState(false);

  async function partager() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: titre, url });
        return;
      } catch {
        /* partage annulé : on retombe sur la copie */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      /* presse-papiers indisponible */
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={partager}>
        <IconePartage taille={18} /> {libelle}
      </button>
      {copie && (
        <div className="toast" role="status">
          {confirmation}
        </div>
      )}
    </>
  );
}
