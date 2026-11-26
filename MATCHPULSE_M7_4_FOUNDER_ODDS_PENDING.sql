-- M7.4: Founder odds editor. PENDING installation and live-schema verification.
-- Basis points: 10000 = 100%. Existing relative rarity weights are unchanged until an authorized save.
begin;
create or replace function public.mp_m1_founder_set_pack_odds(
  p_pack_id text, p_common integer, p_rare integer, p_epic integer, p_legendary integer
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not coalesce(public.matchpulse_is_app_admin(), false) then
    raise exception 'Solo Founder autorizzato' using errcode = '42501';
  end if;
  if p_common is null or p_rare is null or p_epic is null or p_legendary is null
    or p_common not between 0 and 10000 or p_rare not between 0 and 10000
    or p_epic not between 0 and 10000 or p_legendary not between 0 and 10000
    or p_common + p_rare + p_epic + p_legendary <> 10000 then
    raise exception 'Le probabilita devono sommare al 100%%';
  end if;
  update public.matchpulse_m2_packs
  set common_weight = p_common, rare_weight = p_rare,
      epic_weight = p_epic, legendary_weight = p_legendary
  where id = p_pack_id;
  if not found then raise exception 'Pacchetto inesistente'; end if;
end;
$$;
revoke all on function public.mp_m1_founder_set_pack_odds(text,integer,integer,integer,integer) from public, anon, authenticated;
grant execute on function public.mp_m1_founder_set_pack_odds(text,integer,integer,integer,integer) to authenticated;
commit;
