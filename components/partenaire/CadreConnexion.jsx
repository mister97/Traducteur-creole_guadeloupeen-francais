import Link from 'next/link';

// Habillage des pages sans session (connexion, mot de passe)
export default function CadreConnexion({ titre, children }) {
  return (
    <div className="partenaire__centre">
      <div className="carte">
        <div className="partenaire__marque" style={{ marginBottom: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-header.png" alt="" />
          <span>
            Chalviraj
            <small>Espace partenaire</small>
          </span>
        </div>
        <h1 className="page-titre" style={{ fontSize: '1.5rem', marginBottom: 16 }}>
          {titre}
        </h1>
        {children}
        <p className="champ__aide" style={{ marginTop: 20 }}>
          <Link className="lien" href="/api">
            Documentation de l’API
          </Link>{' '}
          ·{' '}
          <Link className="lien" href="/">
            Retour au dictionnaire
          </Link>
        </p>
      </div>
    </div>
  );
}
