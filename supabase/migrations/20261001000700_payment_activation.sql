-- Paiements : activation en UNE transaction, prolongation de l'échéance, une seule facture en attente
-- par utilisateur. Script ré-exécutable. À coller dans Supabase > SQL Editor AVANT de déployer le code qui l'appelle.

-- ------------------------------------------- une seule facture en attente par utilisateur
-- (nettoie d'abord d'éventuels doublons : on garde la plus récente)
update payments p set status = 'cancelled'
 where p.status = 'pending'
   and exists (
     select 1 from payments q
      where q.user_id = p.user_id and q.status = 'pending'
        and (q.created_at, q.id) > (p.created_at, p.id)
   );
create unique index if not exists payments_one_pending_per_user on payments (user_id) where status = 'pending';

-- ------------------------------------------------------------------ activation atomique
-- Appelée par le backend (service role) APRÈS vérification auprès du prestataire : le statut du paiement
-- et l'abonnement changent dans la même transaction (tout ou rien), la ligne du paiement est verrouillée
-- (deux appels simultanés : un seul active). Même palier encore actif : le mois s'ajoute à l'échéance en
-- cours (aucun jour perdu). Autre palier ou abonnement échu : le mois démarre aujourd'hui.
-- Un paiement annulé ou échoué côté site mais payé chez le prestataire est activé : l'argent reçu est dû.
create or replace function public.activate_payment(p_payment uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pay payments%rowtype;
  sub subscriptions%rowtype;
  v_base date;
  v_end date;
  v_start date;
begin
  select * into pay from payments where id = p_payment for update;
  if not found then
    return jsonb_build_object('claimed', false, 'plan', null);
  end if;
  if pay.status = 'completed' then
    return jsonb_build_object('claimed', false, 'plan', pay.plan);
  end if;

  select * into sub from subscriptions where user_id = pay.user_id for update;
  if found and sub.plan = pay.plan and sub.status = 'active'
     and sub.current_period_end is not null and sub.current_period_end >= current_date then
    v_base := sub.current_period_end;
    v_start := coalesce(sub.current_period_start, current_date);
  else
    v_base := current_date;
    v_start := current_date;
  end if;
  v_end := (v_base + interval '1 month')::date;

  insert into subscriptions (user_id, plan, seats, status, payment_provider, provider_transaction_id,
                             current_period_start, current_period_end, renewal_date)
  values (pay.user_id, pay.plan, pay.seats, 'active', pay.provider, pay.provider_token, v_start, v_end, v_end)
  on conflict (user_id) do update set
    plan = excluded.plan,
    seats = excluded.seats,
    status = 'active',
    payment_provider = excluded.payment_provider,
    provider_transaction_id = excluded.provider_transaction_id,
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    renewal_date = excluded.renewal_date;

  update payments set status = 'completed', confirmed_at = now() where id = p_payment;

  return jsonb_build_object('claimed', true, 'plan', pay.plan);
end;
$$;

revoke all on function public.activate_payment(uuid) from public, anon, authenticated;
grant execute on function public.activate_payment(uuid) to service_role;
