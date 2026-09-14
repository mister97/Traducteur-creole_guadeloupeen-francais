'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useTextes } from './FournisseurTextes';

export default function ChoixLangue() {
  const { langue, t } = useTextes();
  const router = useRouter();
  const [enCours, demarrer] = useTransition();

  function choisir(code) {
    if (code === langue) return;
    document.cookie = `langue=${code}; path=/; max-age=31536000; samesite=lax`;
    demarrer(() => router.refresh());
  }

  return (
    <div className="choix-langue" role="group" aria-label={t.langue.titre} aria-busy={enCours}>
      {['kr', 'fr'].map((code) => (
        <button key={code} type="button" aria-pressed={langue === code} onClick={() => choisir(code)} title={t.langue[code]}>
          {code === 'kr' ? 'KR' : 'FR'}
        </button>
      ))}
    </div>
  );
}
