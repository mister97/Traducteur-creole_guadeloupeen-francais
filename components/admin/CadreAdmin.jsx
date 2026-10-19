// Cadre des pages d'authentification de l'administration (connexion,
// mot de passe oublié, choix du mot de passe).
export default function CadreAdmin({ titre, children }) {
  return (
    <div className="connexion">
      <div className="carte">
        <div className="admin__marque" style={{ color: 'var(--encre)', padding: '0 0 16px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-header.png" alt="" />
          <span>
            Chalviraj
            <small style={{ color: 'var(--turquoise-fonce)' }}>Administration</small>
          </span>
        </div>
        {titre && <h1 className="section__titre" style={{ fontSize: '1.3rem', marginTop: 0 }}>{titre}</h1>}
        {children}
      </div>
    </div>
  );
}
