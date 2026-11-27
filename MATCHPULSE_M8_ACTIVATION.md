# M8 — piano di attivazione (non operativo)
Il progetto effettivamente configurato in app.js è `ekinjrmxpzqyzqdnudsj`. L'attuale connessione Supabase non autorizza quel progetto. Non eseguire SQL sul diverso progetto accessibile.
- Il file SQL è una proposta non verificata contro lo schema live, non una migrazione installata.
- Prima di installare: backup, inventario di colonne/indici/policy e definizioni RPC reali; verificare il lock wallet di acquisti, saldo Founder e premi. Verificare che il trigger ricompense M8 operi solo su claims server-autorizzati; impedire qualsiasi insert client.
- Titoli e targhette: proprietà permanente proposta, separata dall'inventario stagionale M2. Prezzi iniziali titoli proposti, inizialmente non in vendita; Founder può attivarli. Identity Pack disattivo all'installazione, probabilità 55/30/12/3, niente doppioni.
- UI successiva: separare anteprima Lab da equip reale; leggere mp_m8_state; acquisti idempotenti via mp_m8_buy; equip reali via mp_m8_equip; Founder catalogo/assegnazione/pacchetto; aggiungere premi in form e visualizzazione; chiamare mp_m8_founder_save_goal solo se backend disponibile; mantenere il vecchio flusso per backend precedente.
- Non incluso: pacchetto premio Identity tramite Sfide (richiede integrazione e test separati), traguardi automatici diversi dalle metriche già supportate, verifica iPhone e sincronizzazione effettiva.
- Installare/verificare anche la RPC M7.4 per probabilità dei pacchetti esistenti.
- Test: login founder e non-founder; blocco accesso non autorizzato; acquisti senza saldo e doppio tap; saldo esatto e proprietà atomica; pack esaurito senza addebito; equip di oggetto non posseduto negato; titolo + token e solo titolo; privacy fra Club; salvataggi partite invariati.
