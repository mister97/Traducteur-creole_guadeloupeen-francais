// Informations des pages « Mentions légales » et « Confidentialité ».
// Toute valeur laissée à A_COMPLETER s'affiche en rouge sur les pages et est
// signalée sur le tableau de bord de l'admin.

export const A_COMPLETER = 'À COMPLÉTER';

export const MENTIONS = {
  // Éditeur du site (porteur du projet).
  // Adresse non publiée : un particulier qui édite un site à titre non professionnel
  // n'est pas tenu de la publier, à condition que l'hébergeur ou l'administrateur du
  // serveur connaisse son identité (loi LCEN, art. 6). Pour la publier, remplacez null.
  editeur: {
    nom: 'Tom Reuge',
    adresse: null,
  },

  // Personne responsable du contenu publié
  directeurPublication: 'Tom Reuge',

  // Hébergeur au sens de la loi : nom, adresse et téléphone obligatoires.
  // Source : conditions générales de 123 Reg (www.123-reg.co.uk/terms/general-terms/)
  hebergeur: {
    nom: '123 Reg Limited',
    adresse: 'Studio 4th Floor, Parts C&D At East West, Tollhouse Hill, Nottingham NG1 5FW, Royaume-Uni',
    telephone: '+44 345 450 2580',
    site: 'https://www.123-reg.co.uk',
  },

  // Administration du serveur (pas d'adresse ni de téléphone à publier)
  administrationServeur: {
    nom: 'Karib Tech (Kevin Crane)',
    site: 'https://karib-tech.com',
  },

  // Où sont traitées les données (page Confidentialité)
  localisationDonnees:
    'Le serveur est fourni par 123 Reg Limited, société établie au Royaume-Uni. Le Royaume-Uni bénéficie d’une décision d’adéquation de la Commission européenne (renouvelée jusqu’en décembre 2031) : les données y sont protégées de façon équivalente au RGPD.',

  // Prestataire de la messagerie (d'après la configuration SMTP ssl0.ovh.net)
  messagerie: 'OVH SAS, 2 rue Kellermann, 59100 Roubaix, France',

  // Personnes créditées dans les mentions légales
  credits: [
    { role: 'Conception et développement', nom: 'Karib Tech (Kevin Crane)', site: 'https://karib-tech.com' },
    { role: 'Contribution linguistique', nom: 'Malayan Cloudius, professeur de créole', site: null },
  ],

  // Date de dernière mise à jour des deux pages (AAAA-MM-JJ)
  miseAJour: '2026-09-14',
};

// Durées de conservation appliquées par lib/suggestions.js (purgerDonneesPersonnelles)
export const CONSERVATION = {
  empreinteIpJours: 2,
  contactMoisApresTraitement: 12,
  // Journaux du serveur web : à faire correspondre à la rotation des journaux dans Plesk
  journauxMois: 12,
};

export function mentionsIncompletes() {
  return JSON.stringify(MENTIONS).includes(A_COMPLETER);
}
