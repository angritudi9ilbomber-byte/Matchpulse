# M8 — attivazione 27/11/2026
- Database corretto verificato. Migrazioni M8 e M7.4 applicate; 12 targhette e 20 titoli, Identity Pack attivo a 65 token (55/30/12/3). Titoli iniziali non in vendita: Founder può attivarli o assegnarli.
- Acquisti e premi server, proprietà permanente, equip indipendente e visualizzazione Club. Modalità Lab separata, non scrive inventario o saldo.
- Verifiche SQL con rollback: acquisto diretto, pack, retry idempotente, saldo insufficiente, equip non posseduto, premi a zero token, bonus gratuito, non-Founder e decimali vecchi pack. Nessun dato di prova persistito. Restano da verificare UI reale su iPhone e deploy Pages.
- I file *_PENDING.sql sono proposte storiche, NON eseguirli: migrazioni live includono modifiche aggiuntive per bonus Identity e lock wallet.
