import ExcelJS from 'exceljs';
import { donneesExport } from '@/lib/admin';
import { estAdmin } from '@/lib/auth';
import { jourGuadeloupe } from '@/lib/dates';
import { requete } from '@/lib/db';

function feuille(classeur, nom, colonnes) {
  const f = classeur.addWorksheet(nom, { views: [{ state: 'frozen', ySplit: 1 }] });
  f.columns = colonnes;
  const entete = f.getRow(1);
  entete.font = { bold: true };
  entete.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCC00' } };
  f.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: colonnes.length } };
  return f;
}

export async function GET() {
  if (!(await estAdmin())) return new Response('Non autorisé', { status: 401 });

  const [entrees, suggestions] = await Promise.all([
    donneesExport(),
    requete('SELECT id, type, mot, message, nom, email, statut, cree_le, traite_le, note_admin FROM suggestions ORDER BY id'),
  ]);

  const classeur = new ExcelJS.Workbook();
  classeur.creator = 'Mofwazé';
  classeur.created = new Date();

  const mots = feuille(classeur, 'Mots', [
    { header: 'ID', key: 'id', width: 8 },
    { header: 'Mot', key: 'mot', width: 24 },
    { header: 'Autres graphies', key: 'variantes', width: 22 },
    { header: 'N°', key: 'num', width: 5 },
    { header: 'Traduction', key: 'traduction', width: 60 },
    { header: 'Exemples', key: 'exemples', width: 50 },
    { header: 'Synonymes', key: 'synonymes', width: 30 },
    { header: 'Termes français', key: 'termes', width: 30 },
    { header: 'Adresse', key: 'slug', width: 20 },
  ]);
  const expressions = feuille(classeur, 'Expressions', [
    { header: 'Mot', key: 'mot', width: 24 },
    { header: 'Expression', key: 'expression', width: 36 },
    { header: 'Traduction', key: 'traduction', width: 40 },
    { header: 'Exemple (kréyòl)', key: 'exemple_kr', width: 40 },
    { header: 'Exemple (français)', key: 'exemple_fr', width: 40 },
  ]);

  for (const e of entrees) {
    const base = { id: e.id, mot: e.mot, variantes: e.variantes.join(', '), slug: e.slug };
    if (!e.sens.length) mots.addRow(base);
    for (const s of e.sens) {
      mots.addRow({
        ...base,
        num: s.num,
        traduction: s.traduction,
        exemples: s.exemples.map((ex) => (ex.fr ? `${ex.kr} → ${ex.fr}` : ex.kr)).join(' | '),
        synonymes: s.synonymes.join(', '),
        termes: s.termes.join(', '),
      });
    }
    for (const l of e.locutions) expressions.addRow({ mot: e.mot, ...l });
  }

  const feuilleSuggestions = feuille(classeur, 'Suggestions', [
    { header: 'ID', key: 'id', width: 6 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Mot', key: 'mot', width: 22 },
    { header: 'Message', key: 'message', width: 50 },
    { header: 'Nom', key: 'nom', width: 18 },
    { header: 'E-mail', key: 'email', width: 26 },
    { header: 'Statut', key: 'statut', width: 12 },
    { header: 'Reçue (UTC)', key: 'cree_le', width: 20 },
    { header: 'Traitée (UTC)', key: 'traite_le', width: 20 },
    { header: 'Note', key: 'note_admin', width: 30 },
  ]);
  suggestions.forEach((s) => feuilleSuggestions.addRow(s));

  const tampon = await classeur.xlsx.writeBuffer();
  return new Response(tampon, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="mofwaze-${jourGuadeloupe()}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
