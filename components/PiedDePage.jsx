import Link from 'next/link';
import { textes } from '@/lib/langue';
import { CONTACT_EMAIL } from '@/lib/site';

export default async function PiedDePage() {
  const { t } = await textes();
  return (
    <footer className="pied">
      <div className="conteneur">
        <div className="pied__grille">
          <div>
            <div className="pied__marque">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/logo-header.png" alt="" width="36" height="36" />
              {t.site.nom}
            </div>
            <p>{t.site.sousTitre}</p>
            <p>{t.pied.livre}</p>
          </div>
          <div>
            <h2>{t.pied.liens}</h2>
            <ul>
              <li>
                <Link href="/lettre/a">{t.nav.dictionnaire}</Link>
              </li>
              <li>
                <Link href="/jeu">{t.nav.jeu}</Link>
              </li>
              <li>
                <Link href="/proposer">{t.nav.proposer}</Link>
              </li>
              <li>
                <Link href="/a-propos">{t.nav.aPropos}</Link>
              </li>
            </ul>
          </div>
          <div>
            <h2>{t.pied.contact}</h2>
            <p>
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
          </div>
        </div>
        <div className="pied__bas">
          <span>
            © {new Date().getFullYear()} {t.site.nom}
          </span>
          <Link href="/mentions-legales">{t.pied.mentions}</Link>
          <Link href="/confidentialite">{t.pied.confidentialite}</Link>
        </div>
      </div>
    </footer>
  );
}
