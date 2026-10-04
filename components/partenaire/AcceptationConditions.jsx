'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';
import { accepterConditions } from '@/app/partenaire/actions';

// Écran bloquant : tant que les conditions en cours ne sont pas acceptées,
// le reste de l'espace est inaccessible et les clés renvoient 403.
export default function AcceptationConditions({ version, html, nouvelleVersion }) {
  const [etat, action, enCours] = useActionState(accepterConditions, null);
  const router = useRouter();

  useEffect(() => {
    if (etat?.ok) router.refresh();
  }, [etat, router]);

  return (
    <div className="carte">
      <h1 className="page-titre" style={{ fontSize: '1.6rem', marginBottom: 8 }}>
        {nouvelleVersion ? 'Nouvelle version des conditions' : 'Conditions d’utilisation de l’API'}
      </h1>
      <p className="champ__aide" style={{ marginBottom: 16 }}>
        {nouvelleVersion
          ? `Les conditions ont évolué (version ${version}). Acceptez-les pour continuer à utiliser vos clés.`
          : `Version ${version}. Leur acceptation est nécessaire pour créer une clé et utiliser l’API.`}
      </p>

      {etat?.erreur && (
        <div className="alerte alerte--erreur" role="alert">
          {etat.erreur}
        </div>
      )}

      <div
        className="texte-page"
        style={{
          maxHeight: '50vh',
          overflowY: 'auto',
          border: '1px solid var(--sable-clair)',
          borderRadius: 'var(--rayon-moyen)',
          padding: '16px 18px',
          marginBottom: 18,
          background: '#fff',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <form action={action}>
        <label className="case" style={{ marginBottom: 16 }}>
          <input type="checkbox" name="accepte" />
          <span>J’ai lu et j’accepte les conditions d’utilisation de l’API, version {version}.</span>
        </label>
        <button type="submit" className="bouton bouton--turquoise" disabled={enCours}>
          {enCours ? 'Enregistrement…' : 'Accepter et continuer'}
        </button>
      </form>
    </div>
  );
}
