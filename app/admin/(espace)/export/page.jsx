export const metadata = { title: 'Export' };

export default function PageExport() {
  return (
    <>
      <h1 className="admin__titre">Export</h1>
      <p className="admin__sous-titre">Téléchargez le dictionnaire complet, par exemple pour l’archiver ou le relire hors ligne.</p>

      <div className="admin-grille">
        <section className="carte admin-bloc">
          <h2>Excel (.xlsx)</h2>
          <p>
            Trois onglets : <strong>Mots</strong> (une ligne par sens, avec graphies, synonymes et termes français),{' '}
            <strong>Expressions</strong> et <strong>Suggestions</strong>.
          </p>
          <a className="bouton bouton--principal" href="/admin/export/xlsx">
            Télécharger le fichier Excel
          </a>
        </section>
        <section className="carte admin-bloc">
          <h2>JSON</h2>
          <p>Toutes les fiches dans un format structuré (identique à celui de l’éditeur), pratique pour un traitement automatique.</p>
          <a className="bouton bouton--blanc" href="/admin/export/json">
            Télécharger le JSON
          </a>
        </section>
        <section className="carte admin-bloc">
          <h2>Sauvegarde de la base</h2>
          <p>
            Pour une sauvegarde restaurable, utilisez les sauvegardes de Plesk (Sites Web &amp; Domaines › Sauvegarder) ou l’export
            phpMyAdmin de la base MySQL.
          </p>
        </section>
      </div>
    </>
  );
}
