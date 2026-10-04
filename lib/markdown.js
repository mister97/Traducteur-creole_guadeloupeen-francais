// Rendu Markdown minimal, suffisant pour les textes du dossier content/ :
// titres, gras, liens, listes et paragraphes. Le HTML est échappé d'abord,
// donc aucun contenu ne peut injecter de balise.

function echapper(texte) {
  return texte.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

function enLigne(texte) {
  return echapper(texte)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a class="lien" href="$2">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a class="lien" href="$2">$2</a>');
}

export function markdownVersHtml(markdown) {
  const html = [];
  let liste = false;
  const fermerListe = () => {
    if (liste) {
      html.push('</ul>');
      liste = false;
    }
  };

  for (const brut of String(markdown).split('\n')) {
    const ligne = brut.trim().replace(/^>\s?/, '');
    if (!ligne) {
      fermerListe();
      continue;
    }
    const titre = ligne.match(/^(#{1,4})\s+(.*)$/);
    if (titre) {
      fermerListe();
      const n = titre[1].length + 1;
      html.push(`<h${n}>${enLigne(titre[2])}</h${n}>`);
      continue;
    }
    const puce = ligne.match(/^[-*]\s+(.*)$/);
    if (puce) {
      if (!liste) {
        html.push('<ul>');
        liste = true;
      }
      html.push(`<li>${enLigne(puce[1])}</li>`);
      continue;
    }
    fermerListe();
    html.push(`<p>${enLigne(ligne)}</p>`);
  }
  fermerListe();
  return html.join('\n');
}
