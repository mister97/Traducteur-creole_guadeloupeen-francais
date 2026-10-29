'use server';

import { redirect } from 'next/navigation';
import { exigerAdmin } from '@/lib/auth';
import { journaliser } from '@/lib/journal';
import { marquerRechercheTraitee, supprimerRechercheVide } from '@/lib/statistiques';

const champ = (formData, nom) => String(formData.get(nom) ?? '').trim();

const retour = (formData, parametre) => {
  const base = champ(formData, 'retour');
  const chemin = base.startsWith('/admin/statistiques') ? base : '/admin/statistiques';
  return `${chemin}${chemin.includes('?') ? '&' : '?'}${parametre}`;
};

export async function classerRecherche(formData) {
  await exigerAdmin();
  const id = Number(champ(formData, 'id'));
  const traite = champ(formData, 'traite') === '1';
  await marquerRechercheTraitee(id, traite);
  await journaliser(traite ? 'recherche.classee' : 'recherche.rouverte', {
    cible: 'recherche',
    cibleId: id,
    cibleLabel: champ(formData, 'terme') || undefined,
  });
  redirect(retour(formData, 'ok=1'));
}

export async function effacerRecherche(formData) {
  await exigerAdmin();
  const id = Number(champ(formData, 'id'));
  await supprimerRechercheVide(id);
  await journaliser('recherche.supprimee', { cible: 'recherche', cibleId: id, cibleLabel: champ(formData, 'terme') || undefined });
  redirect(retour(formData, 'ok=1'));
}
