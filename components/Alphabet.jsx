import Link from 'next/link';
import { ALPHABET } from '@/lib/alphabet';

// presentes : Set des lettres qui ont des mots ('A', 'CH'…) ; actuelle : lettre de la page
export default function Alphabet({ presentes, actuelle, style }) {
  return (
    <nav className="alphabet" style={style}>
      {ALPHABET.map((l) =>
        presentes.has(l) ? (
          <Link key={l} href={`/lettre/${l.toLowerCase()}`} aria-current={l === actuelle ? 'page' : undefined}>
            {l}
          </Link>
        ) : (
          <span key={l} aria-hidden="true">
            {l}
          </span>
        ),
      )}
    </nav>
  );
}
