-- Rappels par e-mail : préférences de l'utilisateur et journal d'envoi (un message par jour au plus).
create table if not exists reminder_prefs (
  user_id uuid primary key references auth.users on delete cascade,
  email_enabled boolean not null default true,
  kpi boolean not null default true,
  posts boolean not null default true,
  billing boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table reminder_prefs enable row level security;
drop policy if exists reminder_prefs_own on reminder_prefs;
create policy reminder_prefs_own on reminder_prefs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on reminder_prefs to authenticated;
grant all on reminder_prefs to service_role;

create table if not exists reminder_log (
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  items int not null default 0,
  sent_at timestamptz not null default now(),
  primary key (user_id, day)
);
-- Journal réservé au serveur : aucune politique pour les utilisateurs.
alter table reminder_log enable row level security;
grant all on reminder_log to service_role;
