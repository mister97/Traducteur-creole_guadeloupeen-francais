'use client';

import { useRef, useState } from 'react';

// Bloc de texte copiable en un clic (chaîne d'attribution, exemples curl…).
// Un clic sur le texte le sélectionne entièrement, pour une copie manuelle.
export default function BlocCopiable({ texte, libelle = 'Copier', confirmation = 'Copié !' }) {
  const bloc = useRef(null);
  const [copie, setCopie] = useState(false);

  async function copier() {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      selectionner(); // presse-papiers indisponible : au moins, le texte est sélectionné
    }
  }

  function selectionner() {
    if (bloc.current) getSelection()?.selectAllChildren(bloc.current);
  }

  return (
    <div className="bloc-copiable">
      <pre ref={bloc} onClick={selectionner}>
        {texte}
      </pre>
      <button type="button" className="bouton bouton--blanc bouton--petit" onClick={copier}>
        {copie ? confirmation : libelle}
      </button>
    </div>
  );
}
