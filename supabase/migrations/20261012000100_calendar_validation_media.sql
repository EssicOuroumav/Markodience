-- Lot C : calendrier éditorial (statuts, responsable, lien de visuel), circuit de validation par lien, médiathèque (liens).

-- ───────────────────────────── Statuts des publications ─────────────────────────────
-- Brouillon → À valider → Programmé → Publié. L'ancien « Prêt » devient « Programmé ».
alter table posts drop constraint if exists posts_status_check;
update posts set status = 'programme' where status = 'pret';
alter table posts add constraint posts_status_check check (status in ('brouillon', 'a_valider', 'programme', 'publie'));
alter table posts add column if not exists assignee text check (assignee is null or char_length(assignee) <= 120);
alter table posts add column if not exists design_link text check (design_link is null or (char_length(design_link) <= 400 and design_link ~* '^https?://'));
alter table posts add column if not exists review_note text check (review_note is null or char_length(review_note) <= 1000);
alter table posts add column if not exists asset_id uuid references assets on delete set null;

-- ───────────────────────────── Circuit de validation par lien ─────────────────────────────
-- Un validateur (graphiste, direction, client) n'a pas besoin de compte : il reçoit un lien secret. Seul l'empreinte du lien est stockée.
create table if not exists validation_requests (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid not null references brand_profiles on delete cascade,
  token_hash text not null unique,
  reviewer text not null check (char_length(reviewer) between 1 and 120),
  note text not null default '' check (char_length(note) <= 1000),
  post_ids uuid[] not null check (cardinality(post_ids) between 1 and 40),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists validation_brand_idx on validation_requests (brand_profile_id, created_at desc);
alter table validation_requests enable row level security;
drop policy if exists validation_requests_own on validation_requests;
create policy validation_requests_own on validation_requests for all using (owns_brand(brand_profile_id)) with check (owns_brand(brand_profile_id));
drop policy if exists plan_gate_ins on validation_requests;
create policy plan_gate_ins on validation_requests as restrictive for insert to authenticated with check (public.my_plan() <> 'gratuit');
grant select, insert, update on validation_requests to authenticated;
grant all on validation_requests to service_role;

create table if not exists post_reviews (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts on delete cascade,
  request_id uuid references validation_requests on delete set null,
  reviewer text not null check (char_length(reviewer) between 1 and 120),
  decision text not null check (decision in ('approuve', 'modifs')),
  comment text not null default '' check (char_length(comment) <= 1000),
  created_at timestamptz not null default now()
);
create index if not exists post_reviews_post_idx on post_reviews (post_id, created_at desc);
alter table post_reviews enable row level security;
-- Lecture par le propriétaire de la marque ; l'écriture passe uniquement par le serveur (décision d'un validateur via son lien).
drop policy if exists post_reviews_read on post_reviews;
create policy post_reviews_read on post_reviews for select using (exists (select 1 from posts p where p.id = post_reviews.post_id and owns_brand(p.brand_profile_id)));
grant select on post_reviews to authenticated;
grant all on post_reviews to service_role;

-- ───────────────────────────── Médiathèque : liens et ressources ─────────────────────────────
create table if not exists media_links (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid not null references brand_profiles on delete cascade,
  label text not null check (char_length(label) between 1 and 120),
  url text not null check (char_length(url) <= 400 and url ~* '^https?://'),
  kind text not null default 'autre' check (kind in ('dossier', 'canva', 'figma', 'charte', 'document', 'autre')),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists media_links_brand_idx on media_links (brand_profile_id, position);
alter table media_links enable row level security;
drop policy if exists media_links_own on media_links;
create policy media_links_own on media_links for all using (owns_brand(brand_profile_id)) with check (owns_brand(brand_profile_id));
drop policy if exists media_links_cap on media_links;
create policy media_links_cap on media_links as restrictive for insert to authenticated
  with check ((select count(*) from media_links x where x.brand_profile_id = media_links.brand_profile_id) < 60);
drop policy if exists plan_gate_ins on media_links;
create policy plan_gate_ins on media_links as restrictive for insert to authenticated with check (public.my_plan() <> 'gratuit');
grant select, insert, update, delete on media_links to authenticated;
grant all on media_links to service_role;
