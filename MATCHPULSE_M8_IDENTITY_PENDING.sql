-- MATCHPULSE M8 — PROPOSTA SQL NON INSTALLATA.
-- Verificare lo schema effettivo, i permessi, il lock condiviso con M2 e fare backup prima di eseguire.
-- Non eseguire sul progetto Supabase diverso da quello dell'app.
-- Nessun reset, nessun saldo modificato dall'installazione.
begin;
do $guard$
begin
 if to_regprocedure('public.matchpulse_is_app_admin()') is null
 or to_regprocedure('public.mp_m1_founder_save_v2(jsonb)') is null
 or to_regprocedure('public.mp_m1_claim_rewards(text)') is null
 or to_regclass('public.matchpulse_m1_wallet_ledger') is null
 or to_regclass('public.matchpulse_m1_claims') is null
 or to_regclass('public.matchpulse_club_members') is null then
   raise exception 'Prerequisiti M1/M2/Club non verificati';
 end if;
end;
$guard$;
create table if not exists public.matchpulse_m8_catalog (
 id text primary key check(id ~ '^(plate|title)_[a-z0-9_]{1,60}$'),
 kind text not null check(kind in ('plate','title')),
 title text not null check(char_length(btrim(title)) between 1 and 42),
 rarity text not null check(rarity in ('common','rare','epic','legendary')),
 price integer not null check(price between 0 and 50000),
 shop_active boolean not null default false,
 sort_order integer not null default 500,
 check(id like kind||'\_%' escape '\')
);
create table if not exists public.matchpulse_m8_owned (
 user_id uuid not null references auth.users(id) on delete cascade,
 item_id text not null references public.matchpulse_m8_catalog(id),
 source text not null check(source in ('direct','pack','reward','founder')),
 created_at timestamptz not null default now(),
 primary key(user_id,item_id)
);
create table if not exists public.matchpulse_m8_equipped (
 user_id uuid primary key references auth.users(id) on delete cascade,
 plate_id text,
 title_id text,
 foreign key(user_id,plate_id) references public.matchpulse_m8_owned(user_id,item_id),
 foreign key(user_id,title_id) references public.matchpulse_m8_owned(user_id,item_id),
 check(plate_id is null or plate_id like 'plate\_%' escape '\'),
 check(title_id is null or title_id like 'title\_%' escape '\')
);
create table if not exists public.matchpulse_m8_identity_pack (
 id text primary key check(id='identity_pack'),
 price integer not null check(price between 0 and 50000),
 active boolean not null default false,
 common_weight integer not null check(common_weight between 0 and 10000),
 rare_weight integer not null check(rare_weight between 0 and 10000),
 epic_weight integer not null check(epic_weight between 0 and 10000),
 legendary_weight integer not null check(legendary_weight between 0 and 10000),
 check(common_weight+rare_weight+epic_weight+legendary_weight=10000)
);
create table if not exists public.matchpulse_m8_orders (
 user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null,
 product_id text not null,
 item_id text not null references public.matchpulse_m8_catalog(id),
 season_id text not null,
 price integer not null check(price>=0),
 created_at timestamptz not null default now(),
 primary key(user_id,request_id)
);
alter table public.matchpulse_m8_catalog enable row level security;
alter table public.matchpulse_m8_owned enable row level security;
alter table public.matchpulse_m8_equipped enable row level security;
alter table public.matchpulse_m8_identity_pack enable row level security;
alter table public.matchpulse_m8_orders enable row level security;
revoke all on public.matchpulse_m8_catalog,public.matchpulse_m8_owned,public.matchpulse_m8_equipped,public.matchpulse_m8_identity_pack,public.matchpulse_m8_orders from public,anon,authenticated;
insert into public.matchpulse_m8_catalog(id,kind,title,rarity,price,shop_active,sort_order) values
('plate_classic','plate','Classic','common',30,true,1),
('plate_green','plate','Green Crest','common',30,true,2),
('plate_storm','plate','Storm Line','common',30,true,3),
('plate_violet','plate','Violet Edge','rare',60,true,4),
('plate_sakura','plate','Sakura Bloom','rare',60,true,5),
('plate_thunder','plate','Thunderbolt','rare',60,true,6),
('plate_grandline','plate','Grand Line','epic',110,true,7),
('plate_saiyan','plate','Saiyan Power','epic',110,true,8),
('plate_nightcity','plate','Night City','epic',110,true,9),
('plate_hyperdrive','plate','Hyperdrive','legendary',200,true,10),
('plate_divine','plate','Divine Crown','legendary',200,true,11),
('plate_cosmic','plate','Cosmic Infinity','legendary',200,true,12),
('title_1','title','Il Debuttante','common',25,false,101),
('title_2','title','Il Combattente','common',25,false,102),
('title_3','title','Il Cecchino','common',25,false,103),
('title_4','title','Il Generoso','common',25,false,104),
('title_5','title','Il Veterano','common',25,false,105),
('title_6','title','Il Bomber','rare',60,false,106),
('title_7','title','Il Regista','rare',60,false,107),
('title_8','title','Il Muro','rare',60,false,108),
('title_9','title','L''Instancabile','rare',60,false,109),
('title_10','title','Il Vincente','rare',60,false,110),
('title_11','title','Re del Gol','epic',110,false,111),
('title_12','title','Maestro del Gioco','epic',110,false,112),
('title_13','title','L''Inarrestabile','epic',110,false,113),
('title_14','title','L''Uomo della Provvidenza','epic',110,false,114),
('title_15','title','Il Fenomeno','epic',110,false,115),
('title_16','title','Il Centurione','legendary',200,false,116),
('title_17','title','Il Re','legendary',200,false,117),
('title_18','title','L''Architetto','legendary',200,false,118),
('title_19','title','Leggenda Vivente','legendary',200,false,119),
('title_20','title','L''Immortale','legendary',200,false,120)
on conflict(id) do nothing;
insert into public.matchpulse_m8_identity_pack values('identity_pack',65,false,5500,3000,1200,300) on conflict(id) do nothing;

create or replace function public.mp_m8_state()
returns jsonb language plpgsql security definer set search_path=''
as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'Accesso richiesto'; end if;
 return jsonb_build_object(
 'catalog',coalesce((select jsonb_agg(to_jsonb(c) order by c.sort_order,c.title) from public.matchpulse_m8_catalog c),'[]'::jsonb),
 'owned',coalesce((select jsonb_agg(o.item_id) from public.matchpulse_m8_owned o where o.user_id=u),'[]'::jsonb),
 'equipped',coalesce((select to_jsonb(e)-'user_id' from public.matchpulse_m8_equipped e where e.user_id=u),'{}'::jsonb),
 'club_equipped',coalesce((select jsonb_agg(to_jsonb(e)) from public.matchpulse_m8_equipped e where e.user_id=u or exists(
 select 1 from public.matchpulse_club_members mine join public.matchpulse_club_members other on other.club_id=mine.club_id
 where mine.user_id=u and other.user_id=e.user_id)),'[]'::jsonb),
 'pack',(select to_jsonb(p) from public.matchpulse_m8_identity_pack p where p.id='identity_pack'),
 'admin',coalesce(public.matchpulse_is_app_admin(),false)
 );
end;$$;

create or replace function public.mp_m8_equip(p_plate text,p_title text)
returns void language plpgsql security definer set search_path=''
as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'Accesso richiesto'; end if;
 if p_plate is not null and not exists(select 1 from public.matchpulse_m8_owned o join public.matchpulse_m8_catalog c on c.id=o.item_id where o.user_id=u and c.id=p_plate and c.kind='plate') then raise exception 'Targhetta non posseduta'; end if;
 if p_title is not null and not exists(select 1 from public.matchpulse_m8_owned o join public.matchpulse_m8_catalog c on c.id=o.item_id where o.user_id=u and c.id=p_title and c.kind='title') then raise exception 'Titolo non posseduto'; end if;
 insert into public.matchpulse_m8_equipped(user_id,plate_id,title_id) values(u,p_plate,p_title)
 on conflict(user_id) do update set plate_id=excluded.plate_id,title_id=excluded.title_id;
end;$$;

create or replace function public.mp_m8_founder_item(p_id text,p_title text,p_rarity text,p_price integer,p_active boolean)
returns text language plpgsql security definer set search_path=''
as $$
declare v_id text:=p_id;
begin
 if auth.uid() is null or not coalesce(public.matchpulse_is_app_admin(),false) then raise exception 'Solo Founder'; end if;
 if v_id is null then
   v_id:='title_'||replace(gen_random_uuid()::text,'-','');
   insert into public.matchpulse_m8_catalog(id,kind,title,rarity,price,shop_active) values(v_id,'title',btrim(p_title),p_rarity,p_price,p_active);
 else
   update public.matchpulse_m8_catalog set title=case when kind='title' then btrim(p_title) else title end,rarity=p_rarity,price=p_price,shop_active=p_active where id=v_id;
   if not found then raise exception 'Cosmetico non trovato'; end if;
 end if;
 return v_id;
end;$$;

create or replace function public.mp_m8_founder_grant(p_user uuid,p_item text)
returns void language plpgsql security definer set search_path=''
as $$
begin
 if auth.uid() is null or not coalesce(public.matchpulse_is_app_admin(),false) then raise exception 'Solo Founder'; end if;
 if p_user is null or (p_user<>auth.uid() and not exists(select 1 from public.matchpulse_club_members a join public.matchpulse_club_members b on b.club_id=a.club_id where a.user_id=auth.uid() and b.user_id=p_user)) then raise exception 'Giocatore non appartenente al Club'; end if;
 insert into public.matchpulse_m8_owned(user_id,item_id,source) values(p_user,p_item,'founder') on conflict do nothing;
end;$$;

create or replace function public.mp_m8_founder_pack(p_price integer,p_active boolean,p_common integer,p_rare integer,p_epic integer,p_legendary integer)
returns void language plpgsql security definer set search_path=''
as $$
begin
 if auth.uid() is null or not coalesce(public.matchpulse_is_app_admin(),false) then raise exception 'Solo Founder'; end if;
 update public.matchpulse_m8_identity_pack set price=p_price,active=p_active,common_weight=p_common,rare_weight=p_rare,epic_weight=p_epic,legendary_weight=p_legendary where id='identity_pack';
end;$$;

-- Confermare sul database reale che ogni operazione M1/M2 sul wallet usa
-- lo stesso advisory lock prima di abilitare l'acquisto.
create or replace function public.mp_m8_buy(p_product text,p_request uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare u uuid:=auth.uid(); y integer; season text; cost integer; picked text; tier text; old public.matchpulse_m8_orders%rowtype; pack public.matchpulse_m8_identity_pack%rowtype;
begin
 if u is null or p_request is null then raise exception 'Accesso e richiesta validi obbligatori'; end if;
 y:=extract(year from (now() at time zone 'Europe/Rome'))::int-case when extract(month from (now() at time zone 'Europe/Rome'))<9 then 1 else 0 end;
 season:=y::text||'-'||(y+1)::text;
 perform pg_catalog.pg_advisory_xact_lock(hashtext(u::text),hashtext(season));
 select * into old from public.matchpulse_m8_orders where user_id=u and request_id=p_request;
 if found then
   if old.product_id<>p_product then raise exception 'Richiesta già usata per altro prodotto'; end if;
   return jsonb_build_object('item_id',old.item_id,'price',old.price,'replayed',true);
 end if;
 if p_product='identity_pack' then
   select * into pack from public.matchpulse_m8_identity_pack where id='identity_pack' and active=true for share;
   if not found then raise exception 'Pacchetto non disponibile'; end if;
   cost:=pack.price;
   select w.rarity into tier from (values('common',pack.common_weight),('rare',pack.rare_weight),('epic',pack.epic_weight),('legendary',pack.legendary_weight)) w(rarity,weight)
   where w.weight>0 and exists(select 1 from public.matchpulse_m8_catalog c where c.kind='plate' and c.shop_active and c.rarity=w.rarity and not exists(select 1 from public.matchpulse_m8_owned o where o.user_id=u and o.item_id=c.id))
   order by -ln(greatest(random(),0.000000001))/nullif(w.weight,0) limit 1;
   select c.id into picked from public.matchpulse_m8_catalog c where c.kind='plate' and c.shop_active and c.rarity=tier and not exists(select 1 from public.matchpulse_m8_owned o where o.user_id=u and o.item_id=c.id) order by random() limit 1;
   if picked is null then raise exception 'Nessuna targhetta nuova disponibile'; end if;
 else
   select c.id,c.price into picked,cost from public.matchpulse_m8_catalog c where c.id=p_product and c.shop_active for share;
   if not found then raise exception 'Prodotto non disponibile'; end if;
 end if;
 if coalesce((select sum(amount) from public.matchpulse_m1_wallet_ledger where user_id=u and season_id=season),0)<cost then raise exception 'Token insufficienti'; end if;
 insert into public.matchpulse_m8_owned(user_id,item_id,source) values(u,picked,case when p_product='identity_pack' then 'pack' else 'direct' end) on conflict do nothing;
 if not found then raise exception 'Cosmetico già posseduto'; end if;
 if cost>0 then insert into public.matchpulse_m1_wallet_ledger(user_id,season_id,source_key,amount) values(u,season,'m8:'||p_request::text,-cost); end if;
 insert into public.matchpulse_m8_orders(user_id,request_id,product_id,item_id,season_id,price) values(u,p_request,p_product,picked,season,cost);
 return jsonb_build_object('item_id',picked,'price',cost,'replayed',false);
end;$$;

-- Ricompense aggiunte senza riscrivere il motore di progressione delle sfide.
create or replace function public.mp_m8_founder_save_goal(p_goal jsonb)
returns text language plpgsql security definer set search_path=''
as $$
declare r jsonb:=coalesce(p_goal->'reward_config','{}'::jsonb); t text:=nullif(r->>'title_id',''); p text:=nullif(r->>'plate_id',''); tokens integer; v_id text; adjusted jsonb;
begin
 if auth.uid() is null or not coalesce(public.matchpulse_is_app_admin(),false) then raise exception 'Solo Founder'; end if;
 if t is not null and not exists(select 1 from public.matchpulse_m8_catalog where id=t and kind='title') then raise exception 'Titolo premio non valido'; end if;
 if p is not null and not exists(select 1 from public.matchpulse_m8_catalog where id=p and kind='plate') then raise exception 'Targhetta premio non valida'; end if;
 tokens:=coalesce((r->>'tokens')::integer,0);
 if tokens<0 or tokens>2000 then raise exception 'Token non validi'; end if;
 adjusted:=r;
 if (t is not null or p is not null) and tokens=0 and coalesce(r->>'pack_id','')='' and coalesce(r->>'skin_id','')='' and coalesce(r->>'emblem_id','')='' then adjusted:=r||jsonb_build_object('tokens',1); end if;
 v_id:=public.mp_m1_founder_save_v2(p_goal||jsonb_build_object('reward_config',adjusted));
 update public.matchpulse_m1_challenges set reward_config=reward_config||jsonb_build_object('tokens',tokens,'title_id',t,'plate_id',p) where id=v_id;
 return v_id;
end;$$;
create or replace function public.mp_m8_reward_after_claim()
returns trigger language plpgsql security definer set search_path=''
as $$
declare r jsonb;
begin
 select reward_config into r from public.matchpulse_m1_challenges where id=new.challenge_id;
 insert into public.matchpulse_m8_owned(user_id,item_id,source)
 select new.user_id,c.id,'reward' from public.matchpulse_m8_catalog c
 where (c.kind='title' and c.id=r->>'title_id') or (c.kind='plate' and c.id=r->>'plate_id')
 on conflict do nothing;
 return new;
end;$$;
drop trigger if exists mp_m8_claim_reward on public.matchpulse_m1_claims;
create trigger mp_m8_claim_reward after insert on public.matchpulse_m1_claims for each row execute function public.mp_m8_reward_after_claim();

revoke all on function public.mp_m8_state() from public,anon,authenticated;
grant execute on function public.mp_m8_state() to authenticated;
revoke all on function public.mp_m8_equip(text,text) from public,anon,authenticated;
grant execute on function public.mp_m8_equip(text,text) to authenticated;
revoke all on function public.mp_m8_founder_item(text,text,text,integer,boolean) from public,anon,authenticated;
grant execute on function public.mp_m8_founder_item(text,text,text,integer,boolean) to authenticated;
revoke all on function public.mp_m8_founder_grant(uuid,text) from public,anon,authenticated;
grant execute on function public.mp_m8_founder_grant(uuid,text) to authenticated;
revoke all on function public.mp_m8_founder_pack(integer,boolean,integer,integer,integer,integer) from public,anon,authenticated;
grant execute on function public.mp_m8_founder_pack(integer,boolean,integer,integer,integer,integer) to authenticated;
revoke all on function public.mp_m8_buy(text,uuid) from public,anon,authenticated;
grant execute on function public.mp_m8_buy(text,uuid) to authenticated;
revoke all on function public.mp_m8_founder_save_goal(jsonb) from public,anon,authenticated;
grant execute on function public.mp_m8_founder_save_goal(jsonb) to authenticated;
revoke all on function public.mp_m8_reward_after_claim() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
