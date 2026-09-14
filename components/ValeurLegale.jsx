import { A_COMPLETER } from '@/lib/mentions';

// Affiche une valeur de lib/mentions.js, ou un repère rouge si elle reste à compléter
export default function ValeurLegale({ valeur }) {
  if (valeur === A_COMPLETER) return <span className="a-completer">à compléter</span>;
  return valeur;
}
