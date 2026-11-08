-- Marque « mot francisé », à l'échelle du MOT et non du sens : un emprunt au
-- français l'est quel que soit le sens qu'on lui donne.
--
-- Une case à cocher plutôt qu'un texte libre : la marque d'usage existante
-- laissait chacun écrire « francisé », « francisation » ou « vient du
-- français », sans qu'on puisse jamais lister les mots concernés ni les revoir.
ALTER TABLE entrees ADD COLUMN francise TINYINT(1) NOT NULL DEFAULT 0 AFTER exclu_jeu;
