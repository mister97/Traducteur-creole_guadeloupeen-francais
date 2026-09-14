import Link from 'next/link';
import Surligne from './Surligne';

// Carte de résultat pour un mot créole (recherche, parcours par lettre)
export default function CarteMot({ mot, recherche, t, maxSens = 4 }) {
  const sens = mot.sens.slice(0, maxSens);
  const synonymes = [...new Set(mot.sens.flatMap((s) => s.synonymes.map((sy) => sy.mot)))].slice(0, 6);
  return (
    <Link href={`/mo/${mot.slug}`} className="carte resultat">
      <div className="resultat__tete">
        <h2 className="resultat__mot">
          <Surligne texte={mot.mot} recherche={recherche} />
        </h2>
        {mot.variantes.length > 0 && (
          <span className="resultat__variantes">
            <Surligne texte={mot.variantes.join(' · ')} recherche={recherche} />
          </span>
        )}
      </div>
      {sens.length > 0 ? (
        <ol className="sens-liste sens-liste--compacte">
          {sens.map((s) => (
            <li key={s.num}>
              <span className="sens-num">{s.num}</span>
              <span>{s.traduction}</span>
            </li>
          ))}
          {mot.sens.length > maxSens && (
            <li>
              <span className="sens-num">…</span>
              <span className="resultat__syn">+{mot.sens.length - maxSens}</span>
            </li>
          )}
        </ol>
      ) : (
        <p className="resultat__syn">{t.fiche.pasDeTraduction}</p>
      )}
      {synonymes.length > 0 && (
        <p className="resultat__syn" style={{ margin: '10px 0 0' }}>
          <strong>{t.fiche.synonymes} :</strong> {synonymes.join(', ')}
        </p>
      )}
    </Link>
  );
}
