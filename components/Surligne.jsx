import { segmentsSurlignes } from '@/lib/surligner';

export default function Surligne({ texte, recherche, mode = 'kr' }) {
  if (!recherche) return texte;
  return segmentsSurlignes(texte, recherche, mode).map((s, i) => (s.marque ? <mark key={i}>{s.texte}</mark> : s.texte));
}
