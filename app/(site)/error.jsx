'use client';

import { useEffect } from 'react';
import { useTextes } from '@/components/FournisseurTextes';

export default function Erreur({ error, retry: reessayer, reset }) {
  const { t } = useTextes();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="conteneur conteneur--etroit message-vide" style={{ paddingBlock: 80 }}>
      <h1 className="page-titre" style={{ marginBottom: 12 }}>
        {t.erreurs.techniqueTitre}
      </h1>
      <p>{t.erreurs.techniqueTexte}</p>
      <button type="button" className="bouton bouton--principal" onClick={() => (reessayer ?? reset)?.()}>
        {t.erreurs.reessayer}
      </button>
    </div>
  );
}
