const TYPES = { ajout: 'Nouveau mot', correction: 'Correction', remarque: 'Remarque' };
const STATUTS = { en_attente: 'En attente', validee: 'Validée', rejetee: 'Rejetée' };

export const libelleType = (type) => TYPES[type] ?? type;
export const libelleStatut = (statut) => STATUTS[statut] ?? statut;

// Les dates MySQL arrivent en texte « AAAA-MM-JJ HH:MM:SS » (UTC côté serveur)
export function dateHeure(valeur) {
  if (!valeur) return '—';
  const d = new Date(`${String(valeur).replace(' ', 'T')}Z`);
  if (Number.isNaN(d.getTime())) return String(valeur);
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'America/Guadeloupe',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function extrait(texte, longueur = 90) {
  const t = String(texte ?? '');
  return t.length > longueur ? `${t.slice(0, longueur)}…` : t;
}
