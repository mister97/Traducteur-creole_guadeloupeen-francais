import Link from 'next/link';
import { dateHeure, extrait, libelleType } from '@/components/admin/utils';
import { tableauDeBord } from '@/lib/admin';
import { formaterJour, jourGuadeloupe } from '@/lib/dates';
import { ficheParId } from '@/lib/dico';
import { tirage } from '@/lib/quotidien';
import { formaterNombre } from '@/lib/textes';
import { mentionsIncompletes } from '@/lib/mentions';
import { compterSuggestions, listerSuggestions, purgerDonneesPersonnelles } from '@/lib/suggestions';

export const metadata = { title: 'Tableau de bord' };

export default async function TableauDeBord() {
  const jour = jourGuadeloupe();
  await purgerDonneesPersonnelles();
  const [{ chiffres, qualite }, compte, { suggestions }, idMot, idJeu] = await Promise.all([
    tableauDeBord(),
    compterSuggestions(),
    listerSuggestions({ statut: 'en_attente', limite: 6 }),
    tirage('mot', jour),
    tirage('jeu', jour),
  ]);
  const [motDuJour, motJeu] = await Promise.all([idMot && ficheParId(idMot), idJeu && ficheParId(idJeu)]);

  return (
    <>
      <h1 className="admin__titre">Tableau de bord</h1>
      <p className="admin__sous-titre">{formaterJour(jour, 'fr', { annee: true })} (heure de Guadeloupe)</p>

      {mentionsIncompletes() && (
        <div className="alerte alerte--erreur">
          Les mentions légales ne sont pas complètes : renseignez l’éditeur et l’hébergeur dans <code>lib/mentions.js</code>{' '}
          (<Link className="lien" href="/mentions-legales" target="_blank">voir la page</Link>).
        </div>
      )}

      <div className="chiffres">
        <Link href="/admin/suggestions" className={`chiffre ${compte.en_attente ? 'chiffre--alerte' : ''}`}>
          <strong>{compte.en_attente}</strong>
          <span>suggestion{compte.en_attente > 1 ? 's' : ''} en attente</span>
        </Link>
        <Link href="/admin/mots" className="chiffre">
          <strong>{formaterNombre(chiffres.mots)}</strong>
          <span>mots</span>
        </Link>
        <div className="chiffre">
          <strong>{formaterNombre(chiffres.sens)}</strong>
          <span>sens</span>
        </div>
        <Link href="/admin/francais" className="chiffre">
          <strong>{formaterNombre(chiffres.termes)}</strong>
          <span>termes français</span>
        </Link>
      </div>

      <div className="admin-grille">
        <section className="carte admin-bloc">
          <h2>Suggestions à traiter</h2>
          {suggestions.length === 0 ? (
            <p className="tableau__discret">Rien en attente. 🎉</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
              {suggestions.map((s) => (
                <li key={s.id}>
                  <Link href={`/admin/suggestions/${s.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                    <span className={`etat etat--${s.type}`}>{libelleType(s.type)}</span>{' '}
                    <strong>{s.mot || extrait(s.message, 40)}</strong>
                    <span className="tableau__discret" style={{ display: 'block' }}>
                      {dateHeure(s.cree_le)} · {s.nom || s.email || 'anonyme'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="carte admin-bloc">
          <h2>Aujourd’hui</h2>
          <dl className="meta">
            <dt>Mot du jour</dt>
            <dd>{motDuJour ? <Link className="lien" href={`/admin/mots/${motDuJour.id}`}>{motDuJour.mot}</Link> : '—'}</dd>
            <dt>Mo kaché</dt>
            <dd>{motJeu ? <Link className="lien" href={`/admin/mots/${motJeu.id}`}>{motJeu.mot}</Link> : '—'}</dd>
          </dl>
          <p style={{ marginTop: 14 }}>
            <Link href="/admin/quotidien" className="bouton bouton--blanc bouton--petit">
              Gérer les tirages
            </Link>
          </p>
        </section>

        <section className="carte admin-bloc">
          <h2>Qualité des données</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
            {qualite.map((q) => (
              <li key={q.cle} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <Link className="lien" href={`/admin/mots?filtre=${q.cle}`}>
                  {q.libelle}
                </Link>
                <strong>{formaterNombre(q.n)}</strong>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
