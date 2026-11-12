/* MATCHPULSE PREMIUM R1 — MACROBLOCCO GRAFICO 1/2
   Caricare per ultimo, dopo M3. Solo interfaccia, nessuna scrittura di dati.
   Compatibile con app.js + M1 + M2 + M3 e il motore V8.
*/
(function(){
  'use strict';
  if(window.MP_PREMIUM_R1_READY) return;
  const main=document.getElementById('app');
  const top=document.querySelector('.topbar');
  const nav=document.querySelector('.bottom-nav');
  if(!main || !top || !nav) return;
  const esc = value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icons={
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    matches:'<circle cx="12" cy="12" r="9"/><path d="m12 7 3 2-1 4h-4L9 9zm-3 2-4-1m9 5 3 3m-7-3-3 3m8-7 3-2"/>',
    locker:'<circle cx="8" cy="8" r="3"/><path d="M2 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 4 5v1"/>',
    challenges:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/><path d="m15 9 6-6m-4 0h4v4"/>',
    store:'<circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/><path d="M2 3h2l3 12h12l3-9H5"/>',
    seasons:'<path d="m8 21 4-3 4 3v-5H8zM5 3h14v9a7 7 0 0 1-14 0zM5 6H2v4a4 4 0 0 0 4 4M19 6h3v4a4 4 0 0 1-4 4"/>'
  };
  const svg=(name,size=22)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.home}</svg>`;
  const badge=()=>'<svg class="mp-r1-pulse-logo" viewBox="0 0 44 30" fill="none" aria-hidden="true"><path d="M1 16h12l5-11 6 21 6-15 4 5h9" stroke="url(#mpR1PulseGradient)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><defs><linearGradient id="mpR1PulseGradient" x1="0" y1="0" x2="44" y2="30"><stop stop-color="#e97aff"/><stop offset="1" stop-color="#8f32f7"/></linearGradient></defs></svg>';
  const season=()=>window.mpM3Boot?.currentSeason?.()||'2026-2027';
  const labelSeason=()=>season().replace('-',' / ');
  function header(){
    if(top.classList.contains('mp-r1-header'))return;
    const profile=document.querySelector('.top-profile-btn');
    top.classList.add('mp-r1-header');
    top.innerHTML=`<div class="mp-r1-brand" aria-label="MatchPulse Ultimate Team"><div class="mp-r1-brand-name">MATCH<span>PULSE</span>${badge()}</div><div class="mp-r1-brand-sub">ULTIMATE TEAM</div></div>
    <div class="mp-r1-header-actions"><button class="mp-r1-season-chip" type="button" onclick="setRoute('seasons')" aria-label="Apri le stagioni"><span class="mp-r1-head-icon">♛</span><span><small>STAGIONE ATTIVA</small><strong>${esc(labelSeason())}</strong></span></button>
    <button class="mp-r1-wallet-chip" type="button" onclick="setRoute('store')" aria-label="Apri il Negozio per vedere i token"><span class="mp-r1-coin" aria-hidden="true">✦</span><span><small>IL TUO SALDO</small><strong id="mpR1HeaderWallet">—</strong></span><span class="mp-r1-plus" aria-hidden="true">+</span></button></div>`;
    if(profile){
      profile.classList.add('mp-r1-profile');
      profile.setAttribute('aria-label','Apri profilo e backup');
      top.appendChild(profile);
    }
  }
  function navbar(){
    nav.classList.add('mp-r1-nav');
    nav.querySelectorAll('.nav-btn').forEach(btn=>{
      const id=btn.dataset.route;
      const node=btn.querySelector('.nav-icon');
      if(node && icons[id] && node.dataset.r1Icon!==id){
        node.innerHTML=svg(id,23);
        node.dataset.r1Icon=id;
      }
      btn.setAttribute('aria-label',btn.querySelector('.nav-label')?.textContent?.trim()||id||'Pagina');
    });
  }
  let cachedWallet='—';
  function updateWallet(){
    const out=document.getElementById('mpR1HeaderWallet');
    if(!out)return;
    const fromHome=main.querySelector('[data-m1-wallet]');
    const fromStore=main.querySelector('.mp-m2-wallet strong');
    const value=(fromHome?.textContent || fromStore?.textContent || '').replace(/[^\d.,—]/g,'').trim();
    // Non inventare saldi: il token resta — se il database non è pronto.
    if(value && value!=='—') cachedWallet=value;
    const shown=value||cachedWallet;
    if(out.textContent!==shown)out.textContent=shown;
  }
  function lastMatchInfo(){
    const list=typeof getMatches==='function'?getMatches():[];
    const sorted=Array.isArray(list)?[...list].sort((a,b)=>String(b?.date||'').localeCompare(String(a?.date||''))):[];
    const last=sorted[0];
    const wins=sorted.filter(m=>/^(vittoria|vinto|win|w)$/i.test(String(m?.outcome||'').trim())).length;
    const draws=sorted.filter(m=>/^(pareggio|pari|draw|d)$/i.test(String(m?.outcome||'').trim())).length;
    const losses=sorted.filter(m=>/^(sconfitta|perso|loss|l)$/i.test(String(m?.outcome||'').trim())).length;
    const formatDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(String(d||''))?`${d.slice(8,10)}/${d.slice(5,7)}/${d.slice(0,4)}`:'';
    return {last,wins,draws,losses,total:sorted.length,date:formatDate(last?.date)};
  }
  function mountHome(){
    const home=main.querySelector('.premium-home');
    if(!home || home.dataset.r1Mounted==='1')return;
    home.dataset.r1Mounted='1';
    home.classList.add('mp-r1-home');
    const originalTitle=home.querySelector('.mp-m1-home-top');
    const playerName=typeof getPlayerProfile==='function'?getPlayerProfile()?.name:'';
    const firstName=String(playerName||'PLAYER').trim().split(/\s+/)[0]||'PLAYER';
    if(originalTitle){
      originalTitle.classList.add('mp-r1-welcome');
      const token=originalTitle.querySelector('.mp-m1-token');
      originalTitle.innerHTML=`<div class="mp-r1-welcome-title"><span class="mp-r1-kicker">✦ MATCHPULSE ULTIMATE TEAM</span><h2>Bentornato, <em>${esc(firstName)}</em></h2><p>La tua stagione è in corso. La tua carriera, al centro di tutto.</p></div>`;
      if(token){token.classList.add('mp-r1-hidden-wallet');originalTitle.appendChild(token);}
    }
    const featured=home.querySelector('.featured-card-wrap');
    if(featured){
      featured.classList.add('mp-r1-featured');
      featured.insertAdjacentHTML('afterbegin',`<div class="mp-r1-card-eyebrow"><span>✦</span> LA TUA CARTA <strong>LIVE</strong></div>`);
      const btn=document.createElement('button');btn.type='button';btn.className='mp-r1-card-cta';
      btn.innerHTML=`<span>✧</span> PERSONALIZZA CARTA <span aria-hidden="true">→</span>`;
      btn.setAttribute('aria-label','Vai al Negozio per scegliere una skin');
      btn.onclick=()=>setRoute('store');featured.appendChild(btn);
    }
    const data=lastMatchInfo();
    const stats=document.createElement('section');stats.className='mp-r1-performance';stats.setAttribute('aria-label','Statistiche principali');
    stats.innerHTML=`<div class="mp-r1-panel-head"><span class="mp-r1-kicker">IL TUO RENDIMENTO</span><button type="button" onclick="setRoute('stats')">Tutte le statistiche →</button></div>
      <div class="mp-r1-performance-grid"><div><span>PARTITE</span><strong>${data.total}</strong></div><div><span>VITTORIE</span><strong class="green">${data.wins}</strong></div><div><span>PAREGGI</span><strong>${data.draws}</strong></div><div><span>SCONFITTE</span><strong class="rose">${data.losses}</strong></div></div>`;
    home.appendChild(stats);
    const last=document.createElement('section');last.className='mp-r1-lastmatch';
    last.innerHTML=`<div class="mp-r1-panel-head"><span class="mp-r1-kicker">ULTIMA PARTITA</span><button type="button" onclick="setRoute('history')">Storico →</button></div>
      ${data.last?`<div class="mp-r1-lastmatch-body"><div class="mp-r1-score"><small>${esc(data.date)}</small><strong>${esc(data.last.result||'—')}</strong><span>${esc(data.last.outcome||'Risultato registrato')}</span></div><div class="mp-r1-match-figures"><span>⚽ GOL <b>${Number(data.last.goals)||0}</b></span><span>↗ ASSIST <b>${Number(data.last.assists)||0}</b></span><span>★ VOTO <b>${esc(data.last.rating||'—')}</b></span></div></div>`:`<p class="mp-r1-empty">La tua prossima partita è tutta da scrivere.</p>`}`;
    home.appendChild(last);
    const collection=document.createElement('section');collection.className='mp-r1-collections mp-r1-shop-promo';
collection.innerHTML=`<div class="mp-r1-panel-head"><span class="mp-r1-kicker">PERSONALIZZA LA TUA CARTA</span><button type="button" onclick="setRoute('store')">Apri Negozio →</button></div>
  <div class="mp-r1-shop-hero">
    <div class="mp-r1-shop-copy">
      <strong>Più skin, più stili, più identità.</strong>
      <p>Sblocca skin, cornici ed emblemi dal Negozio MatchPulse e rendi la tua carta davvero unica.</p>
      <div class="mp-r1-shop-pills">
        <span>✦ Completa le Sfide</span>
        <span>✦ Guadagna token</span>
        <span>✦ Equipaggia la tua preferita</span>
      </div>
    </div>
    <div class="mp-r1-shop-actions">
      <button type="button" class="primary" onclick="setRoute('store')">VAI AL NEGOZIO</button>
      <button type="button" class="secondary" onclick="setRoute('challenges')">GUADAGNA TOKEN</button>
    </div>
  </div>`;
home.appendChild(collection);
    const ribbon=home.querySelector('.mp-m3-season-ribbon');
    if(ribbon)ribbon.classList.add('mp-r1-ribbon');
    // Manteniamo i widget originari per compatibilità; il riepilogo nuovo
    // è in alto, la media voto e il riepilogo storico rimangono consultabili.
    updateWallet();
  }
  let raf=0;
  function sync(){
    raf=0;
    const r=typeof route!=='undefined'?route:'home';
    document.body.dataset.mpR1Route=r;
    if(r==='home')mountHome();
    updateWallet();
  }
  function schedule(){if(raf)return;raf=requestAnimationFrame(sync);}
  // Non osserviamo attributi: così classi e animazioni non creano loop.
  const observer=new MutationObserver(mutations=>{
    if(mutations.some(m=>m.type==='childList'&&(m.addedNodes.length||m.removedNodes.length)))schedule();
  });
  observer.observe(main,{subtree:true,childList:true});
  window.MP_PREMIUM_R1_READY=true;
  window.mpR1Inspect=()=>({version:'R1.0',route:typeof route==='undefined'?'unknown':route,
    homeMounted:!!main.querySelector('.mp-r1-home'), safeTop:getComputedStyle(document.documentElement).getPropertyValue('--mp-r1-safe-top').trim(),
    season:season(),navTabs:nav.querySelectorAll('[data-route]').length});
  header();navbar();schedule();
})();
