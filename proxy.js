import { NextResponse } from 'next/server';
import { COOKIE_ADMIN, cookiePlausible } from './lib/session';

// Premier filtre seulement : renvoie vers la connexion un visiteur sans cookie
// exploitable. Ce n'est PAS la barrière de sécurité — un cookie forgé passe ici.
// Chaque page, action et route de l'administration appelle exigerAdmin()
// (lib/auth.js), qui vérifie la signature et l'état du compte en base.
export function proxy(request) {
  const chemin = request.nextUrl.pathname;
  const publique =
    chemin === '/admin/connexion' ||
    chemin === '/admin/mot-de-passe-oublie' ||
    chemin.startsWith('/admin/mot-de-passe/');
  if (publique) return NextResponse.next();

  if (cookiePlausible(request.cookies.get(COOKIE_ADMIN)?.value)) return NextResponse.next();
  if (request.method !== 'GET') return new NextResponse('Non autorisé', { status: 401 });
  return NextResponse.redirect(new URL('/admin/connexion', request.url));
}

export const config = {
  matcher: ['/admin', '/admin/:chemin*'],
};
