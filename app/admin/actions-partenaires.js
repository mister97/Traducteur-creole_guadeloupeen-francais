'use server';

import { redirect } from 'next/navigation';
import { changerStatutDemande, obtenirDemande } from '@/lib/acces';
import { exigerAdmin } from '@/lib/auth';
import { mailEvenementPartenaire, mailInvitationPartenaire, mailReinitialisation } from '@/lib/mail';
import {
  changerExport,
  changerSuspension,
  creerJeton,
  creerPartenaire,
  obtenirPartenaire,
  partenaireParEmail,
  revoquerCle,
} from '@/lib/partenaires';

const champ = (formData, nom) => String(formData.get(nom) ?? '').trim();

// Ramène là d'où vient le formulaire : la liste, ou la fiche d'un partenaire
function avecRetour(formData, parametre) {
  const retour = champ(formData, 'retour');
  const base = retour.startsWith('/admin/partenaires') ? retour : '/admin/partenaires';
  return `${base}${base.includes('?') ? '&' : '?'}${parametre}`;
}

async function envoyerInvitation(partenaire) {
  const { jeton, heures } = await creerJeton(partenaire.id, 'invitation');
  try {
    await mailInvitationPartenaire(partenaire, jeton, heures);
  } catch (erreur) {
    console.error('Invitation non envoyée :', erreur.message);
  }
}

// Création du compte partenaire à partir d'une demande examinée (aucune création automatique)
export async function approuverDemande(_etat, formData) {
  await exigerAdmin();
  const demande = await obtenirDemande(Number(champ(formData, 'demande_id')));
  if (!demande) return { erreur: 'Demande introuvable.' };

  const existant = await partenaireParEmail(demande.email);
  if (existant) {
    await changerStatutDemande(demande.id, 'approved');
    return { erreur: `Un partenaire utilise déjà l’adresse ${demande.email}. La demande a été classée.` };
  }

  const id = await creerPartenaire({
    name: champ(formData, 'name') || demande.name,
    contact_email: demande.email,
    site_url: demande.site_url,
    usage_type: champ(formData, 'usage_type') === 'commercial_autorise' ? 'commercial_autorise' : 'non_commercial',
  });
  await changerStatutDemande(demande.id, 'approved');
  await envoyerInvitation(await obtenirPartenaire(id));
  redirect(`/admin/partenaires?cree=${id}`);
}

// Création directe, sans demande préalable (invitation envoyée dans la foulée)
export async function ajouterPartenaire(_etat, formData) {
  await exigerAdmin();
  const name = champ(formData, 'name').slice(0, 120);
  const email = champ(formData, 'contact_email').slice(0, 190).toLowerCase();
  if (!name) return { erreur: 'Indiquez le nom du partenaire.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { erreur: 'Indiquez une adresse e-mail valide : elle reçoit l’invitation.' };
  if (await partenaireParEmail(email)) return { erreur: `Un partenaire utilise déjà l’adresse ${email}.` };

  const id = await creerPartenaire({
    name,
    contact_email: email,
    site_url: champ(formData, 'site_url').slice(0, 190),
    usage_type: champ(formData, 'usage_type') === 'commercial_autorise' ? 'commercial_autorise' : 'non_commercial',
  });
  if (formData.get('export_autorise') === 'on') await changerExport(id, true);
  await envoyerInvitation(await obtenirPartenaire(id));
  redirect(`/admin/partenaires?cree=${id}`);
}

export async function basculerExport(formData) {
  await exigerAdmin();
  const partenaire = await obtenirPartenaire(Number(champ(formData, 'partenaire_id')));
  if (partenaire) await changerExport(partenaire.id, !partenaire.export_autorise);
  redirect(avecRetour(formData, 'export=1'));
}

export async function rejeterDemande(formData) {
  await exigerAdmin();
  await changerStatutDemande(Number(champ(formData, 'demande_id')), 'rejected');
  redirect('/admin/partenaires?rejetee=1');
}

// Invitation si le mot de passe n'est pas encore défini, lien de réinitialisation sinon
export async function renvoyerInvitation(formData) {
  await exigerAdmin();
  const partenaire = await obtenirPartenaire(Number(champ(formData, 'partenaire_id')));
  if (!partenaire) redirect(avecRetour(formData, 'introuvable=1'));

  if (partenaire.password_set_at) {
    const { jeton, heures } = await creerJeton(partenaire.id, 'reset');
    try {
      await mailReinitialisation(partenaire, jeton, heures);
    } catch (erreur) {
      console.error('Lien de réinitialisation non envoyé :', erreur.message);
    }
    redirect(avecRetour(formData, 'reinitialisation=1'));
  }
  await envoyerInvitation(partenaire);
  redirect(avecRetour(formData, 'invitation=1'));
}

// Révocation d'une clé par l'administration (partenaire injoignable, clé fuitée…)
export async function revoquerCleAdmin(formData) {
  await exigerAdmin();
  const partenaireId = Number(champ(formData, 'partenaire_id'));
  const partenaire = await obtenirPartenaire(partenaireId);
  if (partenaire && (await revoquerCle(partenaireId, Number(champ(formData, 'cle_id'))))) {
    try {
      await mailEvenementPartenaire(partenaire, 'cle_revoquee', champ(formData, 'label'));
    } catch (erreur) {
      console.error('Mail de révocation non envoyé :', erreur.message);
    }
  }
  redirect(`/admin/partenaires/${partenaireId}?revoquee=1`);
}

export async function basculerSuspension(formData) {
  await exigerAdmin();
  const partenaire = await obtenirPartenaire(Number(champ(formData, 'partenaire_id')));
  if (!partenaire) redirect(avecRetour(formData, 'statut=1'));
  const suspendre = !partenaire.suspended_at;
  await changerSuspension(partenaire.id, suspendre);
  try {
    await mailEvenementPartenaire(partenaire, suspendre ? 'suspension' : 'reactivation', champ(formData, 'raison'));
  } catch (erreur) {
    console.error('Mail de suspension non envoyé :', erreur.message);
  }
  redirect(avecRetour(formData, 'statut=1'));
}
