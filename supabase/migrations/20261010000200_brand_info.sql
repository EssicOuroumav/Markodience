-- Fiche de la marque : site web, réseaux sociaux, autres liens (documents, dossiers partagés) et courte présentation.
-- Tout est facultatif : ces informations servent à construire plus vite l'espace de la marque et à guider l'IA.
alter table brand_profiles add column if not exists website text check (website is null or website ~* '^https?://');
alter table brand_profiles add column if not exists socials jsonb not null default '{}'::jsonb;
alter table brand_profiles add column if not exists links jsonb not null default '[]'::jsonb;
alter table brand_profiles add column if not exists about text check (about is null or char_length(about) <= 800);
