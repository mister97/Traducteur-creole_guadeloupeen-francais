-- Rend les expressions trouvables par la recherche, dans les deux sens.
-- Jusqu'ici la table n'etait interrogee que par entree_id : « fe konmes »
-- etait invisible, en creole comme en francais.

ALTER TABLE locutions ADD COLUMN recherche_kr VARCHAR(255) NOT NULL DEFAULT '' AFTER expression;
ALTER TABLE locutions ADD COLUMN recherche_fr TEXT NULL AFTER traduction;
ALTER TABLE locutions ADD KEY idx_loc_recherche_kr (recherche_kr);
