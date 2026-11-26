/* MATCHPULSE M7 — Career Premium. Presentation only. */
(function(){
  'use strict';
  if(window.MP_M7_READY)return;
  const app=document.getElementById('app');
  if(!app)return;
  const KEYS={home:'matchpulse_m7_home_view',club:'matchpulse_m7_club_view'};
  function read(k){try{return localStorage.getItem(k);}catch{return null;}}
  function write(k,v){try{localStorage.setItem(k,v);}catch{}}
  const views=Object.fromEntries(Object.keys(KEYS).map(k=>[k,read(KEYS[k])==='skin'?'skin':'career']));
  const scope=el=>{
    if(!el?.closest||el.closest('.mp6-preview-overlay,.mp-m4-preview-host,.mp-m2-product,.mp-m2-modal-host,.mp7-promotion,.mp-promo-card,.mp-promo-v3-card,.mp-club-promo-v3,[data-promo-card="true"]'))return null;
    if(el.closest('#mpClubMemberModal,.mp-club-page,.mp-club-home-card,.mp-club-showcase-card,.mp-club-member-card,.mp-club-profile-card-base-home'))return 'club';
    if(el.closest('.premium-home'))return 'home';
    return null;
  };
  window.mpM7View=k=>views[k]||'career';
  window.mpM7IsCareerCard=el=>{const key=scope(el);return Boolean(key&&views[key]==='career');};
  function reflect(){
    document.body.dataset.mp7HomeView=views.home;
    document.body.dataset.mp7ClubView=views.club;
    document.querySelectorAll('.mp7-toggle').forEach(el=>{
      const selected=views[el.dataset.mp7Scope];
      el.querySelectorAll('button[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===selected)));
    });
  }
  function refreshVisuals(){
    window.mpM7DecorateHome?.();
    window.mpM7DecorateClub?.();
    window.mpM7BadgeRefresh?.();
    window.mpM6CardSync?.();
  }
  function toggle(key){
    const wrapper=document.createElement('div');
    wrapper.className='mp7-toggle';wrapper.dataset.mp7Scope=key;
    wrapper.setAttribute('role','group');wrapper.setAttribute('aria-label',key==='club'?'Visualizzazione carte del Club':'Visualizzazione della tua carta');
    for(const [value,label] of [['career','Carriera'],['skin','Estetica']]){
      const button=document.createElement('button');button.type='button';button.dataset.view=value;
      button.textContent=label;button.setAttribute('aria-pressed',String(views[key]===value));
      button.onclick=()=>{
        if(views[key]===value)return;
        views[key]=value;write(KEYS[key],value);reflect();refreshVisuals();
      };wrapper.append(button);
    }
    return wrapper;
  }
  function mountHome(){
    const home=app.querySelector('.premium-home.mp-r1-home');
    if(!home)return false;
    const featured=home.querySelector('.featured-card-wrap');
    if(!featured)return false;
    if(!featured.querySelector(':scope > .mp7-identity')){
      featured.classList.add('mp7-arena');
      const identity=document.createElement('div');identity.className='mp7-identity';identity.hidden=true;
      const title=document.createElement('span');title.className='mp7-title';identity.append(title);
      const switches=toggle('home');
      const card=featured.querySelector('.player-card');
      if(card?.parentElement===featured){featured.insertBefore(identity,card);featured.insertBefore(switches,card);}
      else{featured.prepend(identity,switches);}
      return true;
    }
    return false;
  }
  function mountClub(){
    const club=app.querySelector('.mp-club-page');
    if(!club||club.querySelector('.mp7-club-controls'))return false;
    const header=club.querySelector('.mp-club-dashboard-head');
    if(!header)return false;
    const controls=document.createElement('div');controls.className='mp7-club-controls';
    const label=document.createElement('strong');label.textContent='LE CARTE DEL CLUB';
    const hint=document.createElement('small');hint.textContent='Le carte Promo già condivise restano visibili nel loro formato originale.';
    controls.append(label,toggle('club'),hint);
    header.insertAdjacentElement('afterend',controls);
    return true;
  }
  // Body scroll lock, including iOS Safari/PWA.
  let lock=null;
  function activeOverlay(){return document.querySelector('.profile-hub-overlay,.mp7-promotion');}
  function syncLock(){
    const overlay=activeOverlay();
    const shell=document.querySelector('.app-shell');
    if(overlay&&!lock){
      const y=window.scrollY||document.documentElement.scrollTop||0;
      const currentRoute=typeof route==='string'?route:null;
      lock={y,currentRoute,shell,inert:shell?.hasAttribute('inert'),focused:document.activeElement};
      document.body.style.setProperty('--mp7-scroll-top',(-y)+'px');
      document.documentElement.classList.add('mp7-dialog-open');
      document.body.classList.add('mp7-dialog-open');
      if(shell&&!shell.contains(overlay))shell.setAttribute('inert','');
      if(overlay.classList.contains('profile-hub-overlay')){
        const panel=overlay.querySelector('.profile-hub-panel');
        panel?.setAttribute('role','dialog');panel?.setAttribute('aria-modal','true');
        panel?.setAttribute('aria-label','Profilo e backup');
        panel?.setAttribute('tabindex','-1');
        panel?.focus({preventScroll:true});
      }
    }else if(!overlay&&lock){
      const saved=lock;lock=null;
      document.body.classList.remove('mp7-dialog-open');
      document.documentElement.classList.remove('mp7-dialog-open');
      document.body.style.removeProperty('--mp7-scroll-top');
      if(saved.shell&&!saved.inert)saved.shell.removeAttribute('inert');
      if(saved.currentRoute===(typeof route==='string'?route:null)){
        window.scrollTo(0,saved.y);
        if(saved.focused?.isConnected)saved.focused.focus?.({preventScroll:true});
      }
    }
  }
  if(typeof window.openProfileHub==='function'){
    const original=window.openProfileHub;
    window.openProfileHub=function(...args){const result=original.apply(this,args);syncLock();return result;};
  }
  if(typeof window.closeProfileHub==='function'){
    const original=window.closeProfileHub;
    window.closeProfileHub=function(...args){const result=original.apply(this,args);syncLock();return result;};
  }
  document.addEventListener('touchmove',event=>{
    if(!lock)return;
    const target=event.target;
    if(!target?.closest?.('.profile-hub-panel,.mp7-promotion-panel'))event.preventDefault();
  },{passive:false});
  // Real V8 promotion tiers. The high-water mark is only a local display preference.
  const tiers=['bronze','silver','gold','icon'];
  const labels=['Bronzo','Argento','Oro','Icona'];
  function tier(ovr){return ovr>=90?3:ovr>=75?2:ovr>=65?1:0;}
  function current(){
    try{
      const data=window.mpV8Inspect?.();
      const ovr=Number(data?.ovr);
      if(!Number.isFinite(ovr)||ovr<60||ovr>99)return null;
      return {ovr,tier:tier(ovr)};
    }catch{return null;}
  }
  const season=()=>window.mpM3Boot?.currentSeason?.()||'current';
  const promotionKey=()=> 'matchpulse_m7_promotion_seen_'+season();
  let baseline=null,lastSeason=null;
  function savedHigh(key){
    const raw=read(key);
    if(raw===null)return -1;
    const n=Number(raw);return Number.isInteger(n)&&n>=0&&n<=3?n:-1;
  }
  function remember(){
    const now=current();if(!now)return;
    const s=season();if(lastSeason!==s){baseline=null;lastSeason=s;}
    const highest=Math.max(savedHigh(promotionKey()),now.tier,baseline?.high??-1);
    baseline={...now,high:highest};if(savedHigh(promotionKey())!==highest)write(promotionKey(),String(highest));
  }
  function closePromotion(){document.querySelector('.mp7-promotion')?.remove();syncLock();}
  function showPromotion(old,next){
    if(document.querySelector('.mp7-promotion'))return;
    const host=document.createElement('div');host.className='mp7-promotion';
    host.dataset.tier=tiers[next.tier];
    const panel=document.createElement('section');panel.className='mp7-promotion-panel';
    panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
    panel.setAttribute('aria-label','Nuova fascia raggiunta');
    const top=document.createElement('div');top.className='mp7-promotion-top';
    const tag=document.createElement('span');tag.textContent='MATCHPULSE · CARRIERA';
    const close=document.createElement('button');close.type='button';close.className='mp7-promotion-x';close.textContent='×';close.setAttribute('aria-label','Salta animazione');close.onclick=closePromotion;top.append(tag,close);
    const heading=document.createElement('h2');heading.textContent='NUOVA FASCIA RAGGIUNTA';
    const transition=document.createElement('div');transition.className='mp7-promotion-transition';
    const from=document.createElement('span');from.textContent=labels[old.tier]+' · '+old.ovr;
    const to=document.createElement('strong');to.textContent=labels[next.tier]+' · '+next.ovr;
    transition.append(from,document.createTextNode(' → '),to);
    const stage=document.createElement('div');stage.className='mp7-promotion-stage';
    const rays=document.createElement('div');rays.className='mp7-promotion-rays';rays.setAttribute('aria-hidden','true');
    const oldCard=document.createElement('div');oldCard.className='mp7-old-card';oldCard.dataset.tier=tiers[old.tier];
    const rating=document.createElement('strong');rating.textContent=String(old.ovr);
    const oldTier=document.createElement('span');oldTier.textContent=labels[old.tier];oldCard.append(rating,oldTier);
    const reveal=document.createElement('div');reveal.className='mp7-new-card';
    try{
      const source=document.createElement('div');
      source.innerHTML=playerCard(playerRatings(getMatches()));
      const card=source.querySelector('.player-card');
      if(card)reveal.append(card);else throw Error('card unavailable');
    }catch{
      const fallback=document.createElement('div');fallback.className='mp7-old-card mp7-fallback-card';fallback.dataset.tier=tiers[next.tier];fallback.textContent=String(next.ovr)+' · '+labels[next.tier];reveal.append(fallback);
    }
    stage.append(rays,oldCard,reveal);
    const note=document.createElement('p');note.textContent='Una promozione conquistata sul campo.';
    const done=document.createElement('button');done.type='button';done.className='mp7-promotion-done';done.textContent='CONTINUA';done.onclick=closePromotion;
    panel.append(top,heading,transition,stage,note,done);host.append(panel);document.body.append(host);
    syncLock();close.focus({preventScroll:true});
  }
  // Called only after saving a new match and the original V8 rebuild.
  window.mpM7OnMatchSaved=function(){
    const now=current();if(!now)return;
    if(!baseline||lastSeason!==season()){remember();return;}
    const old=baseline;
    const high=Math.max(old.high,savedHigh(promotionKey()));
    const nextHigh=Math.max(high,now.tier);
    baseline={...now,high:nextHigh};
    write(promotionKey(),String(nextHigh));
    if(now.tier>high&&now.tier>old.tier)requestAnimationFrame(()=>showPromotion(old,now));
  };
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    if(document.querySelector('.mp7-promotion')){e.preventDefault();closePromotion();}
    else if(document.querySelector('.profile-hub-overlay')){e.preventDefault();window.closeProfileHub?.();}
  });
  let queued=false;
  function sync(){
    queued=false;
    const changedHome=mountHome(),changedClub=mountClub();
    if(changedHome||changedClub){reflect();refreshVisuals();}
    syncLock();remember();
  }
  function schedule(){if(!queued){queued=true;requestAnimationFrame(sync);}}
  const observer=new MutationObserver(changes=>{
    syncLock();
    if(changes.some(x=>x.type==='childList'&&(x.addedNodes.length||x.removedNodes.length)))schedule();
  });
  observer.observe(document.body,{subtree:true,childList:true});
  reflect();remember();sync();refreshVisuals();
  window.mpM7Inspect=()=>({version:'M7.0',home:views.home,club:views.club,profileLocked:!!lock,promotion:baseline,arenaReady:!!app.querySelector('.mp7-arena')});
  window.MP_M7_READY=true;
})();