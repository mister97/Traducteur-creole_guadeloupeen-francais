'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

// Signale une page affichee, une fois par adresse visitee.
//
// Le comptage se faisait au rendu serveur : les robots qui se font passer pour
// un navigateur etaient comptes comme des visiteurs, et le 17 novembre ils ont
// gonfle les chiffres de plusieurs milliers. Ils n'executent pas le JavaScript
// de la page : compter d'ici les ecarte sans avoir a deviner qui ils sont.
//
// Le serveur ne conserve toujours ni adresse IP ni cookie : la route se charge
// de l'empreinte du jour, exactement comme avant.
export default function CompteurVisite() {
  const chemin = usePathname();
  const dejaVu = useRef(null);

  useEffect(() => {
    // React monte les effets deux fois en developpement : sans ce garde,
    // chaque page compterait double.
    if (dejaVu.current === chemin) return;
    dejaVu.current = chemin;

    const minuteur = setTimeout(() => {
      fetch('/api/visite', { method: 'POST', keepalive: true }).catch(() => {
        // Une statistique ne doit jamais deranger la lecture
      });
    }, 400);

    return () => clearTimeout(minuteur);
  }, [chemin]);

  return null;
}
