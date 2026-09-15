import nodemailer from 'nodemailer';
import { CONTACT_EMAIL, SITE_NOM, SITE_URL } from './site';

// SMTP OVH : SMTP_HOST=ssl0.ovh.net, SMTP_PORT=465, SMTP_USER=adresse complète, SMTP_PASS=mot de passe
function transporteur() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  if (!globalThis.__mofwazeMail) {
    const port = Number(process.env.SMTP_PORT || 465);
    globalThis.__mofwazeMail = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return globalThis.__mofwazeMail;
}

const expediteur = () => process.env.MAIL_FROM || `${SITE_NOM} <${process.env.SMTP_USER || CONTACT_EMAIL}>`;

function echapper(texte) {
  return String(texte ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function gabarit(titre, paragraphesHtml) {
  return `<!doctype html><html><body style="margin:0;background:#fff8e6;font-family:Arial,sans-serif;color:#2b1d0e">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:linear-gradient(90deg,#ffcc00,#ff5733);border-radius:14px 14px 0 0;padding:18px 24px;font-size:22px;font-weight:bold;color:#2b1d0e">${SITE_NOM}</div>
    <div style="background:#ffffff;border:1px solid #f0dca0;border-top:0;border-radius:0 0 14px 14px;padding:24px">
      <h1 style="font-size:20px;margin:0 0 16px">${echapper(titre)}</h1>
      ${paragraphesHtml}
    </div>
  </div></body></html>`;
}

export async function envoyerMail({ a, sujet, texte, html, repondreA }) {
  const t = transporteur();
  if (!t) {
    console.info(`[mail non configuré] À : ${a} — ${sujet}\n${texte}`);
    return false;
  }
  await t.sendMail({ from: expediteur(), to: a, subject: sujet, text: texte, html, replyTo: repondreA });
  return true;
}

const LIBELLES_TYPE = { ajout: 'Nouveau mot', correction: 'Correction', remarque: 'Remarque' };

export async function mailNouvelleSuggestion(suggestion) {
  const destinataire = process.env.ADMIN_EMAIL || CONTACT_EMAIL;
  const lien = `${SITE_URL}/admin/suggestions/${suggestion.id}`;
  const type = LIBELLES_TYPE[suggestion.type] ?? suggestion.type;
  const sujet = `[${SITE_NOM}] ${type}${suggestion.mot ? ` : ${suggestion.mot}` : ''}`;
  const auteur = [suggestion.nom, suggestion.email].filter(Boolean).join(' – ') || 'anonyme';
  const texte = `${type}${suggestion.mot ? ` : ${suggestion.mot}` : ''}\nDe : ${auteur}\n\n${suggestion.message ?? ''}\n\nVoir et valider : ${lien}`;
  const html = gabarit(
    sujet.replace(`[${SITE_NOM}] `, ''),
    `<p style="margin:0 0 8px"><strong>De :</strong> ${echapper(auteur)}</p>
     ${suggestion.message ? `<p style="white-space:pre-wrap;background:#fff8e1;border-radius:8px;padding:12px">${echapper(suggestion.message)}</p>` : ''}
     <p style="margin:24px 0 0"><a href="${lien}" style="background:#ff5733;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:bold">Voir et valider</a></p>`,
  );
  return envoyerMail({ a: destinataire, sujet, texte, html, repondreA: suggestion.email || undefined });
}

export async function mailSuggestionValidee(suggestion, slug) {
  if (!suggestion.email || !suggestion.notifier) return false;
  const lien = slug ? `${SITE_URL}/mo/${slug}` : SITE_URL;
  const kr = suggestion.langue === 'kr';
  const sujet = kr ? `${SITE_NOM} : mèsi pou pwopozisyon a-w !` : `${SITE_NOM} : merci pour votre proposition !`;
  const corps = kr
    ? `Bonjou${suggestion.nom ? ` ${suggestion.nom}` : ''},\n\nPwopozisyon a-w${suggestion.mot ? ` pou « ${suggestion.mot} »` : ''} antré adan diksyonnè-la. Mèsi onlo pou koudmen-la !`
    : `Bonjour${suggestion.nom ? ` ${suggestion.nom}` : ''},\n\nVotre proposition${suggestion.mot ? ` pour « ${suggestion.mot} »` : ''} a été ajoutée au dictionnaire. Merci beaucoup pour votre aide !`;
  const bouton = kr ? 'Vwè fich-la' : 'Voir la fiche';
  const html = gabarit(
    kr ? 'Mèsi onlo !' : 'Merci beaucoup !',
    `${corps
      .split('\n\n')
      .map((p) => `<p>${echapper(p)}</p>`)
      .join('')}
     <p style="margin:24px 0 0"><a href="${lien}" style="background:#009688;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:bold">${bouton}</a></p>`,
  );
  return envoyerMail({ a: suggestion.email, sujet, texte: `${corps}\n\n${lien}`, html });
}
