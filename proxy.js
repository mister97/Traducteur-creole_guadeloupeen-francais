import { NextResponse } from 'next/server';
import { COOKIE_ADMIN, jetonValide } from './lib/session';

// Toute l'administration exige une session valide, sauf la page de connexion.
// Les actions serveur vérifient aussi la session elles-mêmes (lib/auth.js).
export function proxy(request) {
  if (request.nextUrl.pathname === '/admin/connexion') return NextResponse.next();
  if (jetonValide(request.cookies.get(COOKIE_ADMIN)?.value)) return NextResponse.next();
  if (request.method !== 'GET') return new NextResponse('Non autorisé', { status: 401 });
  return NextResponse.redirect(new URL('/admin/connexion', request.url));
}

export const config = {
  matcher: ['/admin', '/admin/:chemin*'],
};
