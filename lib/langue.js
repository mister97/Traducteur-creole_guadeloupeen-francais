import { cookies } from 'next/headers';
import { LANGUE_DEFAUT, LANGUES, TEXTES } from './textes';

export const COOKIE_LANGUE = 'langue';

export async function langueCourante() {
  const valeur = (await cookies()).get(COOKIE_LANGUE)?.value;
  return LANGUES.includes(valeur) ? valeur : LANGUE_DEFAUT;
}

export async function textes() {
  const langue = await langueCourante();
  return { langue, t: TEXTES[langue] };
}
