'use client';

import { useEffect, useState } from 'react';

// Décompte jusqu'à l'ouverture. Rien n'est affiché au premier rendu serveur :
// l'heure du visiteur et celle du serveur ne coïncident jamais exactement, et
// un écart suffirait à casser l'hydratation.
export default function Decompte({ instant, libelles }) {
  const [reste, setReste] = useState(null);

  useEffect(() => {
    const calculer = () => setReste(Math.max(0, instant - Date.now()));
    calculer();
    const minuteur = setInterval(calculer, 1000);
    return () => clearInterval(minuteur);
  }, [instant]);

  const total = Math.floor((reste ?? 0) / 1000);
  const cases = [
    { valeur: Math.floor(total / 86400), libelle: libelles.jours },
    { valeur: Math.floor((total % 86400) / 3600), libelle: libelles.heures },
    { valeur: Math.floor((total % 3600) / 60), libelle: libelles.minutes },
    { valeur: total % 60, libelle: libelles.secondes },
  ];

  return (
    <div className="decompte" aria-live="off">
      {cases.map((c) => (
        <div key={c.libelle} className="decompte__case">
          <div className="decompte__valeur">{reste === null ? '––' : String(c.valeur).padStart(2, '0')}</div>
          <div className="decompte__libelle">{c.libelle}</div>
        </div>
      ))}
    </div>
  );
}
