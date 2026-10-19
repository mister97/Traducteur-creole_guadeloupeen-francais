import { NextResponse } from 'next/server';
import { CHEMIN_RIDEAU, rideauActif } from './lib/lancement';
import { COOKIE_ADMIN, cookiePlausible } from './lib/session';

// Deux rôles, dans cet ordre :
//
// 1. Administration — premier filtre seulement : renvoie vers la connexion un
//    visiteur sans cookie exploitable. Ce n'est PAS la barrière de sécurité :
//    un cookie forgé passe ici. Chaque page, action et route de /admin appelle
//    exigerAdmin() (lib/auth.js), qui vérifie la signature et l'état du compte.
//
// 2. Rideau d'avant-lancement — le site public affiche un décompte tant que
//    DATE_LANCEMENT n'est pas passée. C'est un rideau, pas un coffre-fort :
//    il repose sur la simple présence d'un cookie d'administration. Il protège
//    d'une visite prématurée, pas d'un curieux déterminé.

function espaceAdmin(chemin) {
  return chemin === '/admin' || chemin.startsWith('/admin/');
}

// Pages de /admin accessibles sans session : sinon personne ne pourrait
// se connecter ni activer son compte pendant le rideau.
function adminSansSession(chemin) {
  return (
    chemin === '/admin/connexion' ||
    chemin === '/admin/mot-de-passe-oublie' ||
    chemin.startsWith('/admin/mot-de-passe/')
  );
}

export function proxy(request) {
  const chemin = request.nextUrl.pathname;
  const connecte = cookiePlausible(request.cookies.get(COOKIE_ADMIN)?.value);

  if (espaceAdmin(chemin)) {
    if (adminSansSession(chemin) || connecte) return NextResponse.next();
    if (request.method !== 'GET') return new NextResponse('Non autorisé', { status: 401 });
    return NextResponse.redirect(new URL('/admin/connexion', request.url));
  }

  // /api/sante doit répondre même rideau baissé : c'est l'outil de diagnostic
  if (!rideauActif() || connecte || chemin === CHEMIN_RIDEAU || chemin === '/api/sante') {
    return NextResponse.next();
  }

  // Une API répond en JSON, jamais par une page de décompte
  if (chemin.startsWith('/api/')) {
    return NextResponse.json(
      { error: { code: 'not_launched', message: 'Le dictionnaire n’est pas encore ouvert au public.' } },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  // Réécriture plutôt que redirection : l'adresse demandée est conservée,
  // donc un lien partagé avant l'ouverture fonctionnera après, sans changer.
  return NextResponse.rewrite(new URL(CHEMIN_RIDEAU, request.url));
}

export const config = {
  matcher: [
    '/((?!_next/|img/|images/|ai\\.txt|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|favicon\\.ico).*)',
  ],
};
