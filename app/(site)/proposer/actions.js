'use server';

import { adresseIp } from '@/lib/auth';
import { premiere } from '@/lib/db';
import { fichesIdentiques, normaliserFiche } from '@/lib/fiche-format';
import { chargerFiche } from '@/lib/fiches';
import { langueCourante } from '@/lib/langue';
import { mailNouvelleSuggestion } from '@/lib/mail';
import { creerSuggestion, hacherIp, purgerDonneesPersonnelles, TYPES, tropDeSuggestions } from '@/lib/suggestions';

const DELAI_MINIMUM_MS = 3000;
const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Renvoie { ok: true } ou { erreur: 'cle du texte d’erreur' }
export async function envoyerSuggestion(_etatPrecedent, formData) {
  const champ = (nom) => String(formData.get(nom) ?? '').trim();

  // Pièges à robots : champ caché rempli ou formulaire envoyé trop vite → on fait semblant d'accepter
  const debut = Number(champ('debut'));
  if (champ('site_web') || (debut && Date.now() - debut < DELAI_MINIMUM_MS)) return { ok: true };

  const type = champ('type');
  if (!TYPES.includes(type)) return { erreur: 'erreurTechnique' };

  const message = champ('message').slice(0, 5000);
  const nom = champ('nom').slice(0, 120);
  const email = champ('email').slice(0, 190);
  const notifier = formData.get('notifier') === 'on';
  if (email && !EMAIL_VALIDE.test(email)) return { erreur: 'erreurEmail' };

  let donnees = null;
  let entreeId = null;
  let mot = null;

  if (type !== 'remarque') {
    const brut = champ('donnees');
    if (brut.length > 60000) return { erreur: 'erreurTechnique' };
    try {
      donnees = normaliserFiche(JSON.parse(brut || '{}'));
    } catch {
      return { erreur: 'erreurTechnique' };
    }
    if (!donnees.mot) return { erreur: 'erreurMot' };
    mot = donnees.mot;

    if (type === 'ajout' && !donnees.sens.some((s) => s.traduction)) return { erreur: 'erreurTraduction' };

    if (type === 'correction') {
      entreeId = Number(champ('entree_id')) || null;
      const entree = entreeId ? await premiere('SELECT id FROM entrees WHERE id = ?', [entreeId]) : null;
      if (!entree) return { erreur: 'erreurTechnique' };
      const actuelle = await chargerFiche(entreeId);
      if (fichesIdentiques(actuelle.fiche, donnees) && !message) return { erreur: 'erreurRienChange' };
    }
  } else if (message.length < 3) {
    return { erreur: 'erreurMessage' };
  }

  try {
    const ipHash = hacherIp(await adresseIp());
    if (await tropDeSuggestions(ipHash)) return { erreur: 'erreurTrop' };

    const suggestion = {
      type,
      entree_id: entreeId,
      mot,
      donnees,
      message,
      nom,
      email,
      notifier: notifier && Boolean(email),
      langue: await langueCourante(),
      ip_hash: ipHash,
    };
    const id = await creerSuggestion(suggestion);
    await purgerDonneesPersonnelles().catch((erreur) => console.error('Purge des données personnelles :', erreur.message));

    // Un problème de mail ne doit pas faire échouer la proposition (elle est déjà enregistrée)
    try {
      await mailNouvelleSuggestion({ id, ...suggestion });
    } catch (erreur) {
      console.error('Envoi du mail de suggestion impossible :', erreur.message);
    }
    return { ok: true };
  } catch (erreur) {
    console.error('Enregistrement de la suggestion impossible :', erreur);
    return { erreur: 'erreurTechnique' };
  }
}
