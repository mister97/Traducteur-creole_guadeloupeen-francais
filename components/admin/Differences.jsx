import { differences, ficheEnLignes } from '@/lib/fiche-format';

export default function Differences({ avant, apres, avecTermes = false }) {
  const lignes = differences(ficheEnLignes(avant, { avecTermes }), ficheEnLignes(apres, { avecTermes }));
  const changements = lignes.filter((l) => l.type !== 'egal').length;
  return (
    <>
      <p className="tableau__discret" style={{ margin: '0 0 8px' }}>
        {changements === 0 ? 'Aucune différence sur le contenu de la fiche.' : `${changements} ligne(s) modifiée(s).`}
      </p>
      <div className="diff">
        {lignes.map((l, i) => (
          <div key={i} className={`diff__${l.type}`}>
            {l.ligne}
          </div>
        ))}
      </div>
    </>
  );
}
