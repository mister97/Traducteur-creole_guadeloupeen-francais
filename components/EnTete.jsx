'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import ChoixLangue from './ChoixLangue';
import { useTextes } from './FournisseurTextes';
import { IconeCroix, IconeMenu } from './Icones';
import Recherche from './Recherche';

export default function EnTete() {
  const { t } = useTextes();
  const chemin = usePathname();
  const [menuOuvert, setMenuOuvert] = useState(false);

  useEffect(() => setMenuOuvert(false), [chemin]);

  const accueil = chemin === '/';
  const avecRecherche = !accueil && chemin !== '/recherche' && chemin !== '/jeu';

  const liens = [
    { href: '/lettre/a', libelle: t.nav.dictionnaire, actif: chemin.startsWith('/lettre') || chemin.startsWith('/mo/') || chemin.startsWith('/fr/') },
    { href: '/jeu', libelle: t.nav.jeu, actif: chemin === '/jeu' },
    { href: '/proposer', libelle: t.nav.proposer, actif: chemin === '/proposer' },
    { href: '/a-propos', libelle: t.nav.aPropos, actif: chemin === '/a-propos' },
  ];

  return (
    <header className={`entete${accueil ? ' entete--accueil' : ''}`}>
      <div className="conteneur">
        <div className="entete__rangee">
          <Link href="/" className="marque">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/logo-header.png" alt="" width="42" height="42" />
            <span>
              <span className="marque__nom">{t.site.nom}</span>
              <span className="marque__sous-titre">{t.site.sousTitre}</span>
            </span>
          </Link>

          {avecRecherche && (
            <div className="entete__recherche">
              <Recherche taille="compacte" />
            </div>
          )}

          <nav className="nav" data-ouvert={menuOuvert} aria-label={t.nav.menu}>
            {liens.map((l) => (
              <Link key={l.href} href={l.href} aria-current={l.actif ? 'page' : undefined}>
                {l.libelle}
              </Link>
            ))}
          </nav>

          <ChoixLangue />

          <button
            type="button"
            className="bouton-menu"
            aria-expanded={menuOuvert}
            aria-label={menuOuvert ? t.nav.fermer : t.nav.menu}
            onClick={() => setMenuOuvert((o) => !o)}
          >
            {menuOuvert ? <IconeCroix /> : <IconeMenu />}
          </button>
        </div>

        {avecRecherche && (
          <div className="entete__recherche-mobile">
            <Recherche taille="compacte" />
          </div>
        )}
      </div>
    </header>
  );
}
