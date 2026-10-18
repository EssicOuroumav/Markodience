-- Limitation de débit partagée entre toutes les instances (fenêtre fixe). Script ré-exécutable.
-- Table et fonctions réservées au backend (clé de service) : aucun accès depuis un navigateur.

create table if not exists rate_limits (
  key text primary key check (char_length(key) <= 200),
  count int not null check (count >= 0),
  reset_at timestamptz not null
);
create index if not exists rate_limits_reset_idx on rate_limits (reset_at);

alter table rate_limits enable row level security;  -- aucune politique : ni anonyme ni connecté ne peut lire ni écrire
revoke all on rate_limits from anon, authenticated;
grant all on rate_limits to service_role;

-- Compte un appel. Renvoie true tant que la limite n'est pas dépassée dans la fenêtre, false ensuite.
create or replace function public.consume_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v int;
begin
  if p_key is null or char_length(p_key) > 200 or p_max < 1 or p_max > 100000 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'paramètres invalides';
  end if;
  insert into rate_limits as r (key, count, reset_at)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update set
    count = case when r.reset_at < now() then 1 else r.count + 1 end,
    reset_at = case when r.reset_at < now() then now() + make_interval(secs => p_window_seconds) else r.reset_at end
  returning count into v;
  return v <= p_max;
end $$;

-- Supprime les compteurs expirés depuis plus d'une heure (appelée par la tâche quotidienne).
create or replace function public.purge_rate_limits()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  delete from rate_limits where reset_at < now() - interval '1 hour';
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.consume_rate_limit(text, int, int) from public, anon, authenticated;
revoke all on function public.purge_rate_limits() from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, int, int) to service_role;
grant execute on function public.purge_rate_limits() to service_role;
