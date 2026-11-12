/* MATCHPULSE M3 — BOOT STAGIONALE, PRIMA DI app.js
   Le modifiche avvengono SOLO dopo l'archiviazione in IndexedDB. */
(function () {
  'use strict';
  const ACTIVE = 'matchpulse_m3_active_season';
  const STORE = 'archives';
  const DB = 'matchpulse_m3_seasons';
  const RESET_KEYS = [
    'matchpulse.matches.v1',
    'matchpulse_card_evolution_v8_1',
    'matchpulse_card_stats',
    'matchpulse_playstyles_v1',
    'matchpulse_promo_cards_v1',
    'matchpulse_selected_card_v1',
    'matchpulse_ps_fixed_recommendations_v1',
    'matchpulse_ps_recommendations_ignored_v1'
  ];
  const currentSeason = () => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
      timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'
    }).formatToParts(new Date()).map(x=>[x.type,x.value]));
    const y=Number(p.year), start=Number(p.month)>=9?y:y-1;
    return `${start}-${start+1}`;
  };
  function openDB() {
    return new Promise((resolve,reject)=>{
      if(!('indexedDB' in window)) { reject(Error('IndexedDB non disponibile')); return; }
      const request=indexedDB.open(DB,1);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE,{keyPath:'season_id'});
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||Error('Apertura archivio non riuscita'));
    });
  }
  async function archivePut(snapshot) {
    const db=await openDB();
    try {
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readwrite');
        tx.objectStore(STORE).put(snapshot);
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error||Error('Archiviazione non riuscita'));
        tx.onabort=()=>reject(tx.error||Error('Archiviazione annullata'));
      });
    } finally {db.close();}
  }
  async function archiveAll() {
    const db=await openDB();
    try {
      return await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readonly');
        const req=tx.objectStore(STORE).getAll();
        req.onsuccess=()=>resolve(req.result||[]);
        req.onerror=()=>reject(req.error);
      });
    } finally {db.close();}
  }
  window.mpM3Boot={currentSeason,archiveAll,archivePut,resetKeys:[...RESET_KEYS],blocked:false,warning:''};
  async function rollover() {
    const next=currentSeason();
    const old=localStorage.getItem(ACTIVE);
    if(!old){
      // Prima installazione a stagione già avviata: preserva tutto.
      localStorage.setItem(ACTIVE,next);
      return;
    }
    if(old===next)return;
    if(!/^\d{4}-\d{4}$/.test(old))throw Error('Identificativo della stagione precedente non valido');
    const raw={};
    for(const key of RESET_KEYS) raw[key]=localStorage.getItem(key);
    // Backup aggiuntivo per le impostazioni PlayStyle che variano tra versioni.
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key && /^matchpulse_(?:ps_|playstyle)/i.test(key) && !(key in raw) &&
          !/photo|image|avatar/i.test(key)) raw[key]=localStorage.getItem(key);
    }
    const matches=JSON.parse(raw['matchpulse.matches.v1']||'[]');
    if(!Array.isArray(matches))throw Error('Lo storico partite non è valido: nessun dato è stato alterato');
    const snapshot={season_id:old,archived_at:new Date().toISOString(),data:raw,
      profile:JSON.parse(localStorage.getItem('matchpulse_player_profile')||'{}'),
      match_count:matches.length};
    // Salvataggio completo e verificato PRIMA di toccare lo stato attivo.
    await archivePut(snapshot);
    // Un secondo controllo di persistenza evita rollback parziali.
    const all=await archiveAll();
    if(!all.some(x=>x.season_id===old && x.match_count===matches.length))
      throw Error('Verifica archivio fallita');
    for(const key of Object.keys(raw))localStorage.removeItem(key);
    const base={pac:60,sho:60,pas:60,dri:60,def:60,phy:60};
    localStorage.setItem('matchpulse_card_stats',JSON.stringify(base));
    localStorage.setItem('matchpulse_card_evolution_v8_1',JSON.stringify({
      version:8,anchorOvr:60,anchorPoints:0,migratedMatchCount:0,
      migratedAt:new Date().toISOString(),anchorMatches:[],oldStats:base
    }));
    localStorage.setItem(ACTIVE,next);
  }
  async function loadScripts() {
    for (const url of [
      'app.js?v=20261112-m3',
      'matchpulse-m1.js?v=20261112-m3',
      'matchpulse-m2.js?v=20261112-m3',
      'matchpulse-m3.js?v=20261112-b3',
      'matchpulse-premium-r1.js?v=20261112-r1',
      'matchpulse-premium-b.js?v=20261112-b31'
    ]) {
      await new Promise((resolve,reject)=>{
        const s=document.createElement('script');s.src=url;s.async=false;
        s.onload=resolve;s.onerror=()=>reject(Error('File non caricato: '+url));
        document.body.appendChild(s);
      });
    }
  }
  (async()=>{
    try {await rollover();}
    catch(e){
      console.error('MATCHPULSE M3 - rollover annullato per sicurezza',e);
      window.mpM3Boot.blocked=true;
      window.mpM3Boot.warning=e?.message||'Archivio non disponibile';
    }
    try {await loadScripts();}
    catch(e){
      console.error('MATCHPULSE M3 - caricamento interrotto',e);
      const alert=document.createElement('div');
      alert.style.cssText='position:fixed;inset:auto 8px 90px;z-index:999999;padding:18px;background:#381623;border:1px solid #f99;color:white;border-radius:16px';
      alert.textContent='Errore caricamento MatchPulse: '+e.message;
      document.body.appendChild(alert);
    }
  })();
})();
