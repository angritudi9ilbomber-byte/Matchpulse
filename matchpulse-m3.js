/* =====================================================================
   MATCHPULSE ULTIMATE TEAM — MACROBLOCCO 3
   Skin illustrate • Grafica premium • Stagioni e archivio
   Si aggiunge dopo M1 e M2. Non modifica app.js né il motore V8.
   ===================================================================== */
(function(){
  'use strict';
  if(window.MP_M3_READY)return;
  const BOOT=window.mpM3Boot;
  const MAIN=document.querySelector('#app');
  const SEASON=BOOT?.currentSeason?.() || '';
  const SKIN_TABLE='matchpulse_m2_skins';
  const EQUIPPED_TABLE='matchpulse_m2_equipped';
  const ARCHIVE_TABLE='matchpulse_m3_season_archives';
  const SKIN_IDS = {
    'op_straw':['onepiece','op-straw'], 'op_nakama':['onepiece','op-nakama'],
    'op_gear':['onepiece','op-gear'], 'db_kame':['dragonball','db-kame'],
    'db_saiyan':['dragonball','db-saiyan'], 'db_ultra':['dragonball','db-ultra'],
    'cp_night':['cyberpunk','cp-night'], 'cp_edge':['cyberpunk','cp-edge'],
    'cp_samurai':['cyberpunk','cp-samurai'], 'f1_grid':['formula1','f1-grid'],
    'f1_pole':['formula1','f1-pole'], 'f1_champ':['formula1','f1-champ']
  };
  const S={selected:null, archives:[], loading:false, error:'',
    clubSkinByUser:new Map(), catalog:new Map(), lastClubLoad:0, clubLoading:null,
    lastRefresh:0, refreshPromise:null, visibleRoute:null, selectedClubMember:null, uploadedSeasons:new Set()};
  const escape=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const db=()=>typeof matchpulseSupabase!=='undefined'?matchpulseSupabase:null;
  const readJSON=(raw,fallback)=>{try{return JSON.parse(raw??'null')??fallback;}catch{return fallback;}};
  const stat=(n)=>Number.isFinite(Number(n))?Number(n):0;
  const prettyDate = value => value?new Date(value).toLocaleDateString('it-IT',{day:'2-digit',month:'short',year:'numeric'}):'—';
  const meta = id => {
    const local=SKIN_IDS[id];const s=S.catalog.get(id);
    return local?{id,theme:local[0],css_theme:local[1],title:s?.title||local[1]}:null;
  };
  function applySkin(el,skinId){
    if(!el || el.closest('.mp-promo-card, [data-promo-card="true"], .mp-m2-product, .mp-promo-v3-card'))return;
    const skin=meta(skinId);
    if(!skin){
      if(el.hasAttribute('data-m3-skin')){
        el.removeAttribute('data-m3-skin');el.removeAttribute('data-m3-theme');
        el.classList.remove('mp-m3-art-card');
      }
      return;
    }
    if(el.dataset.m3Skin===skin.css_theme)return;
    el.dataset.m3Skin=skin.css_theme;
    el.dataset.m3Theme=skin.theme;
    el.classList.add('mp-m3-art-card');
  }
  function applyOwnSkins(){
    // M2 sceglie già la skin SOLO sulle carte base, non sulle promo.
    document.querySelectorAll('.player-card.mp-m2-card-equipped[data-m2-skin]').forEach(card=>{
      const skinId=Object.keys(SKIN_IDS).find(x=>SKIN_IDS[x][1]===card.dataset.m2Skin);
      applySkin(card,skinId);
    });
    document.querySelectorAll('.player-card.mp-m3-art-card:not(.mp-m2-card-equipped)').forEach(card=>{
      if(!card.closest('.mp-club-page, #mpClubMemberModal'))applySkin(card,null);
    });
  }
  function memberIdOf(el){
    const found=String(el.getAttribute('onclick')||'').match(/mpOpenClubMember\(\s*['"]([a-f0-9-]{36})['"]/i);
    return found?.[1]||null;
  }
  function memberIsPromo(userId){
    const members=typeof MP_CLUB_MEMBERS_CACHE!=='undefined' ? MP_CLUB_MEMBERS_CACHE : [];
    return Array.isArray(members) && members.some(m=>m?.user_id===userId && m?.card_stats?.promoCard===true);
  }
  function applyClubSkins(){
    if(!S.clubSkinByUser.size)return;
    const candidates=document.querySelectorAll('.mp-club-showcase-card,.mp-club-member-card,.mp-club-home-card');
    candidates.forEach(el=>{
      const uid=el.dataset.m3UserId||memberIdOf(el);
      if(uid && !memberIsPromo(uid))applySkin(el,S.clubSkinByUser.get(uid));
    });
    const modal=document.getElementById('mpClubMemberModal');
    if(modal){
      const userId=modal.dataset.mpSharedUser || S.selectedClubMember ||
        (typeof MP_CLUB_SELECTED_MEMBER!=='undefined' ? MP_CLUB_SELECTED_MEMBER?.user_id : null);
      if(userId && !memberIsPromo(userId))modal.querySelectorAll('.player-card, .mp-club-profile-card-base-home, .mp-club-showcase-card').forEach(el=>
        applySkin(el,S.clubSkinByUser.get(userId)));
    }
  }
  function mountSeasonRibbon(){
    if(route!=='home')return;
    const home=MAIN.querySelector('.premium-home, .mp-m1-home');
    if(!home || home.querySelector('.mp-m3-season-ribbon'))return;
    home.insertAdjacentHTML('afterbegin',`<div class="mp-m3-season-ribbon">
      <span class="mp-m3-ribbon-emblem">✦</span>
      <div><small>STAGIONE ATTIVA</small><strong>${escape(SEASON)}</strong><span>Nuova stagione dal 1° settembre · Ripartenza dal Bronzo</span></div>
      <button type="button" onclick="setRoute('seasons')">ARCHIVIO STAGIONI <span aria-hidden="true">→</span></button>
    </div>`);
  }
  function addSeasonsLinks(){
    if(route==='home')mountSeasonRibbon();
    if(['stats','history'].includes(route)){
      const area=MAIN.querySelector('.section, .mp-m1-page, .stats-page, .history-page') || MAIN;
      if(area && !area.querySelector('.mp-m3-archive-shortcut'))
        area.insertAdjacentHTML('beforeend','<div class="mp-m3-archive-shortcut"><strong>Stagioni precedenti</strong><span>Consulta gli storici archiviati senza modificare la carriera attuale.</span><button type="button" onclick="setRoute(\'seasons\')">Apri archivio →</button></div>');
    }
  }
  function scheduleDecorate(){
    if(scheduleDecorate.queued)return;
    scheduleDecorate.queued=true;
    requestAnimationFrame(()=>{
      scheduleDecorate.queued=false;
      if(!MAIN || !MAIN.isConnected)return;
      addSeasonsLinks();applyOwnSkins();applyClubSkins();
      if(route==='locker')void loadClubSkins();
      if(BOOT?.blocked)showSafetyWarning();
    });
  }
  function showSafetyWarning(){
    if(document.getElementById('mpM3SafetyWarning'))return;
    const note=document.createElement('div');note.id='mpM3SafetyWarning';
    note.className='mp-m3-safety-banner';
    note.textContent=`Archivio stagionale sospeso per sicurezza: ${BOOT.warning}. Le partite originali non sono state cancellate. Esporta un backup e controlla l'archiviazione prima di continuare.`;
    document.body.appendChild(note);
  }
  async function loadClubSkins(force=false){
    if(!db()||typeof mpGetMyClub!=='function')return;
    if(S.clubLoading)return S.clubLoading;
    if(!force && Date.now()-S.lastClubLoad<45000)return;
    S.clubLoading=(async()=>{
      try{
        const club=await mpGetMyClub();
        if(!club?.club_id){S.clubSkinByUser.clear();S.lastClubLoad=Date.now();return;}
        const members=typeof MP_CLUB_MEMBERS_CACHE!=='undefined' ? MP_CLUB_MEMBERS_CACHE : [];
        if(!Array.isArray(members)||!members.length)return;
        const ids=[...new Set(members.map(m=>m.user_id).filter(Boolean))];
        const {data,error}=await db().from(EQUIPPED_TABLE)
          .select('user_id,season_id,skin_id').eq('season_id',SEASON).in('user_id',ids);
        if(error)throw error;
        S.clubSkinByUser=new Map((data||[]).map(row=>[row.user_id,row.skin_id]));
        S.lastClubLoad=Date.now();applyClubSkins();
      }catch(e){
        console.warn('M3: Skin dei membri del Club non disponibili',e?.message||e);
        S.lastClubLoad=Date.now()-20000;
      }finally{S.clubLoading=null;}
    })();
    return S.clubLoading;
  }
  async function loadCatalogue(){
    if(!db())return;
    try{
      const {data,error}=await db().from(SKIN_TABLE).select('id,title,theme,css_theme').eq('active',true);
      if(error)throw error;
      S.catalog=new Map((data||[]).map(x=>[x.id,x]));
    }catch(e){console.warn('M3: catalogo skin temporaneamente non disponibile',e?.message||e);}
  }
  async function archivesWithCloud(){
    let local=[];
    try {local=BOOT?.archiveAll ? await BOOT.archiveAll() : [];}
    catch(e){
      S.error='Archivio del dispositivo non accessibile. Verifica le impostazioni del browser.';
      console.warn('M3 Archivio locale:',e?.message||e);
    }
    const bySeason=new Map(local.map(x=>[x.season_id,x]));
    if(db()&&typeof mpEnsureClubAuth==='function'){
      try{
        const user=await mpEnsureClubAuth();
        if(!user?.id)throw Error('Utente non trovato');
        for(const item of local){
          if(S.uploadedSeasons.has(item.season_id))continue;
          try {
            const row={user_id:user.id, season_id:item.season_id,
              archived_at:item.archived_at,match_count:item.match_count,
              profile:item.profile||{},snapshot:item.data||{}};
            const {error}=await db().from(ARCHIVE_TABLE).upsert(row,{onConflict:'user_id,season_id'});
            if(error)throw error;
            S.uploadedSeasons.add(item.season_id);
          }catch(e){
            S.error='Sincronizzazione cloud parziale: la copia locale non è stata cancellata.';
            console.warn('M3 archivio: caricamento cloud non riuscito',e?.message||e);
          }
        }
        const {data,error}=await db().from(ARCHIVE_TABLE)
          .select('season_id,archived_at,match_count,profile,snapshot')
          .eq('user_id',user.id).order('season_id',{ascending:false});
        if(error)throw error;
        for(const row of (data||[])){
          if(!bySeason.has(row.season_id))bySeason.set(row.season_id,{
            season_id:row.season_id,archived_at:row.archived_at,match_count:row.match_count,
            profile:row.profile||{},data:row.snapshot||{}
          });
        }
      }catch(e){
        S.error='Archivio cloud non disponibile: le copie locali sono comunque consultabili.';
        console.warn('M3 Archivio cloud:',e?.message||e);
      }
    }
    return [...bySeason.values()].sort((a,b)=>b.season_id.localeCompare(a.season_id));
  }
  function archiveData(item){
    const matches=readJSON(item?.data?.['matchpulse.matches.v1'],[]);
    const v8=readJSON(item?.data?.matchpulse_card_evolution_v8_1,{});
    const stats=readJSON(item?.data?.matchpulse_card_stats,{});
    const promos=readJSON(item?.data?.matchpulse_promo_cards_v1,[]);
    const list=Array.isArray(matches)?matches:[];
    return {list,v8,stats,promos:Array.isArray(promos)?promos:[],
      goals:list.reduce((v,m)=>v+stat(m.goals),0),
      assists:list.reduce((v,m)=>v+stat(m.assists),0),
      wins:list.filter(m=>m.outcome==='Vittoria').length};
  }
  function seasonCard(item){
    const data=archiveData(item);
    const ovr=Number(data.v8?.lastOvr||data.v8?.anchorOvr || NaN);
    return `<button type="button" class="mp-m3-season-card" onclick="mpM3Select('${escape(item.season_id)}')">
      <span class="mp-m3-season-mark">✦</span>
      <div><small>STAGIONE ARCHIVIATA</small><h3>${escape(item.season_id)}</h3><p>Conclusa · ${escape(prettyDate(item.archived_at))}</p></div>
      <div class="mp-m3-season-stats"><strong>${data.list.length}</strong><span>PARTITE</span><strong>${Number.isFinite(ovr)?Math.round(ovr):'—'}</strong><span>OVR*</span></div>
      <span class="mp-m3-open">→</span>
    </button>`;
  }
  function archiveDetail(item){
    const data=archiveData(item);
    const matches=[...data.list].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    return `<div class="mp-m3-detail-head"><button onclick="mpM3Select('')">← TUTTE LE STAGIONI</button><button onclick="mpM3Export('${escape(item.season_id)}')">ESPORTA ARCHIVIO JSON ↓</button></div>
    <div class="mp-m3-season-summary"><div><small>STAGIONE</small><strong>${escape(item.season_id)}</strong></div>
    <div><small>PARTITE</small><strong>${matches.length}</strong></div>
    <div><small>VITTORIE</small><strong>${data.wins}</strong></div>
    <div><small>GOL</small><strong>${data.goals}</strong></div>
    <div><small>ASSIST</small><strong>${data.assists}</strong></div>
    <div><small>PROMO</small><strong>${data.promos.length}</strong></div></div>
    <p class="mp-m3-archive-note">Solo lettura: questa stagione è congelata. *L'OVR riportato nell'elenco è il riferimento salvato dal V8, non un ricalcolo della classifica finale.</p>
    <h3 class="mp-m3-match-heading">STORICO PARTITE ARCHIVIATO</h3>
    <div class="mp-m3-matches">${matches.length?matches.map(m=>`<article class="mp-m3-match">
      <div><small>${escape(m.date||'Senza data')}</small><strong>${escape(m.result||m.outcome||'Partita')}</strong></div>
      <div class="mp-m3-match-values"><span>${escape(m.outcome||'—')}</span><b>${stat(m.goals)} G</b><b>${stat(m.assists)} A</b><b>${escape(m.rating||'—')} V</b></div>
    </article>`).join(''):'<div class="mp-m3-empty">Nessuna partita archiviata in questa stagione.</div>'}</div>`;
  }
  async function renderSeasons(){
    if(route!=='seasons')return;
    const token={};S.visibleRoute=token;S.error='';
    MAIN.innerHTML='<section class="mp-m3-page"><div class="mp-m3-loading">Caricamento dell’archivio stagionale…</div></section>';
    try{S.archives=await archivesWithCloud();}catch(e){S.error=e?.message||'Archivio non disponibile';S.archives=[];}
    if(route!=='seasons'||S.visibleRoute!==token)return;
    const choice=S.archives.find(x=>x.season_id===S.selected);
    const now=Array.isArray(getMatches())?getMatches():[];
    MAIN.innerHTML=`<section class="mp-m3-page">
      <header class="mp-m3-hero"><div><p>ULTIMATE TEAM / HALL OF FAME</p><h2>LE TUE <em>STAGIONI</em></h2><span>Ogni stagione ha una storia. Nessuna viene dimenticata.</span></div>
      <div class="mp-m3-hero-badge"><small>STAGIONE ${escape(SEASON)}</small><strong>IN CORSO</strong><span>Ripartenza annuale · 1 settembre</span></div></header>
      ${S.error?`<div class="mp-m3-alert">${escape(S.error)}</div>`:''}
      <div class="mp-m3-current"><div><small>STAGIONE ATTUALE</small><h3>${escape(SEASON)}</h3><p>${now.length} partite registrate. Skin e token validi per la stagione corrente.</p></div>
      <button type="button" onclick="setRoute('home')">TORNA ALLA HOME →</button></div>
      <div class="mp-m3-section-heading"><span>ARCHIVIO STAGIONALE</span><strong>${S.archives.length} STAGIONI SALVATE</strong></div>
      ${choice?archiveDetail(choice):
        (S.archives.length?`<div class="mp-m3-season-grid">${S.archives.map(seasonCard).join('')}</div>`:
          '<div class="mp-m3-empty"><strong>Nessuna stagione precedente ancora conclusa.</strong><p>Alla prima ripartenza stagionale, il sistema archivierà automaticamente le partite e i progressi del periodo precedente.</p></div>')}
      <div class="mp-m3-rules"><h3>COME FUNZIONANO LE STAGIONI</h3>
      <p>Il 1° settembre, quando apri MatchPulse, la stagione terminata viene archiviata e la carriera riparte dalla carta Bronzo (60 OVR). Le partite, le statistiche e le promo precedenti sono consultabili nell'archivio. I token e le skin non passano alla nuova stagione: il Negozio e le Sfide usano già saldi e inventari distinti per stagione.</p>
      <p>Il nome, la foto e la membership del Club rimangono. Le vecchie prestazioni non vengono cancellate: l'archivio è prima salvato sul dispositivo e poi sincronizzato con Supabase quando disponibile.</p></div>
    </section>`;
  }
  window.mpM3Select = season => {S.selected=season||null;void renderSeasons();};
  window.mpM3Export = season => {
    const item=S.archives.find(x=>x.season_id===season);
    if(!item)return;
    const content=JSON.stringify({app:'MatchPulse',format:'M3-season-archive-v1',...item},null,2);
    const blob=new Blob([content],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=url;link.download=`MatchPulse_Stagione_${season}.json`;
    document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2500);
  };
  // Il router M2 viene rispettato; si aggiunge solamente la pagina Stagioni.
  const previousRender=render;
  render=function(...args){
    if(route==='seasons'){void renderSeasons();return;}
    const result=previousRender.apply(this,args);
    scheduleDecorate();
    return result;
  };
  window.render=render;
  const previousHome=renderHome;
  renderHome=function(...args){
    const result=previousHome.apply(this,args);
    scheduleDecorate();
    return result;
  };
  window.renderHome=renderHome;
  // Se la skin è cambiata, ricarica sia le carte personali sia le skin club.
  if(typeof window.mpM2Equip==='function'){
    const oldEquip=window.mpM2Equip;
    window.mpM2Equip=async function(...args){
      const result=await oldEquip.apply(this,args);
      S.lastClubLoad=0;
      await loadClubSkins(true);
      scheduleDecorate();
      return result;
    };
  }
  // Ricorda il profilo aperto, così la skin del membro appare anche nel modal.
  if(typeof window.mpOpenClubMember==='function'){
    const oldOpen=window.mpOpenClubMember;
    window.mpOpenClubMember=function(userId,...args){
      S.selectedClubMember=String(userId||'');
      const result=oldOpen.apply(this,[userId,...args]);
      scheduleDecorate();
      return result;
    };
    try{mpOpenClubMember=window.mpOpenClubMember;}catch{}
  }
  // Decorazione anche per la rosa Club ricostruita in differita.
  if(typeof mpClubMemberCard==='function'){
    const oldCard=mpClubMemberCard;
    mpClubMemberCard=function(member,ownerId,...rest){
      const html=oldCard.call(this,member,ownerId,...rest);
      if(typeof html!=='string'||!member?.user_id||member?.card_stats?.promoCard===true)return html;
      const skinId=S.clubSkinByUser.get(member.user_id);
      if(!skinId)return html;
      const container=document.createElement('div');container.innerHTML=html;
      const card=container.querySelector('.mp-club-showcase-card, .mp-club-member-card, .mp-club-home-card');
      if(card){card.dataset.m3UserId=member.user_id;applySkin(card,skinId);}
      return container.innerHTML;
    };
    window.mpClubMemberCard=mpClubMemberCard;
  }
  // Evita rescan ripetuti; le mutazioni delle classi non richiamano l'osservatore.
  const observer=new MutationObserver(mutations=>{
    if(mutations.some(x=>x.type==='childList' && (x.addedNodes.length||x.removedNodes.length)))scheduleDecorate();
  });
  observer.observe(MAIN,{childList:true,subtree:true});
  // La prima installazione avviene in stagione corrente: nessun reset immediato.
  window.mpM3Inspect=()=>({version:'M3.0',season:SEASON,archiveCount:S.archives.length,
    archiveError:S.error,clubSkins:S.clubSkinByUser.size,bootBlocked:!!BOOT?.blocked,
    bootWarning:BOOT?.warning||'',V8:typeof mpV8Inspect==='function'?mpV8Inspect():null});
  window.MP_M3_READY=true;
  scheduleDecorate();
  void loadCatalogue().then(scheduleDecorate);
  if(route==='locker')void loadClubSkins();
  if(BOOT?.blocked)showSafetyWarning();
  // Dopo il boot, prova a salvare sul cloud gli archivi già confermati
  // in IndexedDB. In caso di rete assente rimangono sul dispositivo.
  void archivesWithCloud().catch(e=>console.warn('M3 sync iniziale:',e));
  // Se l'app rimane aperta durante il cambio di stagione, richiede il riavvio.
  setInterval(()=>{
    if(BOOT?.currentSeason?.()!==SEASON && !document.getElementById('mpM3NewSeason')){
      const banner=document.createElement('div');banner.id='mpM3NewSeason';banner.className='mp-m3-safety-banner';
      banner.innerHTML='Nuova stagione disponibile. <button type="button" onclick="location.reload()">RIAVVIA MATCHPULSE</button>';
      document.body.appendChild(banner);
    }
  },60000);
})();
