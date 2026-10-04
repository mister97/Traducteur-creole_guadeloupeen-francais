'use server';

import { adresseIp } from '@/lib/auth';
import { creerDemande, tropDeDemandes } from '@/lib/acces';
import { mailDemandeAcces } from '@/lib/mail';
import { hacherIp } from '@/lib/suggestions';

const DELAI_MINIMUM_MS = 3000;
const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Demande d'accès à l'API (formulaire public de /api et /licence)
export async function demanderAcces(_etatPrecedent, formData) {
  const champ = (nom) => String(formData.get(nom) ?? '').trim();

  // Pièges à robots : champ caché rempli ou envoi trop rapide
  const debut = Number(champ('debut'));
  if (champ('site_web') || (debut && Date.now() - debut < DELAI_MINIMUM_MS)) return { ok: true };

  const name = champ('name').slice(0, 120);
  const email = champ('email').slice(0, 190);
  const site_url = champ('site_url').slice(0, 190);
  const usage_desc = champ('usage_desc').slice(0, 3000);
  const non_commercial = formData.get('non_commercial') === 'on';

  if (!name) return { erreur: 'Indiquez votre nom ou celui de votre structure.' };
  if (!EMAIL_VALIDE.test(email)) return { erreur: 'Indiquez une adresse e-mail valide : c’est par là que nous vous répondrons.' };
  if (usage_desc.length < 10) return { erreur: 'Décrivez en quelques mots l’usage prévu des données.' };
  if (!non_commercial) return { erreur: 'L’accès est réservé aux usages non commerciaux. Cochez la case, ou décrivez votre projet commercial dans le champ ci-dessus pour une demande de dérogation.' };

  try {
    const ipHash = hacherIp(await adresseIp());
    if (await tropDeDemandes(ipHash)) return { erreur: 'Trop de demandes envoyées depuis cette connexion. Réessayez dans une heure.' };

    const id = await creerDemande({ name, email, site_url, usage_desc, non_commercial, ip_hash: ipHash });
    try {
      await mailDemandeAcces({ id, name, email, site_url, usage_desc });
    } catch (erreur) {
      console.error('Mail de demande d’accès non envoyé :', erreur.message);
    }
    return { ok: true };
  } catch (erreur) {
    console.error('Enregistrement de la demande d’accès impossible :', erreur);
    return { erreur: 'Une erreur est survenue. Réessayez plus tard.' };
  }
}
