import Link from 'next/link';
import BlocCopiable from '@/components/BlocCopiable';
import FormulaireAcces from '@/components/FormulaireAcces';
import { QUOTA_SANS_CLE, VERSION_API } from '@/lib/api';
import { TERMS_VERSION, texteConditions } from '@/lib/conditions';
import { LICENCE } from '@/lib/licence';
import { markdownVersHtml } from '@/lib/markdown';
import { SITE_URL } from '@/lib/site';

export const metadata = {
  title: 'API du dictionnaire',
  description:
    'API publique en lecture du dictionnaire créole guadeloupéen ↔ français : recherche, fiche d’un mot, mises à jour. Gratuite, sur demande, sous licence CC BY-NC-SA 4.0.',
  alternates: { canonical: '/api' },
};

const REPONSE_SEARCH = `{
  "query": "manjé",
  "from": "gcf",
  "limit": 20,
  "offset": 0,
  "total": 8,
  "count": 8,
  "results": [
    {
      "id": 4838,
      "word": "MANJÉ",
      "slug": "manje",
      "url": "${SITE_URL}/mo/manje",
      "variants": [],
      "senses": [
        {
          "number": 1,
          "translation": "Nourrir, manger, se nourrir",
          "synonyms": ["Nannan", "Bang-é-flang"],
          "french_terms": [{ "term": "manger", "url": "${SITE_URL}/fr/manger" }],
          "examples": [{ "kreyol": "Nou ka manjé bonnè", "francais": "Nous mangeons tôt" }]
        }
      ],
      "updated_at": "2026-09-15T02:52:34.000Z"
    }
  ],
  "license": {
    "name": "CC BY-NC-SA 4.0",
    "url": "${LICENCE.resume}",
    "attribution": "${LICENCE.attribution}",
    "source": "${LICENCE.source}"
  }
}`;

const REPONSE_WORD = `{
  "word": {
    "id": 4838,
    "word": "MANJÉ",
    "variants": [],
    "senses": [ /* … sens, synonymes, termes français, exemples … */ ],
    "expressions": [
      {
        "expression": "Fè manjé",
        "translation": "Préparer le repas",
        "example": { "kreyol": "I ka fè manjé", "francais": "Il prépare le repas" }
      }
    ],
    "updated_at": "2026-09-15T02:52:34.000Z"
  },
  "license": { "...": "…" }
}`;

const REPONSE_ERREUR = `{
  "error": {
    "code": "rate_limited",
    "message": "Quota dépassé, réessayez dans une minute."
  }
}`;

function Entree({ titre, methode = 'GET', chemin, description, parametres, exemple, reponse }) {
  return (
    <section className="carte" style={{ marginBottom: 20 }}>
      <h3 style={{ fontFamily: 'var(--police-titre)', fontSize: '1.3rem', marginBottom: 6 }}>{titre}</h3>
      <p>
        <code>
          {methode} {chemin}
        </code>
      </p>
      <p>{description}</p>
      {parametres && (
        <div className="tableau-defilant">
          <table className="tableau-legal">
            <thead>
              <tr>
                <th>Paramètre</th>
                <th>Valeurs</th>
                <th>Défaut</th>
              </tr>
            </thead>
            <tbody>
              {parametres.map((p) => (
                <tr key={p.nom}>
                  <td>
                    <code>{p.nom}</code>
                  </td>
                  <td>{p.valeurs}</td>
                  <td>{p.defaut}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <BlocCopiable texte={exemple} libelle="Copier l’exemple" confirmation="Copié !" />
      {reponse && (
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Exemple de réponse</summary>
          <pre className="bloc-code">{reponse}</pre>
        </details>
      )}
    </section>
  );
}

export default function PageApi() {
  return (
    <div className="conteneur conteneur--etroit texte-page" lang="fr">
      <header className="page-entete">
        <h1 className="page-titre">API du dictionnaire</h1>
        <p className="page-intro">
          Une API publique en lecture, pour afficher le dictionnaire sur votre site ou votre application. Gratuite, accordée après
          examen de votre demande, sous licence {LICENCE.nom}. Version {VERSION_API}.
        </p>
      </header>

      <h2>En bref</h2>
      <ul>
        <li>
          Quatre points d’entrée en lecture seule, sous <code>/api/v1/</code>, en JSON.
        </li>
        <li>
          Sans clé : {QUOTA_SANS_CLE} requêtes par minute, pour essayer. Avec une clé : 60 par minute par défaut.
        </li>
        <li>Chaque réponse contient la licence et la citation à afficher.</li>
        <li>
          En lecture courante, 100 entrées au maximum par appel. L’<strong>export complet</strong> existe, mais sur autorisation :
          dites-nous à quoi il vous sert.
        </li>
      </ul>

      <h2>Authentification</h2>
      <p>
        Envoyez votre clé dans l’en-tête <code>X-API-Key</code>. Une clé inconnue, révoquée ou suspendue renvoie <code>401</code>. Si
        votre compte n’a pas accepté la version en cours des conditions, l’API renvoie <code>403 terms_not_accepted</code> : ouvrez
        votre <Link className="lien" href="/partenaire">espace partenaire</Link> pour les accepter.
      </p>
      <BlocCopiable texte={`curl -H "X-API-Key: VOTRE_CLÉ" "${SITE_URL}/api/v1/search?q=kaz"`} libelle="Copier" />

      <h2>Points d’entrée</h2>

      <Entree
        titre="Recherche"
        chemin="/api/v1/search"
        description="Cherche un mot, en créole ou en français. La recherche ignore la casse et les accents, et classe les correspondances exactes avant les préfixes, puis les occurrences. Les sens sont regroupés par mot."
        parametres={[
          { nom: 'q', valeurs: 'texte, 1 à 60 caractères (obligatoire)', defaut: '—' },
          { nom: 'from', valeurs: 'gcf (créole) ou fr (français)', defaut: 'gcf' },
          { nom: 'limit', valeurs: '1 à 50', defaut: '20' },
          { nom: 'offset', valeurs: '0 à 5000', defaut: '0' },
        ]}
        exemple={`curl "${SITE_URL}/api/v1/search?q=manjé&from=gcf&limit=5"`}
        reponse={REPONSE_SEARCH}
      />

      <Entree
        titre="Une entrée complète"
        chemin="/api/v1/words/{id}"
        description="Le détail d’un mot : graphies, sens, synonymes, termes français, exemples, expressions et date de dernière modification."
        exemple={`curl "${SITE_URL}/api/v1/words/4838"`}
        reponse={REPONSE_WORD}
      />

      <Entree
        titre="Mises à jour"
        chemin="/api/v1/updates"
        description="Les entrées créées ou modifiées depuis une date. C’est le point d’entrée à utiliser pour se synchroniser, plutôt que de tout re-télécharger."
        parametres={[
          { nom: 'since', valeurs: 'date ISO 8601 (obligatoire)', defaut: '—' },
          { nom: 'limit', valeurs: '1 à 100', defaut: '50' },
          { nom: 'offset', valeurs: '0 à 5000', defaut: '0' },
        ]}
        exemple={`curl -H "X-API-Key: VOTRE_CLÉ" "${SITE_URL}/api/v1/updates?since=2026-10-01T00:00:00Z&limit=50"`}
      />

      <Entree
        titre="Export complet (sur autorisation)"
        chemin="/api/v1/export"
        description="Le dictionnaire entier en un appel, pour une application hors ligne ou un miroir. Réservé aux partenaires à qui nous l’ouvrons expressément, et limité à deux appels par heure. Sans cette autorisation, la réponse est 403 export_not_allowed."
        exemple={`curl -H "X-API-Key: VOTRE_CLÉ" "${SITE_URL}/api/v1/export" -o chalviraj.json`}
      />

      <Entree
        titre="État du service"
        chemin="/api/v1/health"
        description="Sans authentification et sans journalisation. Renvoie { status, version }."
        exemple={`curl "${SITE_URL}/api/v1/health"`}
      />

      <h2>Quotas</h2>
      <p>
        Le décompte est par minute. Sans clé : {QUOTA_SANS_CLE} requêtes par minute et par adresse IP. Avec une clé : la valeur
        indiquée dans votre espace (60 par défaut). Au-delà, l’API renvoie <code>429</code> avec un en-tête <code>Retry-After</code>.
      </p>

      <h2>Erreurs</h2>
      <p>Toutes les erreurs ont la même forme, avec un message en français :</p>
      <pre className="bloc-code">{REPONSE_ERREUR}</pre>
      <div className="tableau-defilant">
        <table className="tableau-legal">
          <thead>
            <tr>
              <th>Code</th>
              <th>HTTP</th>
              <th>Cause</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>invalid_request</code>
              </td>
              <td>400</td>
              <td>Paramètre manquant ou hors limites</td>
            </tr>
            <tr>
              <td>
                <code>unauthorized</code>
              </td>
              <td>401</td>
              <td>Clé inconnue, révoquée, ou partenaire suspendu</td>
            </tr>
            <tr>
              <td>
                <code>terms_not_accepted</code>
              </td>
              <td>403</td>
              <td>Conditions en cours non acceptées</td>
            </tr>
            <tr>
              <td>
                <code>export_not_allowed</code>
              </td>
              <td>403</td>
              <td>Export complet non ouvert sur cette clé</td>
            </tr>
            <tr>
              <td>
                <code>not_found</code>
              </td>
              <td>404</td>
              <td>Entrée inexistante</td>
            </tr>
            <tr>
              <td>
                <code>rate_limited</code>
              </td>
              <td>429</td>
              <td>Quota dépassé</td>
            </tr>
            <tr>
              <td>
                <code>server_error</code>
              </td>
              <td>500</td>
              <td>Erreur du service</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Ce que la licence vous demande</h2>
      <p>
        Les données sont sous licence <strong>{LICENCE.nom}</strong> : citation visible, pas d’usage commercial sans accord écrit, et
        republication de vos enrichissements sous la même licence. Le détail est sur la{' '}
        <Link className="lien" href="/licence">
          page licence
        </Link>
        . La mention à afficher là où les données apparaissent :
      </p>
      <BlocCopiable texte={LICENCE.attribution} libelle="Copier la citation" confirmation="Citation copiée !" />

      <h2>Conditions d’utilisation (version {TERMS_VERSION})</h2>
      <p>
        Elles sont acceptées depuis l’espace partenaire, et reproduites ici en entier. Page dédiée :{' '}
        <Link className="lien" href="/api/conditions">
          /api/conditions
        </Link>
        .
      </p>
      <div
        style={{
          border: '1px solid var(--sable-clair)',
          borderRadius: 'var(--rayon-moyen)',
          padding: '4px 18px 12px',
          background: '#fff',
        }}
        dangerouslySetInnerHTML={{ __html: markdownVersHtml(texteConditions()) }}
      />

      <h2 id="demande">Demander un accès</h2>
      <p>
        Décrivez votre projet : nous créons le compte à la main après examen, puis vous recevez une invitation pour définir votre mot
        de passe et créer vos clés. Déjà partenaire ?{' '}
        <Link className="lien" href="/partenaire">
          Connectez-vous
        </Link>
        .
      </p>
      <FormulaireAcces debut={Date.now()} />
    </div>
  );
}
