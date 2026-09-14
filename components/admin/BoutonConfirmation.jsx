'use client';

// Bouton d'envoi qui demande confirmation (suppressions)
export default function BoutonConfirmation({ message, children, className = 'bouton bouton--danger' }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
