-- MATCHPULSE: DA ESEGUIRE SOLO DOPO LA PUBBLICAZIONE DEL NUOVO M1.JS
-- e dopo aver verificato che mp_m1_claim_rewards(text) funzioni.
-- La vecchia RPC consente un riscatto solo-token e non conosce le
-- nuove regole Gol E/O Assist. La disattiviamo dopo il rilascio.
begin;
revoke all on function public.mp_m1_claim(text)
 from public, anon, authenticated;
notify pgrst, 'reload schema';
commit;

-- Per il futuro, i client devono usare
-- public.mp_m1_claim_rewards(p_challenge_id text).
