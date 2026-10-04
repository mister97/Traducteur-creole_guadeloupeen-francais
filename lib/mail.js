import nodemailer from 'nodemailer';
import { CONTACT_EMAIL, SITE_NOM, SITE_URL } from './site';

// SMTP OVH : SMTP_HOST=ssl0.ovh.net, SMTP_PORT=465, SMTP_USER=adresse complète, SMTP_PASS=mot de passe
function transporteur() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  if (!globalThis.__chalvirajMail) {
    const port = Number(process.env.SMTP_PORT || 465);
    globalThis.__chalvirajMail = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return globalThis.__chalvirajMail;
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

export async function mailDemandeAcces(demande) {
  const destinataire = process.env.ADMIN_EMAIL || CONTACT_EMAIL;
  const lien = `${SITE_URL}/admin/partenaires`;
  const sujet = `[${SITE_NOM}] Demande d’accès à l’API : ${demande.name}`;
  const texte = `Demande d'accès à l'API\n\nDe : ${demande.name} <${demande.email}>\nSite : ${demande.site_url || '—'}\n\nUsage prévu :\n${demande.usage_desc}\n\nTraiter la demande : ${lien}`;
  const html = gabarit(
    'Demande d’accès à l’API',
    `<p style="margin:0 0 8px"><strong>De :</strong> ${echapper(demande.name)} — ${echapper(demande.email)}</p>
     ${demande.site_url ? `<p style="margin:0 0 8px"><strong>Site :</strong> ${echapper(demande.site_url)}</p>` : ''}
     <p style="white-space:pre-wrap;background:#fff8e1;border-radius:8px;padding:12px">${echapper(demande.usage_desc)}</p>
     <p style="margin:24px 0 0"><a href="${lien}" style="background:#ff5733;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:bold">Traiter la demande</a></p>`,
  );
  return envoyerMail({ a: destinataire, sujet, texte, html, repondreA: demande.email });
}

// --- Espace partenaire -----------------------------------------------------

function boutonMail(lien, libelle, couleur = '#009688') {
  return `<p style="margin:24px 0 0"><a href="${lien}" style="background:${couleur};color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:bold">${libelle}</a></p>`;
}

export async function mailInvitationPartenaire(partenaire, jeton, heures) {
  const lien = `${SITE_URL}/partenaire/mot-de-passe/${jeton}`;
  const sujet = `${SITE_NOM} : votre accès à l’API`;
  const texte = `Bonjour ${partenaire.name},\n\nVotre accès à l'API du dictionnaire ${SITE_NOM} est ouvert.\n\nDéfinissez votre mot de passe (lien valable ${heures} heures, utilisable une seule fois) :\n${lien}\n\nVous pourrez ensuite accepter les conditions d'utilisation et créer vos clés.`;
  const html = gabarit(
    'Votre accès à l’API',
    `<p>Bonjour ${echapper(partenaire.name)},</p>
     <p>Votre accès à l’API du dictionnaire est ouvert. Définissez votre mot de passe pour activer votre espace : le lien est valable ${heures} heures et ne fonctionne qu’une fois.</p>
     ${boutonMail(lien, 'Définir mon mot de passe')}`,
  );
  return envoyerMail({ a: partenaire.contact_email, sujet, texte, html });
}

export async function mailReinitialisation(partenaire, jeton, heures) {
  const lien = `${SITE_URL}/partenaire/mot-de-passe/${jeton}`;
  const sujet = `${SITE_NOM} : réinitialisation de votre mot de passe`;
  const texte = `Bonjour,\n\nPour choisir un nouveau mot de passe (lien valable ${heures} heure(s), utilisable une seule fois) :\n${lien}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`;
  const html = gabarit(
    'Nouveau mot de passe',
    `<p>Pour choisir un nouveau mot de passe, suivez ce lien. Il est valable ${heures} heure(s) et ne fonctionne qu’une fois.</p>
     ${boutonMail(lien, 'Choisir un mot de passe')}
     <p style="color:#86735d">Si vous n’êtes pas à l’origine de cette demande, ignorez ce message : rien ne change.</p>`,
  );
  return envoyerMail({ a: partenaire.contact_email, sujet, texte, html });
}

export async function mailEvenementPartenaire(partenaire, evenement, detail = '') {
  const titres = {
    cle_creee: 'Nouvelle clé d’API créée',
    cle_revoquee: 'Clé d’API révoquée',
    mot_de_passe: 'Mot de passe modifié',
    suspension: 'Accès suspendu',
    reactivation: 'Accès rétabli',
  };
  const titre = titres[evenement] ?? 'Votre accès à l’API';
  const lien = `${SITE_URL}/partenaire`;
  const corps = {
    cle_creee: `Une nouvelle clé d'API vient d'être créée sur votre espace${detail ? ` (${detail})` : ''}.`,
    cle_revoquee: `Une clé d'API vient d'être révoquée${detail ? ` (${detail})` : ''}. Elle ne fonctionne plus.`,
    mot_de_passe: 'Le mot de passe de votre espace vient d’être modifié. Toutes vos sessions ont été déconnectées.',
    suspension: `Votre accès à l'API est suspendu${detail ? ` : ${detail}` : ''}. Vos clés ne répondent plus.`,
    reactivation: 'Votre accès à l’API est rétabli. Vos clés fonctionnent de nouveau.',
  }[evenement];
  const avertissement =
    evenement === 'cle_creee' || evenement === 'mot_de_passe'
      ? 'Si vous n’êtes pas à l’origine de cette action, répondez à ce message immédiatement.'
      : '';
  const html = gabarit(
    titre,
    `<p>Bonjour ${echapper(partenaire.name)},</p><p>${echapper(corps)}</p>
     ${avertissement ? `<p style="color:#b3300f">${avertissement}</p>` : ''}
     ${boutonMail(lien, 'Ouvrir mon espace')}`,
  );
  return envoyerMail({
    a: partenaire.contact_email,
    sujet: `${SITE_NOM} : ${titre.toLowerCase()}`,
    texte: `Bonjour ${partenaire.name},\n\n${corps}\n\n${avertissement}\n\n${lien}`,
    html,
  });
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
