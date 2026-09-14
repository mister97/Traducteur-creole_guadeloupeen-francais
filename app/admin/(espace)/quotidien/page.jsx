import Link from 'next/link';
import { nouveauTirage } from '@/app/admin/actions';
import BoutonConfirmation from '@/components/admin/BoutonConfirmation';
import FormulairePlanification from '@/components/admin/FormulairePlanification';
import { historiqueQuotidien } from '@/lib/admin';
import { decalerJour, formaterJour, jourGuadeloupe } from '@/lib/dates';
import { tirage } from '@/lib/quotidien';

export const metadata = { title: 'Mot du jour & jeu' };

function CelluleMot({ valeur, jour, type, modifiable }) {
  return (
    <td>
      {valeur ? (
        <Link className="tableau__mot" href={`/admin/mots/${valeur.id}`}>
          {valeur.mot}
        </Link>
      ) : (
        <span className="tableau__discret">tirage au sort à la première visite</span>
      )}
      {modifiable && valeur && (
        <form action={nouveauTirage} style={{ display: 'inline', marginLeft: 8 }}>
          <input type="hidden" name="jour" value={jour} />
          <input type="hidden" name="type" value={type} />
          <BoutonConfirmation
            message={
              type === 'jeu'
                ? 'Retirer ce mot ? Les joueurs qui ont déjà commencé la partie du jour verront leurs essais recolorés.'
                : 'Tirer un autre mot du jour ?'
            }
            className="bouton bouton--blanc bouton--petit"
          >
            {jour === jourGuadeloupe() ? 'Retirer au sort' : 'Annuler'}
          </BoutonConfirmation>
        </form>
      )}
    </td>
  );
}

export default async function PageQuotidien() {
  const aujourdhui = jourGuadeloupe();
  await Promise.all([tirage('mot', aujourdhui), tirage('jeu', aujourdhui)]);
  const { jours } = await historiqueQuotidien(30);
  // Jours programmés à l'avance
  const futurs = jours.filter((j) => j.jour > aujourdhui).sort((a, b) => a.jour.localeCompare(b.jour));
  const passes = jours.filter((j) => j.jour <= aujourdhui);

  return (
    <>
      <h1 className="admin__titre">Mot du jour & Mo kaché</h1>
      <p className="admin__sous-titre">
        Chaque jour à minuit (heure de Guadeloupe), un mot est tiré au sort pour l’accueil et un mot de 5 lettres pour le jeu. Vous pouvez
        en programmer à l’avance, ou exclure un mot depuis sa fiche.
      </p>

      <div className="admin-colonnes">
        <div style={{ display: 'grid', gap: 20 }}>
          {futurs.length > 0 && (
            <section>
              <h2 className="section__titre" style={{ fontSize: '1.2rem' }}>
                Programmés
              </h2>
              <div className="tableau-conteneur">
                <table className="tableau">
                  <thead>
                    <tr>
                      <th>Jour</th>
                      <th>Mot du jour</th>
                      <th>Mo kaché</th>
                    </tr>
                  </thead>
                  <tbody>
                    {futurs.map((j) => (
                      <tr key={j.jour}>
                        <td style={{ whiteSpace: 'nowrap' }}>{formaterJour(j.jour, 'fr', { annee: true })}</td>
                        <CelluleMot valeur={j.mot} jour={j.jour} type="mot" modifiable />
                        <CelluleMot valeur={j.jeu} jour={j.jour} type="jeu" modifiable />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section>
            <h2 className="section__titre" style={{ fontSize: '1.2rem' }}>
              30 derniers jours
            </h2>
            <div className="tableau-conteneur">
              <table className="tableau">
                <thead>
                  <tr>
                    <th>Jour</th>
                    <th>Mot du jour</th>
                    <th>Mo kaché</th>
                  </tr>
                </thead>
                <tbody>
                  {passes.map((j) => (
                    <tr key={j.jour}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {formaterJour(j.jour, 'fr', { annee: true })}
                        {j.jour === aujourdhui && <strong> (aujourd’hui)</strong>}
                      </td>
                      <CelluleMot valeur={j.mot} jour={j.jour} type="mot" modifiable={j.jour === aujourdhui} />
                      <CelluleMot valeur={j.jeu} jour={j.jour} type="jeu" modifiable={j.jour === aujourdhui} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="admin-aside">
          <section className="carte admin-bloc">
            <h2>Programmer un mot</h2>
            <FormulairePlanification jourParDefaut={decalerJour(aujourdhui, 1)} />
          </section>
        </aside>
      </div>
    </>
  );
}
