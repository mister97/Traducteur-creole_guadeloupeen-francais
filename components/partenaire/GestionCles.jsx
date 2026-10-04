'use client';

import { useActionState } from 'react';
import { creerCleAction, revoquerCleAction } from '@/app/partenaire/actions';
import BlocCopiable from '@/components/BlocCopiable';
import BoutonConfirmation from '@/components/admin/BoutonConfirmation';
import { dateHeure } from '@/components/admin/utils';

export default function GestionCles({ cles, maximum }) {
  const [etat, action, enCours] = useActionState(creerCleAction, null);
  const actives = cles.filter((c) => !c.revoked_at);

  return (
    <section className="carte admin-bloc">
      <h2>Clés d’API</h2>

      {etat?.cle && (
        <div className="cle-affichee">
          <strong>Votre nouvelle clé « {etat.label} » :</strong>
          <BlocCopiable texte={etat.cle} libelle="Copier la clé" confirmation="Clé copiée !" />
          <p className="champ__aide" style={{ margin: 0 }}>
            Notez-la maintenant : elle ne sera plus jamais affichée. En cas de perte, révoquez-la et créez-en une autre.
          </p>
        </div>
      )}
      {etat?.erreur && (
        <div className="alerte alerte--erreur" role="alert">
          {etat.erreur}
        </div>
      )}

      {actives.length === 0 ? (
        <p className="tableau__discret">Aucune clé active. Créez-en une pour appeler l’API.</p>
      ) : (
        <div className="tableau-conteneur" style={{ marginBottom: 16 }}>
          <table className="tableau">
            <thead>
              <tr>
                <th>Libellé</th>
                <th>Préfixe</th>
                <th>Quota</th>
                <th>Créée</th>
                <th>Dernier appel</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {actives.map((c) => (
                <tr key={c.id}>
                  <td>{c.label}</td>
                  <td>
                    <code>{c.key_prefix}…</code>
                  </td>
                  <td className="tableau__discret">{c.rate_limit}/min</td>
                  <td className="tableau__discret">{dateHeure(c.created_at)}</td>
                  <td className="tableau__discret">{c.last_used_at ? dateHeure(c.last_used_at) : 'jamais'}</td>
                  <td className="tableau__actions">
                    <form action={revoquerCleAction}>
                      <input type="hidden" name="cle_id" value={c.id} />
                      <input type="hidden" name="label" value={c.label} />
                      <BoutonConfirmation
                        message={`Révoquer la clé « ${c.label} » ? Les appels faits avec cesseront immédiatement.`}
                        className="bouton bouton--danger bouton--petit"
                      >
                        Révoquer
                      </BoutonConfirmation>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {actives.length < maximum ? (
        <form action={action} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="champ" style={{ marginBottom: 0, flex: 1, minWidth: 220 }}>
            <label htmlFor="label">Nom de la nouvelle clé</label>
            <input id="label" name="label" className="saisie" maxLength={120} placeholder="ex. site de l’association" required />
          </div>
          <button type="submit" className="bouton bouton--turquoise" disabled={enCours}>
            {enCours ? 'Création…' : 'Créer une clé'}
          </button>
        </form>
      ) : (
        <p className="tableau__discret">
          Vous avez atteint le maximum de {maximum} clés actives. Révoquez-en une pour en créer une nouvelle.
        </p>
      )}
    </section>
  );
}
