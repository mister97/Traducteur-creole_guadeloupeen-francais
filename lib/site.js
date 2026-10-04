export const SITE_NOM = 'Chalviraj';
export const SITE_URL = (process.env.SITE_URL || 'https://chalviraj.com').replace(/\/+$/, '');
// Adresse de réception des notifications. Jamais affichée sur le site :
// tous les contacts passent par un formulaire (voir CONTACT_FORMULAIRE).
export const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'kontakt@chalviraj.com';

// Formulaire de contact public (remarque libre) et demande d'accès à l'API
export const CONTACT_FORMULAIRE = '/proposer?type=remarque';
export const PAGE_API = '/api';
