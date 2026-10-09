-- Générations IA en arrière-plan : une demande = une ligne, identifiée par le navigateur (clé d'idempotence).
-- Le navigateur n'attend plus la fin du travail dans une longue requête (qui pouvait être coupée) : il lance la
-- demande, puis consulte cette ligne par de petites requêtes. Rejouer la même demande ne relance rien.
-- Script ré-exécutable. À coller dans Supabase > SQL Editor AVANT de déployer le code qui l'utilise.

create table if not exists ai_jobs (
  id uuid primary key,                                   -- fourni par le navigateur : clé d'idempotence
  user_id uuid references auth.users on delete cascade not null,
  type text not null,
  status text not null default 'running' check (status in ('running', 'done', 'error')),
  result jsonb,                                          -- corps de réponse : { ok, data } ou { ok: false, code, error }
  http_status int,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists ai_jobs_user_idx on ai_jobs (user_id, created_at desc);
create index if not exists ai_jobs_created_idx on ai_jobs (created_at);

alter table ai_jobs enable row level security;
drop policy if exists ai_jobs_read_own on ai_jobs;
-- Lecture de ses propres demandes seulement ; aucune écriture côté utilisateur (backend uniquement, service role).
create policy ai_jobs_read_own on ai_jobs for select using (user_id = auth.uid());

grant select on ai_jobs to authenticated;
grant all on ai_jobs to service_role;
