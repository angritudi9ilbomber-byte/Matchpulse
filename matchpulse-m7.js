/* MATCHPULSE M7 — Career Premium. Presentation only. */
(function(){
  'use strict';
  if(window.MP_M7_READY)return;
  const app=document.getElementById('app');
  if(!app)return;
  const KEYS={home:'matchpulse_m7_home_view',club:'matchpulse_m7_club_view'};
  function read(k){try{return localStorage.getItem(k);}catch{return null;}}
  function write(k,v){try{localStorage.setItem(k,v);}catch{}}
  const views=Object.fromEntries(Object.keys(KEYS).map(k=>[k,['career','promo','skin'].includes(read(KEYS[k]))?read(KEYS[k]):'career']));
  const scope=el=>{
    if(!el?.closest||el.closest('.mp6-preview-overlay,.mp-m4-preview-host,.mp-m2-product,.mp-m2-modal-host,.mp7-promotion,.mp-promo-card,.mp-promo-v3-card,.mp-club-promo-v3,[data-promo-card="true"]'))return null;
    if(el.closest('#mpClubMemberModal,.mp-club-page,.mp-club-home-card,.mp-club-showcase-card,.mp-club-member-card,.mp-club-profile-card-base-home'))return 'club';
    if(el.closest('.premium-home'))return 'home';
    return null;
  };
  window.mpM7View=k=>views[k]||'career';
  window.mpM7IsCareerCard=el=>{const key=scope(el);return Boolean(key&&views[key]!=='skin');};
  function reflect(){
    document.body.dataset.mp7HomeView=views.home;
    document.body.dataset.mp7ClubView=views.club;
    document.querySelectorAll('.mp7-arena .mp-r1-card-eyebrow strong').forEach(el=>{const label=views.home==='promo'?'PROMO':views.home==='skin'?'ESTETICA':'LIVE';if(el.textContent!==label)el.textContent=label;});
    document.querySelectorAll('.mp7-toggle').forEach(el=>{
      const selected=views[el.dataset.mp7Scope];
      el.querySelectorAll('button[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===selected)));
    });
  }
  // Keep the original server row while projecting one of the three views.
  const sourceRows=new WeakMap();
  function originalRow(row){return sourceRows.get(row)||row;}
  function projectMember(input){
    const row=originalRow(input), stats=row.card_stats||{};
    const promo=stats.promoCard===true && !!stats.promoTemplate;
    const mode=views.club;
    if(mode==='promo')return row;
    if(!promo)return row;
    const base=stats.mpCareerCardV1;
    if(!base?.card_stats || !Number.isFinite(Number(base.ovr)))return row;
    const careerMeta=Object.fromEntries(Object.entries(stats).filter(([key])=>key.startsWith('career')));
    const projected={...row,...base,card_stats:{...base.card_stats,...careerMeta}};
    sourceRows.set(projected,row);
    return projected;
  }
  const oldRenderClub=typeof mpRenderClub==='function'?mpRenderClub:null;
  if(oldRenderClub){
    const wrapped=function(club,members,...rest){
      const rows=(Array.isArray(members)?members:[]).map(originalRow);
      const projected=rows.map(projectMember);
      MP_CLUB_MEMBERS_CACHE=projected;
      return oldRenderClub.call(this,club,projected,...rest);
    };
    mpRenderClub=wrapped;window.mpRenderClub=wrapped;
  }
  const oldMemberCard=typeof mpClubMemberCard==='function'?mpClubMemberCard:null;
  if(oldMemberCard){
    const wrapped=function(member,ownerId,...rest){
      const row=projectMember(member);
      const isPromo=row?.card_stats?.promoCard===true && !!row?.card_stats?.promoTemplate;
      const note=views.club==='promo'&&!isPromo?'Nessuna promo selezionata':
        views.club!=='promo'&&isPromo?'Carta carriera non ancora sincronizzata':null;
      if(!note)return oldMemberCard.call(this,row,ownerId,...rest);
      const placeholder=document.createElement('article');
      placeholder.className='mp7-member-fallback';
      const name=document.createElement('strong');name.textContent=row?.player_name||'Giocatore';
      const message=document.createElement('small');message.textContent=note;
      placeholder.append(name,message);
      return placeholder.outerHTML;
    };
    mpClubMemberCard=wrapped;window.mpClubMemberCard=wrapped;
  }
  function rerenderClub(){
    if(typeof route==='string'&&route==='locker'&&oldRenderClub&&MP_CLUB_CURRENT&&Array.isArray(MP_CLUB_MEMBERS_CACHE)){
      const y=window.scrollY;
      mpRenderClub(MP_CLUB_CURRENT,MP_CLUB_MEMBERS_CACHE);
      mountClub();reflect();
      requestAnimationFrame(()=>window.scrollTo(0,y));
    }
  }
  function syncHomePromo(){
    const featured=app.querySelector('.premium-home .featured-card-wrap.mp7-arena');
    if(!featured)return;
    const stage=featured.querySelector(':scope > .mp7-home-promo');
    if(!stage)return;
    stage.hidden=views.home!=='promo';
    if(stage.hidden)return;
    const cards=window.mpPromoGetCards?.()||[];
    const selected=window.mpPromoSelectedCard?.();
    const signature=JSON.stringify([cards.map(c=>[c.id,c.shortName,c.ovr]),selected?.id,selected?.photoX,selected?.photoY,selected?.photoZoom]);
    if(stage.dataset.signature===signature)return;
    stage.dataset.signature=signature;
    const picker=document.createElement('select');
    picker.className='mp7-promo-picker';picker.setAttribute('aria-label','Promo da mostrare in Home e Club');
    const empty=document.createElement('option');empty.value='';empty.textContent='Scegli la tua promo';empty.disabled=true;picker.append(empty);
    for(const card of cards){const option=document.createElement('option');option.value=card.id;option.textContent=(card.shortName||card.promoName||'Promo')+' · '+(card.ovr??'—')+' OVR';picker.append(option);}
    picker.value=selected?.id||'';picker.disabled=!cards.length;
    picker.onchange=()=>{if(picker.value)void window.mpSelectPromoCard?.(picker.value);};
    const display=document.createElement('div');display.className='mp7-home-promo-card';
    if(selected&&typeof window.mpPromoV3Card==='function')display.innerHTML=window.mpPromoV3Card(selected,'club');
    else{const message=document.createElement('p');message.textContent=cards.length?'Scegli una carta promo dalla tua collezione.':'Non hai ancora carte promo.';display.append(message);}
    const collection=document.createElement('button');collection.type='button';collection.className='secondary-btn';collection.textContent='APRI COLLEZIONE PROMO';collection.onclick=()=>setRoute('promos');
    stage.replaceChildren(picker,display,collection);
  }
  function setView(key,value){
    views[key]=value;write(KEYS[key],value);
  }
  window.mpM7PromoSelected=()=>{
    setView('home','promo');setView('club','promo');
    reflect();syncHomePromo();refreshVisuals();
  };
  window.mpM7ShowCareer=()=>{
    setView('home','career');setView('club','career');
    reflect();syncHomePromo();refreshVisuals();
    if(typeof route==='string'&&route==='promos')window.renderPromos?.();
  };
  // M8 prototype: session-only, Founder-authorized; no economy or inventory writes.

  const auraCatalog=[["emerald","Emerald Mist","Comune","#24cc9b","#c2ffdf","mist"],["crimson","Crimson Flame","Comune","#ff4328","#ffcc72","flame"],["frost","Frost","Comune","#36baff","#c9faff","frost"],["violet","Violet Pulse","Rara","#a34aff","#f8b8ff","violet"],["sakura","Sakura Storm","Rara","#f15cab","#ffe0ef","petal"],["thunder","Thunder","Rara","#288fff","#ddfaff","lightning"],["grandline","Grand Line","Epica","#07b9d8","#f4ffff","wave"],["saiyan","Saiyan Power","Epica","#ffbc22","#fffbd0","energy"],["nightcity","Night City","Epica","#05e7ee","#ff4ed9","glitch"],["hyperdrive","Hyperdrive","Leggendaria","#ff3746","#ffdda4","speed"],["divine","Divine Gold","Leggendaria","#e8b44e","#fff3bb","divine"],["cosmic","Cosmic Infinity","Leggendaria","#7d5cff","#f7c7ff","cosmic"]];
  const auraById=id=>auraCatalog.find(a=>a[0]===id);
  window.mpM8AuraOptions=()=>auraCatalog.map(a=>[a[0],a[1],a[2]]);
  function auraMarkup(id){
    const a=auraById(id);
    if(!a)return '';
    const [key,name,rarity,color,light,kind]=a;
    const edge=(i,n)=>i%2===0?8+(i*13)%18:332-(i*11)%18;
    const y=(i,n)=>24+(i*71)%474;
    const path=(d,w=2,o=1,c=light)=>'<path d="'+d+'" stroke="'+c+'" stroke-width="'+w+'" opacity="'+o+'" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    const many=(n,fn)=>Array.from({length:n},(_,i)=>fn(i,n)).join('');
    const star=(x,y,r)=>'<path d="M'+x+' '+(y-r)+' l'+(r*.24)+' '+(r*.76)+' '+(r*.76)+' '+(r*.24)+' -'+(r*.76)+' '+(r*.24)+' -'+(r*.24)+' '+(r*.76)+' -'+(r*.24)+' -'+(r*.76)+' -'+(r*.76)+' -'+(r*.24)+' '+(r*.76)+' -'+(r*.24)+'Z" fill="'+light+'"/>';
    let back='',front='',extra='';
    switch(kind){
      case 'mist':
        back=many(6,i=>'<ellipse cx="'+(i%2?331:9)+'" cy="'+(55+i*81)+'" rx="39" ry="76" fill="'+color+'" opacity=".14" transform="rotate('+(i%2?-17:17)+' '+(i%2?331:9)+' '+(55+i*81)+')"/>');
        front=many(8,i=>path('M'+(i%2?335:5)+' '+(35+i*60)+' q'+(i%2?-32:32)+' 36 0 74',2,.35,color));
        extra=many(19,i=>'<circle cx="'+edge(i)+'" cy="'+y(i)+'" r="'+(1+i%3)+'" fill="'+light+'" opacity=".55"/>');
        break;
      case 'flame':
        back=many(14,i=>{const x=i%2?332:8,b=96+Math.floor(i/2)*67;return '<path d="M'+(x-13)+' '+b+' Q'+(x-24)+' '+(b-23)+' '+x+' '+(b-65)+' Q'+(x-5)+' '+(b-32)+' '+(x+10)+' '+(b-43)+' Q'+(x+23)+' '+(b-15)+' '+(x+13)+' '+b+'Z" fill="url(#mp8glow)" opacity=".8"/>';});
        front=many(12,i=>{const x=edge(i),b=90+Math.floor(i/2)*80;return path('M'+x+' '+b+' q'+(i%2?-12:12)+' -26 0 -49',2.2,.82,light);});
        extra=many(24,i=>'<circle cx="'+edge(i)+'" cy="'+y(i)+'" r="'+(1+i%3*.55)+'" fill="'+(i%3?color:light)+'"/>');
        break;
      case 'frost':
        back=many(14,i=>{const x=edge(i),v=y(i);return '<path d="M'+x+' '+(v-14)+' l7 14 -7 18 -7 -18Z" fill="'+color+'" opacity=".45" stroke="'+light+'" stroke-width=".8"/>';});
        extra=many(18,i=>{const x=edge(i),v=y(i)+9,r=4+i%4;return '<g stroke="'+light+'" stroke-width="1" opacity=".8"><path d="M'+(x-r)+' '+v+' H'+(x+r)+' M'+x+' '+(v-r)+' V'+(v+r)+' M'+(x-r*.7)+' '+(v-r*.7)+' l'+(r*1.4)+' '+(r*1.4)+' M'+(x-r*.7)+' '+(v+r*.7)+' l'+(r*1.4)+' -'+(r*1.4)+'"/></g>';});
        front=path('M3 70 L14 35 48 10 M337 450 L326 485 292 511',3,.8);
        break;
      case 'petal':
        back=path('M3 75 Q50 -12 157 12 M337 417 Q310 510 183 516',9,.18,color);
        front=many(22,i=>{const x=edge(i),v=y(i);return '<path d="M0 -7 Q9 -10 8 -1 Q5 5 0 9 Q-7 5 -8 -1 Q-10 -8 -2 -6 L0 -3Z" fill="'+(i%3?color:light)+'" opacity=".85" transform="translate('+x+' '+v+') rotate('+((i*57)%360)+') scale('+(0.5+(i%4)*.17)+')"/>';});
        extra=many(8,i=>'<circle cx="'+(28+i*40)+'" cy="'+(i%2?510:13)+'" r="2" fill="'+light+'"/>');
        break;
      case 'lightning':
        back=many(4,i=>path('M'+(i%2?330:10)+' '+(15+i*113)+' l'+(i%2?-19:19)+' 29 -8 19 14 26 -18 27 9 29',9,.22,color));
        front=many(8,i=>{const x=i%2?326:14,v=12+Math.floor(i/2)*132,k=i%2?-1:1;return path('M'+x+' '+v+' l'+(k*12)+' 24 '+(-k*8)+' 16 '+(k*17)+' 24 '+(-k*22)+' 34',2.3,.96)+path('M'+(x+k*12)+' '+(v+24)+' l'+(k*15)+' -9 '+(k*8)+' 16',1,.8);});
        extra=many(13,i=>star(edge(i),y(i),3+i%3));
        break;
      case 'wave':
        back=many(4,i=>path('M-10 '+(60+i*122)+' C40 '+(20+i*122)+' -6 '+(150+i*122)+' 32 '+(116+i*122)+' M350 '+(60+i*122)+' C300 '+(20+i*122)+' 346 '+(150+i*122)+' 308 '+(116+i*122),15,.38,color));
        front=many(5,i=>path('M-4 '+(32+i*96)+' Q42 '+(60+i*96)+' 10 '+(110+i*96)+' M344 '+(32+i*96)+' Q298 '+(60+i*96)+' 330 '+(110+i*96),2.6,.9));
        extra=many(26,i=>'<circle cx="'+edge(i)+'" cy="'+y(i)+'" r="'+(1+i%4*.7)+'" fill="none" stroke="'+light+'" opacity=".76"/>');
        break;
      case 'energy':
        back=many(12,i=>{const x=edge(i),v=y(i);return '<path d="M'+(x-13)+' '+(v+32)+' Q'+(x-21)+' '+v+' '+x+' '+(v-51)+' Q'+(x+4)+' '+(v-12)+' '+(x+16)+' '+(v+32)+'Z" fill="'+color+'" opacity=".43"/>';});
        front=many(8,i=>{const x=i%2?329:11,v=22+Math.floor(i/2)*127;return path('M'+x+' '+v+' l12 15 -13 26 15 11 -18 34',2.5,1,light);});
        extra=many(18,i=>star(edge(i),y(i),2+i%4));
        break;
      case 'glitch':
        back=many(24,i=>'<rect x="'+(i%2?315:2)+'" y="'+(12+i*21)+'" width="'+(8+(i*11)%24)+'" height="'+(2+i%4)+'" rx="1" fill="'+(i%3?color:light)+'" opacity=".55"/>');
        front=many(10,i=>{const x=i%2?329:11,v=20+Math.floor(i/2)*102,k=i%2?-1:1;return path('M'+x+' '+v+' v25 h'+(k*12)+' v35 h'+(-k*9)+' v22',1.8,.85,i%3?color:light)+'<rect x="'+(x-2)+'" y="'+(v-3)+'" width="4" height="4" fill="'+light+'"/>';});
        extra=many(12,i=>'<rect x="'+edge(i)+'" y="'+y(i)+'" width="'+(6+i%3*3)+'" height="2" fill="'+light+'"/>');
        break;
      case 'speed':
        back=many(10,i=>path('M'+(i%2?342:-2)+' '+(12+i*51)+' l'+(i%2?-29:29)+' -75',9,.16,color));
        front=many(18,i=>{const x=i%2?338-(i%3)*7:2+(i%3)*7,v=56+Math.floor(i/2)*54;return path('M'+x+' '+v+' l'+(i%2?-15:15)+' -'+(30+i%4*10),i%3===0?3:1.6,.92,i%2?color:light);});
        extra=path('M5 493 Q168 523 335 493 M20 507 Q170 531 320 507',3,.9,light)+many(18,i=>star(edge(i),y(i),2+i%3));
        break;
      case 'divine':
        back=path('M7 180 Q-5 5 170 6 Q345 5 333 180 M7 340 Q-5 515 170 514 Q345 515 333 340',12,.25,color);
        front=path('M16 95 L16 51 49 51 49 26 170 6 291 26 291 51 324 51 324 95 M16 425 V469 H49 V494 L170 514 291 494 V469 H324 V425',2.4,.95)+path('M25 25 Q170 -6 315 25 M25 495 Q170 525 315 495',1.6,.8,color);
        extra=many(20,i=>star(edge(i),y(i),3+i%4))+star(170,8,7)+star(170,512,7);
        break;
      case 'cosmic':
        back=many(7,i=>'<ellipse cx="'+(i%2?333:7)+'" cy="'+(34+i*76)+'" rx="40" ry="64" fill="'+(i%3?color:'#d43cec')+'" opacity=".22" transform="rotate(23)"/>');
        front=path('M6 140 C-3 15 265 -16 332 66 C358 132 301 294 329 405 C366 491 115 544 15 455 C-29 407 32 222 6 140Z',3,.82,color)+path('M15 83 C135 -16 342 2 335 140 M8 410 C14 520 254 534 335 452',2,.95);
        extra=many(35,i=>star(edge(i),y(i),1.6+i%5*.65))+many(8,i=>star(25+i*41,i%2?508:12,3+i%3));
        break;
    }
    return '<svg viewBox="0 0 340 520" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="mp8glow"><stop stop-color="'+light+'" stop-opacity=".85"/><stop offset=".48" stop-color="'+color+'" stop-opacity=".68"/><stop offset="1" stop-color="'+color+'" stop-opacity="0"/></radialGradient></defs><ellipse cx="170" cy="260" rx="169" ry="258" fill="url(#mp8glow)" opacity=".4"/><g class="mp8-effect-back">'+back+'</g><g class="mp8-effect-front">'+front+'</g><g class="mp8-effect-particles">'+extra+'</g><ellipse cx="170" cy="506" rx="130" ry="15" fill="url(#mp8glow)" opacity=".82"/></svg>';
  }
  let auraTest=null, auraCard=null, auraHost=null, auraResize=null;
  function sizeAura(){
    if(!auraCard?.isConnected||!auraHost?.isConnected)return;
    const card=auraCard.getBoundingClientRect(), host=auraHost.getBoundingClientRect();
    const layer=auraHost.querySelector(':scope > .mp8-violet-layer');
    if(!layer||!card.width||!card.height)return;
    const padX=Math.min(22,Math.max(7,(host.width-card.width)/2-2));
    const padY=15;
    Object.assign(layer.style,{
      left:(card.left-host.left-auraHost.clientLeft-padX)+'px',
      top:(card.top-host.top-auraHost.clientTop-padY)+'px',
      width:(card.width+padX*2)+'px',height:(card.height+padY*2)+'px'
    });
  }
  function clearAura(){
    auraResize?.disconnect();auraResize=null;
    if(auraHost){
      auraHost.querySelector(':scope > .mp8-violet-layer')?.remove();
      auraHost.querySelector('.mp8-violet-off')?.remove();
      auraHost.querySelector('.mp8-aura-next')?.remove();
      auraHost.classList.remove('mp8-violet-active');
    }
    auraCard=null;auraHost=null;
  }
  function syncAura(){
    const host=app.querySelector('.premium-home .mp7-arena');
    const card=host?.querySelector(':scope > .player-card');
    if(!auraTest||!card||views.home==='promo'){
      if(auraHost)clearAura();
      return;
    }
    if(host===auraHost&&card===auraCard&&host.querySelector(':scope > .mp8-violet-layer')){
      sizeAura();return;
    }
    clearAura();auraHost=host;auraCard=card;
    host.classList.add('mp8-violet-active');
    const layer=document.createElement('div');layer.className='mp8-violet-layer';layer.setAttribute('aria-hidden','true');
    layer.dataset.aura=auraTest;
    if(auraTest!=='violet')layer.innerHTML=auraMarkup(auraTest);
    else layer.innerHTML=`<svg viewBox="0 0 340 520" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="mp8violetGlow"><stop offset="0" stop-color="#b24aff" stop-opacity=".12"/><stop offset=".68" stop-color="#9838ff" stop-opacity=".52"/><stop offset="1" stop-color="#6e23d8" stop-opacity="0"/></radialGradient>
        <linearGradient id="mp8violetArc" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#5a28d7" stop-opacity=".18"/><stop offset=".27" stop-color="#9b55ff"/><stop offset=".55" stop-color="#f8b8ff"/><stop offset=".78" stop-color="#e94aff"/><stop offset="1" stop-color="#6927d4" stop-opacity=".15"/></linearGradient>
        <radialGradient id="mp8violetFoot"><stop stop-color="#fff5ff"/><stop offset=".14" stop-color="#fcaaff" stop-opacity=".95"/><stop offset=".38" stop-color="#cc39ff" stop-opacity=".8"/><stop offset="1" stop-color="#9226ff" stop-opacity="0"/></radialGradient>
      </defs>
      <ellipse cx="170" cy="260" rx="170" ry="259" fill="url(#mp8violetGlow)"/>
      <g class="mp8-violet-breathe" fill="none" stroke="url(#mp8violetArc)">
        <path d="M170 8 C287 -9 335 78 328 171 C321 258 348 359 313 436 C286 497 219 509 170 512 C65 507 4 452 8 370 C13 268 -10 181 17 102 C43 28 105 3 170 8Z" stroke-width="14" opacity=".21"/>
        <path d="M170 8 C287 -9 335 78 328 171 C321 258 348 359 313 436 C286 497 219 509 170 512 C65 507 4 452 8 370 C13 268 -10 181 17 102 C43 28 105 3 170 8Z" stroke-width="2.4" opacity=".94"/>
        <path d="M24 28 C96 -3 270 4 318 58 C358 116 307 227 332 326 C354 422 306 488 170 510 C37 495 -8 438 9 328 C27 231 -11 155 18 98" stroke-width="1.5" opacity=".76"/>
        <path d="M6 410 C49 481 250 535 332 454 M9 93 C62 11 267 -12 330 86" stroke-width="3" opacity=".65"/>
      </g>
      <ellipse cx="170" cy="506" rx="125" ry="16" fill="url(#mp8violetFoot)" class="mp8-violet-breathe"/>
      <g class="mp8-violet-stars" fill="#ecbaff">
        <circle cx="13" cy="62" r="1.8"/><circle cx="29" cy="18" r="1.4"/><circle cx="88" cy="8" r="1.5"/><circle cx="247" cy="12" r="2"/><circle cx="323" cy="63" r="1.5"/><circle cx="332" cy="123" r="2"/><circle cx="8" cy="183" r="1.8"/><circle cx="333" cy="257" r="1.5"/><circle cx="8" cy="315" r="2"/><circle cx="325" cy="397" r="1.9"/><circle cx="14" cy="454" r="1.4"/><circle cx="64" cy="496" r="2"/><circle cx="270" cy="500" r="1.5"/><circle cx="321" cy="471" r="1.7"/>
      </g></svg>`;
    host.insertBefore(layer,card);
    const off=document.createElement('button');off.type='button';off.className='mp8-violet-off';off.textContent='TEST ✕';off.setAttribute('aria-label','Disattiva anteprima '+auraById(auraTest)[1]);
    off.onclick=()=>{auraTest=null;clearAura();};
    const next=document.createElement('button');next.type='button';next.className='mp8-aura-next';next.textContent=auraById(auraTest)[1]+' ›';next.setAttribute('aria-label','Aura '+auraById(auraTest)[1]+': passa alla successiva');
    next.onclick=()=>{const i=auraCatalog.findIndex(a=>a[0]===auraTest);clearAura();auraTest=auraCatalog[(i+1)%auraCatalog.length][0];syncAura();};
    host.querySelector('.mp-r1-card-eyebrow')?.append(next,off);
    if(typeof ResizeObserver==='function'){
      auraResize=new ResizeObserver(sizeAura);auraResize.observe(host);auraResize.observe(card);
    }
    sizeAura();
  }
  async function startCosmeticTest(kind){
    try{
      if(typeof window.mpPromoSecureIsAdmin!=='function'||!(await window.mpPromoSecureIsAdmin(false))){alert('Accesso Founder richiesto.');return;}
      window.mpM6FounderClose?.();
      clearAura();
      auraTest=auraById(kind)?kind:'violet';
      if(views.home==='promo'){setView('home','skin');reflect();refreshVisuals();}
      if(typeof route!=='undefined'&&route!=='home')setRoute('home');
      syncAura();
      requestAnimationFrame(()=>{syncAura();const host=app.querySelector('.premium-home .mp7-arena');host?.scrollIntoView({block:'start',behavior:'auto'});});
    }catch(error){auraTest=null;clearAura();alert('Anteprima non disponibile: '+(error?.message||String(error)));}
  }
  window.mpM8TestAura=id=>startCosmeticTest(id);
  window.mpM8TestVioletPulse=()=>startCosmeticTest('violet');
  window.mpM8StopVioletPulse=()=>{auraTest=null;clearAura();};
  function refreshVisuals(){
    syncHomePromo();
    syncAura();
    window.mpM7DecorateHome?.();
    window.mpM7DecorateClub?.();
    window.mpM7BadgeRefresh?.();
    window.mpM6CardSync?.();
  }
  function toggle(key){
    const wrapper=document.createElement('div');
    wrapper.className='mp7-toggle';wrapper.dataset.mp7Scope=key;
    wrapper.setAttribute('role','group');wrapper.setAttribute('aria-label',key==='club'?'Visualizzazione carte del Club':'Visualizzazione della tua carta');
    for(const [value,label] of [['career','Carriera'],['promo','Promo'],['skin','Estetica']]){
      const button=document.createElement('button');button.type='button';button.dataset.view=value;
      button.textContent=label;button.setAttribute('aria-pressed',String(views[key]===value));
      button.onclick=()=>{
        if(views[key]===value)return;
        setView(key,value);reflect();
        if(key==='club')rerenderClub();
        refreshVisuals();
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
      const promo=document.createElement('section');promo.className='mp7-home-promo';promo.hidden=true;
      switches.insertAdjacentElement('afterend',promo);
      syncHomePromo();
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
    const hint=document.createElement('small');hint.textContent='Carriera: valori reali · Promo: carta condivisa · Estetica: skin ed emblemi equipaggiati.';
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
    syncAura();syncLock();remember();
  }
  function schedule(){if(!queued){queued=true;requestAnimationFrame(sync);}}
  const observer=new MutationObserver(changes=>{
    syncLock();
    if(changes.some(x=>x.type==='childList'&&(x.addedNodes.length||x.removedNodes.length)))schedule();
  });
  observer.observe(document.body,{subtree:true,childList:true});
  reflect();remember();sync();refreshVisuals();
  window.mpM7Inspect=()=>({version:'M7.2',home:views.home,club:views.club,profileLocked:!!lock,promotion:baseline,arenaReady:!!app.querySelector('.mp7-arena'),auraTest});
  window.MP_M7_READY=true;
})();