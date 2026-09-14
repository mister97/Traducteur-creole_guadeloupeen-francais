import Link from 'next/link';
import { notFound } from 'next/navigation';
import { effacerSuggestion, rejeterSuggestion, remettreEnAttente } from '@/app/admin/actions';
import BoutonConfirmation from '@/components/admin/BoutonConfirmation';
import Differences from '@/components/admin/Differences';
import ValidationSuggestion from '@/components/admin/ValidationSuggestion';
import { dateHeure, libelleStatut, libelleType } from '@/components/admin/utils';
import { motsSimilaires } from '@/lib/admin';
import { ficheEnLignes, normaliserFiche } from '@/lib/fiche-format';
import { chargerFiche } from '@/lib/fiches';
import { rechercheFrancais, termesDepuisTraduction } from '@/lib/normalisation.mjs';
import { obtenirSuggestion } from '@/lib/suggestions';

export const metadata = { title: 'Suggestion' };

// Les sens proposés sans terme français reçoivent des termes tirés de la traduction
function completerTermes(fiche) {
  return {
    ...fiche,
    sens: fiche.sens.map((s) => (s.termes.length ? s : { ...s, termes: termesDepuisTraduction(s.traduction) })),
  };
}

// Fiche existante + ajouts de la proposition, sans doublons
function fusionner(existante, proposee) {
  const cleSens = (s) => rechercheFrancais(s.traduction);
  const sensConnus = new Set(existante.sens.map(cleSens));
  const locutionsConnues = new Set(existante.locutions.map((l) => rechercheFrancais(l.expression)));
  return {
    mot: existante.mot,
    variantes: [...new Set([...existante.variantes, ...(proposee.mot !== existante.mot ? [proposee.mot] : []), ...proposee.variantes])],
    sens: [...existante.sens, ...proposee.sens.filter((s) => !sensConnus.has(cleSens(s)))],
    locutions: [...existante.locutions, ...proposee.locutions.filter((l) => !locutionsConnues.has(rechercheFrancais(l.expression)))],
  };
}

export default async function PageSuggestion({ params, searchParams }) {
  const { id } = await params;
  const { fusion } = await searchParams;
  const suggestion = await obtenirSuggestion(Number(id));
  if (!suggestion) notFound();

  const enAttente = suggestion.statut === 'en_attente';
  const proposee = suggestion.donnees ? normaliserFiche(suggestion.donnees) : null;

  let cible = null; // entrée existante qui sera remplacée à la validation
  let ficheInitiale = proposee ? completerTermes(proposee) : null;
  let similaires = [];

  if (suggestion.type === 'correction' && suggestion.entree_id) {
    cible = await chargerFiche(suggestion.entree_id);
  } else if (suggestion.type === 'ajout' && proposee) {
    similaires = await motsSimilaires(proposee.mot);
    if (fusion) {
      cible = await chargerFiche(Number(fusion));
      if (cible) ficheInitiale = completerTermes(fusionner(cible.fiche, proposee));
    }
  }

  return (
    <>
      <div className="admin__entete">
        <div>
          <p className="tableau__discret" style={{ margin: 0 }}>
            <Link className="lien" href="/admin/suggestions">
              ← Suggestions
            </Link>
          </p>
          <h1 className="admin__titre">
            {libelleType(suggestion.type)}
            {suggestion.mot ? ` : ${suggestion.mot}` : ''}
          </h1>
          <span className={`etat etat--${suggestion.statut}`}>{libelleStatut(suggestion.statut)}</span>
        </div>
      </div>

      <div className="admin-colonnes">
        <div style={{ display: 'grid', gap: 20 }}>
          {suggestion.message && (
            <section className="carte admin-bloc">
              <h2>Message</h2>
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{suggestion.message}</p>
            </section>
          )}

          {suggestion.type === 'correction' && !cible && (
            <div className="alerte alerte--erreur">Le mot visé a été supprimé depuis : la validation créera un nouveau mot.</div>
          )}

          {similaires.length > 0 && !fusion && enAttente && (
            <div className="alerte alerte--info">
              <strong>Attention :</strong> un mot qui s’écrit pareil existe déjà :{' '}
              {similaires.map((m, i) => (
                <span key={m.id}>
                  {i > 0 && ', '}
                  <Link className="lien" href={`/admin/mots/${m.id}`} target="_blank">
                    {m.mot}
                  </Link>{' '}
                  (<Link className="lien" href={`/admin/suggestions/${suggestion.id}?fusion=${m.id}`}>fusionner dedans</Link>)
                </span>
              ))}
              . Sinon, la validation créera un nouveau mot.
            </div>
          )}

          {fusion && cible && (
            <div className="alerte alerte--info">
              Fusion avec la fiche existante <strong>{cible.mot}</strong> : les sens et expressions proposés ont été ajoutés à la
              suite.{' '}
              <Link className="lien" href={`/admin/suggestions/${suggestion.id}`}>
                Annuler la fusion
              </Link>
            </div>
          )}

          {proposee && (
            <section className="carte admin-bloc">
              <h2>{cible ? 'Changements proposés' : 'Fiche proposée'}</h2>
              {cible ? (
                <Differences avant={cible.fiche} apres={fusion ? ficheInitiale : proposee} />
              ) : (
                <div className="diff">
                  {ficheEnLignes(proposee, { avecTermes: false }).map((ligne, i) => (
                    <div key={i} className="diff__ajoute">
                      {ligne}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {enAttente ? (
            <ValidationSuggestion
              suggestion={{
                id: suggestion.id,
                type: suggestion.type,
                peutPrevenir: Boolean(suggestion.email && suggestion.notifier),
              }}
              cible={cible ? { id: cible.id, mot: cible.mot, exclu_quotidien: cible.exclu_quotidien, exclu_jeu: cible.exclu_jeu } : null}
              ficheInitiale={ficheInitiale}
            />
          ) : (
            suggestion.note_admin && (
              <section className="carte admin-bloc">
                <h2>Note</h2>
                <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{suggestion.note_admin}</p>
              </section>
            )
          )}
        </div>

        <aside className="admin-aside">
          <section className="carte admin-bloc">
            <h2>Détails</h2>
            <dl className="meta">
              <dt>Reçue</dt>
              <dd>{dateHeure(suggestion.cree_le)}</dd>
              <dt>Nom</dt>
              <dd>{suggestion.nom || '—'}</dd>
              <dt>E-mail</dt>
              <dd>{suggestion.email ? <a className="lien" href={`mailto:${suggestion.email}`}>{suggestion.email}</a> : '—'}</dd>
              <dt>Prévenir</dt>
              <dd>{suggestion.notifier ? 'oui' : 'non'}</dd>
              <dt>Langue</dt>
              <dd>{suggestion.langue === 'fr' ? 'français' : 'kréyòl'}</dd>
              {suggestion.entree_slug && (
                <>
                  <dt>Fiche</dt>
                  <dd>
                    <Link className="lien" href={`/mo/${suggestion.entree_slug}`} target="_blank">
                      {suggestion.entree_mot} ↗
                    </Link>
                  </dd>
                </>
              )}
              {suggestion.traite_le && (
                <>
                  <dt>Traitée</dt>
                  <dd>{dateHeure(suggestion.traite_le)}</dd>
                </>
              )}
            </dl>
          </section>

          {enAttente ? (
            <section className="carte admin-bloc">
              <h2>Rejeter</h2>
              <form action={rejeterSuggestion}>
                <input type="hidden" name="suggestion_id" value={suggestion.id} />
                <div className="champ">
                  <label htmlFor="note-rejet">Raison (privée)</label>
                  <textarea id="note-rejet" name="note" className="saisie" rows={2} />
                </div>
                <button type="submit" className="bouton bouton--danger bouton--bloc">
                  Rejeter la suggestion
                </button>
              </form>
            </section>
          ) : (
            <section className="carte admin-bloc" style={{ display: 'grid', gap: 10 }}>
              <form action={remettreEnAttente}>
                <input type="hidden" name="suggestion_id" value={suggestion.id} />
                <button type="submit" className="bouton bouton--blanc bouton--bloc">
                  Remettre en attente
                </button>
              </form>
              <form action={effacerSuggestion}>
                <input type="hidden" name="suggestion_id" value={suggestion.id} />
                <BoutonConfirmation message="Supprimer définitivement cette suggestion ?" className="bouton bouton--danger bouton--bloc">
                  Supprimer
                </BoutonConfirmation>
              </form>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
