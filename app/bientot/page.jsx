import Link from 'next/link';
import Decompte from '@/components/Decompte';
import { formaterJour, jourGuadeloupe } from '@/lib/dates';
import { instantLancement, rideauActif } from '@/lib/lancement';
import { textes } from '@/lib/langue';

// Pas d'indexation : cette page remplace temporairement toutes les autres,
// il ne faut pas qu'un moteur la retienne à la place du dictionnaire.
export const metadata = { robots: { index: false, follow: false } };

export default async function PageBientot() {
  const { langue, t } = await textes();
  const instant = instantLancement();
  const b = t.bientot;

  // Rideau levé : la page n'a plus de raison d'être
  if (!instant || !rideauActif()) {
    return (
      <div className="rideau">
        <div className="rideau__carte">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-header.png" alt="" width="72" height="72" />
          <h1 className="rideau__titre">{t.site.nom}</h1>
          <p className="rideau__texte">{b.ouvert}</p>
          <Link href="/" className="bouton bouton--principal">
            {b.entrer}
          </Link>
        </div>
      </div>
    );
  }

  const jour = jourGuadeloupe(new Date(instant));

  return (
    <div className="rideau">
      <div className="rideau__carte">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/logo-header.png" alt="" width="72" height="72" />

        {/* <p className="rideau__surtitre">{b.surtitre}</p> */}
        <h1 className="rideau__titre">{t.site.nom}</h1>
        <p className="rideau__soustitre">{t.site.sousTitre}</p>

        <Decompte
          instant={instant}
          libelles={{ jours: b.jours, heures: b.heures, minutes: b.minutes, secondes: b.secondes }}
        />

        <p className="rideau__texte">{b.texte.replace('{date}', formaterJour(jour, langue, { annee: true }))}</p>
      </div>

      <Link href="/admin/connexion" className="rideau__connexion">
        {b.connexion}
      </Link>
    </div>
  );
}
