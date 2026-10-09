-- Fondations de la marque (mission, vision, valeurs, promesse…) et charte graphique (typographie, logo, visuels).
-- Colonnes facultatives : les identités existantes restent valides et se complètent en un clic.
alter table brand_identity add column if not exists foundations jsonb;
alter table brand_identity add column if not exists visual_guide jsonb;
