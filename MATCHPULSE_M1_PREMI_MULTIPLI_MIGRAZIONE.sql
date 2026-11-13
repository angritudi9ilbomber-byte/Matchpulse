-- MATCHPULSE · PREMI MULTIPLI E OBIETTIVI GOL/ASSIST (branch di sviluppo)
-- ESEGUIRE SOLO SUL DATABASE SUPABASE DI MATCHPULSE.
-- Prima dell'esecuzione fare un backup; eseguire PRIMA di pubblicare il nuovo JS.
-- Requisiti: M1, M2/M6 e Founder immediato già installati.
-- Nessun reset di wallet, riscatti, partite, inventario, stagioni o carte.
begin;

do $check$
begin
 if to_regprocedure('public.mp_m1_founder_save(jsonb)') is null then
   raise exception 'Prima installa il Founder immediato: manca mp_m1_founder_save(jsonb).';
 end if;
 if to_regprocedure('public.mp_m1_publish_due()') is null then
   raise exception 'Prima installa la gestione delle sfide M1: manca mp_m1_publish_due().';
 end if;
 if to_regclass('public.matchpulse_m2_inventory') is null then
   raise exception 'Prima installa il Negozio M2.';
 end if;
end
$check$;

alter table public.matchpulse_m1_challenges
  add column if not exists reward_config jsonb,
  add column if not exists goal_logic text not null default 'legacy',
  add column if not exists goals_target integer,
  add column if not exists assists_target integer;

alter table public.matchpulse_m1_challenges
  drop constraint if exists mp_m1_goal_logic_check;
alter table public.matchpulse_m1_challenges
  add constraint mp_m1_goal_logic_check check (
    goal_logic in ('legacy','both','either')
    and (goal_logic='legacy' or (
      goals_target between 1 and 1000
      and assists_target between 1 and 1000))
  );

-- I vincoli del progetto reale sono:
--   claims: CHECK (tokens > 0)
--   inventario: CHECK (obtained_by IN ('direct','pack'))
-- In Supabase i nomi dei vincoli possono variare.
-- Eliminiamo SOLO i CHECK riferiti a quelle specifiche colonne,
-- senza toccare le chiavi primarie, gli indici unici o altri vincoli.
do $adjust_checks$
declare
  v_check record;
begin
  for v_check in
    select conrelid::regclass as table_ref, conname
      from pg_catalog.pg_constraint
     where contype='c'
       and (
         (conrelid='public.matchpulse_m1_claims'::regclass
          and pg_catalog.pg_get_constraintdef(oid) ilike '%tokens%')
         or
         (conrelid='public.matchpulse_m2_inventory'::regclass
          and pg_catalog.pg_get_constraintdef(oid) ilike '%obtained_by%')
       )
  loop
    execute format('alter table %s drop constraint %I',
      v_check.table_ref, v_check.conname);
  end loop;
end
$adjust_checks$;

alter table public.matchpulse_m1_claims
  add constraint mp_m1_claims_tokens_nonnegative check(tokens>=0);
alter table public.matchpulse_m2_inventory
  add constraint mp_m1_inventory_obtained_by
    check(obtained_by in ('direct','pack','reward','reward_pack'));

create table if not exists public.matchpulse_m1_bonus_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  season_id text not null,
  period_key text not null,
  challenge_id text not null references public.matchpulse_m1_challenges(id),
  pack_id text not null references public.matchpulse_m2_packs(id),
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  awarded_skin_id text references public.matchpulse_m2_skins(id),
  unique(user_id,season_id,period_key,challenge_id)
);

alter table public.matchpulse_m1_bonus_packs enable row level security;
revoke all on public.matchpulse_m1_bonus_packs from public,anon,authenticated;
grant select on public.matchpulse_m1_bonus_packs to authenticated;
drop policy if exists mp_m1_bonus_packs_self on public.matchpulse_m1_bonus_packs;
create policy mp_m1_bonus_packs_self on public.matchpulse_m1_bonus_packs
  for select to authenticated using(user_id=(select auth.uid()));

-- Usa la funzione Founder già esistente per permessi, validazioni, scrittura
-- immediata e cancellazione delle versioni in attesa; aggiunge le nuove opzioni.
create or replace function public.mp_m1_founder_save_v2(p_goal jsonb)
returns text language plpgsql security definer set search_path=''
as $$
declare
 v_user uuid:=(select auth.uid());
 v_rewards jsonb:=coalesce(p_goal->'reward_config','{}'::jsonb);
 v_tokens integer;
 v_pack text:=nullif(btrim(v_rewards->>'pack_id'),'');
 v_skin text:=nullif(btrim(v_rewards->>'skin_id'),'');
 v_emblem text:=nullif(btrim(v_rewards->>'emblem_id'),'');
 v_logic text:=coalesce(nullif(p_goal->>'goal_logic',''),'legacy');
 v_metric text:=p_goal->>'metric';
 v_goals integer;
 v_assists integer;
 v_id text;
 v_for_base jsonb;
begin
 if v_user is null or not coalesce(public.matchpulse_is_app_admin(),false) then
   raise exception 'Solo Founder autorizzato';
 end if;
 if jsonb_typeof(v_rewards)<>'object' then
   raise exception 'Ricompense non valide';
 end if;
 if v_rewards->>'tokens' is null then v_tokens:=0;
 else v_tokens:=(v_rewards->>'tokens')::integer; end if;
 if v_tokens not between 0 and 2000 then
   raise exception 'Token fuori intervallo 0-2000';
 end if;
 if v_pack is null and v_skin is null and v_emblem is null and v_tokens=0 then
   raise exception 'Seleziona almeno una ricompensa';
 end if;
 if v_pack is not null and not exists (
   select 1 from public.matchpulse_m2_packs
   where id=v_pack and active=true and id in
     ('pack_classic','pack_fc_originals','pack_collaborazioni')
 ) then raise exception 'Pacchetto non disponibile'; end if;
 if v_skin is not null and not exists (
   select 1 from public.matchpulse_m2_skins
   where id=v_skin and active=true
     and (theme='matchpulse' or rarity<>'common')
 ) then raise exception 'Skin non disponibile'; end if;
 if v_emblem is not null and not exists (
   select 1 from public.matchpulse_m2_skins
   where id=v_emblem and active=true and rarity='common'
     and theme<>'matchpulse'
 ) then raise exception 'Emblema non disponibile'; end if;
 if v_logic not in ('legacy','both','either') then
   raise exception 'Logica gol/assist non valida'; end if;
 if v_logic<>'legacy' then
   if v_metric not in ('contributions','role_contributions') then
     raise exception 'Gol E/O Assist richiede metrica contributi';
   end if;
   v_goals:=(p_goal->>'goals_target')::integer;
   v_assists:=(p_goal->>'assists_target')::integer;
   if v_goals not between 1 and 1000 or v_assists not between 1 and 1000
     or v_goals is null or v_assists is null then
       raise exception 'Inserisci gol richiesti e assist richiesti, tra 1 e 1000';
   end if;
 end if;

 -- Per la funzione Founder precedente, reward ha minimo 1.
 -- Il valore reale dei token è SOLO in reward_config (anche zero).
 v_for_base:=p_goal||jsonb_build_object(
   'reward',greatest(v_tokens,1)
 );
 v_id:=public.mp_m1_founder_save(v_for_base);

 update public.matchpulse_m1_challenges
 set reward_config=jsonb_build_object(
       'tokens',v_tokens,'pack_id',v_pack,'skin_id',v_skin,
       'emblem_id',v_emblem),
     goal_logic=v_logic,goals_target=v_goals,assists_target=v_assists
 where id=v_id;

 return v_id;
end
$$;

-- Unico riscatto atomico. Controlla ruolo, periodo, soglie, inventario e premi
-- sul server. Il client non può scegliere o alterare una ricompensa.
create or replace function public.mp_m1_claim_rewards(p_challenge_id text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_user uuid:=(select auth.uid());
 v_today date:=(now() at time zone 'Europe/Rome')::date;
 v_week date:=date_trunc('week',now() at time zone 'Europe/Rome')::date;
 v_y integer;
 v_season text;
 v_start date;
 v_end date;
 v_period text;
 v_ch public.matchpulse_m1_challenges%rowtype;
 v_role text;
 v_progress integer:=0;
 v_goals integer:=0;
 v_assists integer:=0;
 v_inserted integer:=0;
 v_tokens integer;
 v_rewards jsonb;
 v_pack text;
 v_skin text;
 v_emblem text;
 v_already jsonb:='[]'::jsonb;
 v_awarded jsonb:='[]'::jsonb;
 v_skin_id text;
begin
 if v_user is null then raise exception 'Accesso richiesto'; end if;
 -- Mantiene l'attivazione programmata del vecchio sistema, se presente.
 perform public.mp_m1_publish_due();
 v_y:=extract(year from v_today)::int-
   case when extract(month from v_today)<9 then 1 else 0 end;
 v_season:=v_y::text||'-'||(v_y+1)::text;
 v_start:=make_date(v_y,9,1);v_end:=make_date(v_y+1,9,1);
 perform pg_catalog.pg_advisory_xact_lock(
   hashtext(v_user::text),hashtext(v_season));

 select * into v_ch from public.matchpulse_m1_challenges
 where id=p_challenge_id and active=true
   and coalesce(founder_deleted,false)=false
 for update;
 if not found then raise exception 'Obiettivo non disponibile'; end if;

 v_period:=case when v_ch.scope='milestone'
   then v_season else v_week::text end;

 if v_ch.scope='role' then
   select role into v_role from public.matchpulse_m1_role_locks
   where user_id=v_user and season_id=v_season and week_key=v_period;
   if v_role is null or v_role<>v_ch.role then
     raise exception 'Obiettivo non previsto per il tuo ruolo';
   end if;
 end if;

 if exists (
   select 1 from public.matchpulse_m1_claims
   where user_id=v_user and season_id=v_season
     and period_key=v_period and challenge_id=p_challenge_id
 ) then raise exception 'Premio già riscattato'; end if;

 if v_ch.metric='manual' then
   select coalesce(progress,0) into v_progress
   from public.matchpulse_m1_manual_progress
   where user_id=v_user and season_id=v_season
     and period_key=v_period and challenge_id=p_challenge_id;
   v_progress:=coalesce(v_progress,0);
 else
   select
     coalesce(sum(case when v_ch.scope<>'role' or m.role=v_role
                      then m.goals else 0 end),0)::integer,
     coalesce(sum(case when v_ch.scope<>'role' or m.role=v_role
                      then m.assists else 0 end),0)::integer,
     coalesce(sum(case v_ch.metric
       when 'played' then 1
       when 'wins' then case when m.outcome='Vittoria' then 1 else 0 end
       when 'goals' then m.goals
       when 'assists' then m.assists
       when 'contributions' then m.goals+m.assists
       when 'role_played' then case when m.role=v_role then 1 else 0 end
       when 'role_wins' then case when m.role=v_role and m.outcome='Vittoria' then 1 else 0 end
       when 'role_goals' then case when m.role=v_role then m.goals else 0 end
       when 'role_assists' then case when m.role=v_role then m.assists else 0 end
       when 'role_contributions' then case when m.role=v_role then m.goals+m.assists else 0 end
       else 0 end),0)::integer
   into v_goals,v_assists,v_progress
   from public.matchpulse_m1_matches m
   where m.user_id=v_user and m.match_date>=v_start and m.match_date<v_end
     and (v_ch.scope='milestone' or
         (m.match_date>=v_week and m.match_date<v_week+7));
 end if;

 if v_ch.goal_logic='both' then
   if v_goals<v_ch.goals_target or v_assists<v_ch.assists_target then
     raise exception 'Servono sia i gol sia gli assist richiesti';
   end if;
 elsif v_ch.goal_logic='either' then
   if v_goals<v_ch.goals_target and v_assists<v_ch.assists_target then
     raise exception 'Non hai ancora raggiunto i gol oppure gli assist richiesti';
   end if;
 elsif v_progress<v_ch.target then
   raise exception 'Obiettivo non ancora completato';
 end if;

 v_rewards:=v_ch.reward_config;
 v_tokens:=case when v_rewards is null then v_ch.reward
              else coalesce((v_rewards->>'tokens')::integer,0) end;
 v_pack:=nullif(v_rewards->>'pack_id','');
 v_skin:=nullif(v_rewards->>'skin_id','');
 v_emblem:=nullif(v_rewards->>'emblem_id','');

 insert into public.matchpulse_m1_claims
   (user_id,season_id,period_key,challenge_id,tokens)
 values(v_user,v_season,v_period,v_ch.id,v_tokens)
 on conflict do nothing;
 get diagnostics v_inserted=row_count;
 if v_inserted=0 then raise exception 'Premio già riscattato'; end if;

 if v_tokens>0 then
   insert into public.matchpulse_m1_wallet_ledger
     (user_id,season_id,source_key,amount)
   values(v_user,v_season,v_period||':'||v_ch.id,v_tokens);
 end if;

 for v_skin_id in
   select distinct x from (values(v_skin),(v_emblem)) a(x)
   where x is not null
 loop
   if not exists(select 1 from public.matchpulse_m2_skins where id=v_skin_id) then
     raise exception 'Cosmetico premio non disponibile (%)',v_skin_id;
   end if;
   insert into public.matchpulse_m2_inventory
     (user_id,season_id,skin_id,obtained_by)
   values(v_user,v_season,v_skin_id,'reward')
   on conflict(user_id,season_id,skin_id) do nothing;
   get diagnostics v_inserted=row_count;
   if v_inserted>0 then
     v_awarded:=v_awarded||to_jsonb(v_skin_id);
   else
     v_already:=v_already||to_jsonb(v_skin_id);
   end if;
 end loop;

 if v_pack is not null then
   if not exists(select 1 from public.matchpulse_m2_packs
     where id=v_pack) then
     raise exception 'Pacchetto premio non trovato';
   end if;
   insert into public.matchpulse_m1_bonus_packs
     (user_id,season_id,period_key,challenge_id,pack_id)
   values(v_user,v_season,v_period,v_ch.id,v_pack);
 end if;

 return jsonb_build_object(
   'tokens',v_tokens,'season',v_season,'challenge_id',v_ch.id,
   'pack_id',v_pack,'skin_awarded',v_awarded,'already_owned',v_already
 );
end
$$;

-- Apertura gratuita, estrae con le stesse fasce di rarità del negozio M6.
-- Prima estrae la rarità disponibile, poi un cosmetico non posseduto.
create or replace function public.mp_m1_open_reward_pack(p_reward_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_user uuid:=(select auth.uid());
 v_y integer;
 v_season text;
 v_bonus public.matchpulse_m1_bonus_packs%rowtype;
 v_pack public.matchpulse_m2_packs%rowtype;
 v_tier text;
 v_skin text;
begin
 if v_user is null then raise exception 'Accesso richiesto'; end if;
 v_y:=extract(year from (now() at time zone 'Europe/Rome'))::int-
   case when extract(month from (now() at time zone 'Europe/Rome'))<9
        then 1 else 0 end;
 v_season:=v_y::text||'-'||(v_y+1)::text;
 perform pg_catalog.pg_advisory_xact_lock(
   hashtext(v_user::text),hashtext(v_season));
 select * into v_bonus from public.matchpulse_m1_bonus_packs
 where id=p_reward_id and user_id=v_user and season_id=v_season
 for update;
 if not found then raise exception 'Pacchetto non disponibile'; end if;
 if v_bonus.opened_at is not null then
   return jsonb_build_object('skin_id',v_bonus.awarded_skin_id,
     'pack_id',v_bonus.pack_id,'replayed',true);
 end if;
 select * into v_pack from public.matchpulse_m2_packs
 where id=v_bonus.pack_id;
 if not found then raise exception 'Pacchetto premio inesistente'; end if;

 select lottery.rarity into v_tier
 from (values
   ('common',v_pack.common_weight),('rare',v_pack.rare_weight),
   ('epic',v_pack.epic_weight),('legendary',v_pack.legendary_weight)
 ) as lottery(rarity,weight)
 where lottery.weight>0 and exists (
   select 1 from public.matchpulse_m2_skins s
   where s.active=true and s.rarity=lottery.rarity
     and (v_pack.theme='any' or s.theme=v_pack.theme)
     and (v_pack.id<>'pack_collaborazioni' or
           s.theme in ('onepiece','dragonball','cyberpunk','formula1'))
     and not exists(select 1 from public.matchpulse_m2_inventory i
       where i.user_id=v_user and i.season_id=v_season and i.skin_id=s.id)
 )
 order by -ln(greatest(random(),0.000000001))/lottery.weight limit 1;
 if v_tier is null then
   raise exception 'Nessun cosmetico nuovo: il pacchetto resta da aprire';
 end if;
 select s.id into v_skin from public.matchpulse_m2_skins s
 where s.active=true and s.rarity=v_tier
   and (v_pack.theme='any' or s.theme=v_pack.theme)
   and (v_pack.id<>'pack_collaborazioni' or
        s.theme in ('onepiece','dragonball','cyberpunk','formula1'))
   and not exists(select 1 from public.matchpulse_m2_inventory i
     where i.user_id=v_user and i.season_id=v_season and i.skin_id=s.id)
 order by random() limit 1;
 if v_skin is null then raise exception 'Nessuna skin disponibile'; end if;

 insert into public.matchpulse_m2_inventory
   (user_id,season_id,skin_id,obtained_by)
 values(v_user,v_season,v_skin,'reward_pack');
 update public.matchpulse_m1_bonus_packs
 set opened_at=now(),awarded_skin_id=v_skin
 where id=v_bonus.id;

 return jsonb_build_object(
   'skin_id',v_skin,'pack_id',v_pack.id,'replayed',false);
end
$$;

-- COMPATIBILITÀ DURANTE IL DEPLOY:
-- NON revocare ancora mp_m1_claim(text): la versione pubblicata su
-- main la usa fino al merge; revocarla adesso bloccherebbe i riscatti.
-- DOPO il merge, eseguire MATCHPULSE_M1_POST_MERGE_SICUREZZA.sql.
-- ATTENZIONE: fino alla revoca gli utenti con JS vecchio possono usare
-- la vecchia RPC, quindi prima del merge non pubblicare obiettivi con
-- logiche di riscatto nuove.

revoke all on function public.mp_m1_founder_save_v2(jsonb)
 from public,anon,authenticated;
grant execute on function public.mp_m1_founder_save_v2(jsonb) to authenticated;

revoke all on function public.mp_m1_claim_rewards(text)
 from public,anon,authenticated;
grant execute on function public.mp_m1_claim_rewards(text) to authenticated;

revoke all on function public.mp_m1_open_reward_pack(uuid)
 from public,anon,authenticated;
grant execute on function public.mp_m1_open_reward_pack(uuid) to authenticated;

notify pgrst,'reload schema';
commit;

-- Verifica read-only:
-- select column_name from information_schema.columns
--   where table_name='matchpulse_m1_challenges'
--   and column_name in ('reward_config','goal_logic','goals_target','assists_target');
-- select proname from pg_proc where proname in
--   ('mp_m1_founder_save_v2','mp_m1_claim_rewards','mp_m1_open_reward_pack');
