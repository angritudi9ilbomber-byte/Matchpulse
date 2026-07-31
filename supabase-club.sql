/* =========================================================
   MATCHPULSE
   IL FONDATORE PUÒ RIMUOVERE I MEMBRI
   ========================================================= */

create or replace function public.kick_matchpulse_member(
  p_club_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Utente non autenticato';
  end if;

  select owner_id
  into v_owner_id
  from public.matchpulse_clubs
  where id = p_club_id;

  if v_owner_id is null then
    raise exception 'Club non trovato';
  end if;

  if v_owner_id <> auth.uid() then
    raise exception 'Solo il fondatore può rimuovere i membri';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Il fondatore non può rimuovere se stesso';
  end if;

  delete from public.matchpulse_club_members
  where club_id = p_club_id
    and user_id = p_user_id;

  if not found then
    raise exception 'Membro non trovato nel Club';
  end if;
end;
$$;

revoke all
on function public.kick_matchpulse_member(uuid, uuid)
from public, anon;

grant execute
on function public.kick_matchpulse_member(uuid, uuid)
to authenticated;

notify pgrst, 'reload schema';