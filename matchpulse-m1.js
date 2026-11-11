/* ===========================================================
   MATCHPULSE ULTIMATE TEAM — MACROBLOCCO 1
   Navigazione, Home, Sfide, Token, Traguardi.
   Caricare DOPO app.js. Non modifica il motore V8.
   =========================================================== */
(function () {
  "use strict";
  if (window.MP_M1_READY) return;

  const CLIENT_VERSION = "M1.0";
  const NAV = document.querySelector(".bottom-nav");
  const MAIN = document.querySelector("#app");
  const AUTH_TABLES = {
    challenges: "matchpulse_m1_challenges",
    events: "matchpulse_m1_matches",
    locks: "matchpulse_m1_role_locks",
    manual: "matchpulse_m1_manual_progress",
    claims: "matchpulse_m1_claims",
    ledger: "matchpulse_m1_wallet_ledger"
  };
  const ROLE_LABELS = {
    ATT: "Attaccante", ALA: "Ala", COC: "Trequartista",
    CC: "Centrocampista", CDC: "Mediano", DC: "Difensore",
    TERZINO: "Terzino"
  };
  const store = {
    tab: "weekly", ready: false, busy: false, loading: false,
    error: "", userId: null, lastLoad: 0, catalogue: [],
    events: [], locks: [], manual: [], claims: [], ledger: []
  };

  function html(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, c =>
      ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"})[c]);
  }
  function digits(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }
  function italianDateParts() {
    const entries = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", year: "numeric"
    }).formatToParts(new Date());
    return Object.fromEntries(entries.map(x => [x.type, x.value]));
  }
  function timeContext() {
    const x = italianDateParts();
    const year = Number(x.year), month = Number(x.month), day = Number(x.day);
    const utc = new Date(Date.UTC(year, month - 1, day));
    const iso = utc.toISOString().slice(0, 10);
    const weekday = utc.getUTCDay();
    utc.setUTCDate(utc.getUTCDate() - ((weekday + 6) % 7));
    const week = utc.toISOString().slice(0, 10);
    const seasonStartYear = month >= 9 ? year : year - 1;
    return {
      date: iso, week, season: `${seasonStartYear}-${seasonStartYear + 1}`,
      seasonStart: `${seasonStartYear}-09-01`,
      seasonEnd: `${seasonStartYear + 1}-09-01`
    };
  }
  function currentRole() {
    const p = typeof getPlayerProfile === "function" ? getPlayerProfile() : {};
    const r = String(p.role || "CC").toUpperCase();
    return ROLE_LABELS[r] ? r : "CC";
  }
  function client() {
    return typeof matchpulseSupabase !== "undefined" ? matchpulseSupabase : null;
  }
  async function identity() {
    const db = client();
    if (!db || typeof mpEnsureClubAuth !== "function") {
      throw Error("Supabase non è disponibile: verifica la connessione del Club.");
    }
    const user = await mpEnsureClubAuth();
    if (!user?.id) throw Error("Sessione Supabase non disponibile.");
    return user.id;
  }
  function localEvents() {
    const input = typeof getMatches === "function" ? getMatches() : [];
    if (!Array.isArray(input)) return [];
    const ids = new Set();
    return input.map(m => {
      const id = String(m?.id ?? "");
      const date = String(m?.date || "").slice(0,10);
      const check = new Date(`${date}T12:00:00Z`);
      if (!id || ids.has(id) || !/^\d{4}-\d{2}-\d{2}$/.test(date)
          || !Number.isFinite(check.getTime())
          || check.toISOString().slice(0,10) !== date) return null;
      ids.add(id);
      return {
        match_id: id, match_date: date,
        outcome: String(m.outcome || "").slice(0,32),
        goals: Math.min(99, digits(m.goals)),
        assists: Math.min(99, digits(m.assists)),
        role: String(m.role || m.matchRole || currentRole()).toUpperCase().slice(0,16)
      };
    }).filter(Boolean);
  }
  async function syncExistingMatches(userId) {
    const db = client();
    const events = localEvents();
    // Solo merge: NON cancella partite remote presenti su un altro dispositivo.
    for (let i = 0; i < events.length; i += 100) {
      const page = events.slice(i, i + 100).map(m => ({ user_id: userId, ...m }));
      const { error } = await db.from(AUTH_TABLES.events)
        .upsert(page, { onConflict: "user_id,match_id" });
      if (error) throw error;
    }
    const ctx = timeContext();
    // Nessun UPDATE o DELETE per il ruolo settimanale: si blocca alla prima visita.
    const { error: lockError } = await db.from(AUTH_TABLES.locks).upsert({
      user_id: userId, season_id: ctx.season,
      week_key: ctx.week, role: currentRole()
    }, { onConflict: "user_id,season_id,week_key", ignoreDuplicates: true });
    if (lockError) throw lockError;
  }
  async function fetchAll() {
    const db = client();
    const cols = ["challenges", "events", "locks", "manual", "claims", "ledger"];
    const answers = await Promise.all(cols.map(k => db.from(AUTH_TABLES[k]).select("*")));
    for (let i = 0; i < answers.length; i++) {
      if (answers[i].error) throw answers[i].error;
      store[cols[i] === "challenges" ? "catalogue" : cols[i]] = answers[i].data || [];
    }
  }
  async function load(force = false) {
    if (store.loading || store.busy) return;
    if (!force && store.ready && Date.now() - store.lastLoad < 45000) return;
    store.loading = true; store.error = "";
    if (route === "challenges") renderChallengesUI();
    try {
      const userId = await identity();
      store.userId = userId;
      await syncExistingMatches(userId);
      await fetchAll();
      store.ready = true;
      store.lastLoad = Date.now();
    } catch (e) {
      console.error("MATCHPULSE M1", e);
      store.error = e?.message || "Impossibile collegarsi a Supabase.";
    } finally {
      store.loading = false;
      if (route === "challenges") renderChallengesUI();
      if (route === "home") refreshHomeWallet();
    }
  }
  function roleLock(ctx) {
    const lock = store.locks.find(x => x.user_id === store.userId
      && x.season_id === ctx.season && x.week_key === ctx.week);
    return lock?.role || currentRole();
  }
  function periodicKey(ch, ctx) {
    return ch.scope === "milestone" ? ctx.season : ctx.week;
  }
  function isClaimed(ch, ctx) {
    const key = periodicKey(ch, ctx);
    return store.claims.some(x => x.challenge_id === ch.id && x.season_id === ctx.season
      && x.period_key === key && x.user_id === store.userId);
  }
  function eligibleEvents(ch, ctx) {
    return store.events.filter(m => m.user_id === store.userId
      && m.match_date >= ctx.seasonStart && m.match_date < ctx.seasonEnd
      && (ch.scope === "milestone" || (m.match_date >= ctx.week && m.match_date < isoPlusDays(ctx.week,7))));
  }
  function isoPlusDays(date, days) {
    const d = new Date(`${date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0,10);
  }
  function progress(ch, ctx) {
    if (ch.metric === "manual") {
      const row = store.manual.find(x => x.challenge_id === ch.id
        && x.season_id === ctx.season && x.period_key === periodicKey(ch,ctx)
        && x.user_id === store.userId);
      return digits(row?.progress);
    }
    const events = eligibleEvents(ch, ctx);
    const lock = roleLock(ctx);
    const filtered = ch.metric.startsWith("role_")
      ? events.filter(m => m.role === lock) : events;
    const count = (fn) => filtered.reduce((acc,m) => acc + fn(m), 0);
    switch (ch.metric) {
      case "played": case "role_played": return filtered.length;
      case "wins": case "role_wins": return count(m => m.outcome === "Vittoria" ? 1 : 0);
      case "goals": case "role_goals": return count(m => digits(m.goals));
      case "assists": case "role_assists": return count(m => digits(m.assists));
      case "contributions": case "role_contributions":
        return count(m => digits(m.goals) + digits(m.assists));
      default: return 0;
    }
  }
  function wallet(ctx) {
    return store.ledger.filter(x => x.user_id === store.userId && x.season_id === ctx.season)
      .reduce((sum,x) => sum + (Number(x.amount) || 0), 0);
  }
  function challengeCards(scope, ctx) {
    const lockedRole = roleLock(ctx);
    const list = store.catalogue.filter(ch => ch.active !== false && ch.scope === scope
      && (scope !== "role" || ch.role === lockedRole))
      .sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0));
    if (!list.length) return '<div class="mp-m1-empty">Nessuna sfida disponibile in questa categoria.</div>';
    return list.map(ch => {
      const value = progress(ch, ctx);
      const goal = Math.max(1, digits(ch.target));
      const done = isClaimed(ch, ctx);
      const ratio = Math.min(100, Math.floor(value / goal * 100));
      return `<article class="mp-m1-challenge ${done ? "is-claimed" : ""}">
        <div class="mp-m1-challenge-head">
          <div><strong>${html(ch.title)}</strong><p>${html(ch.description)}</p></div>
          <span class="mp-m1-reward">✦ ${digits(ch.reward)} token</span>
        </div>
        <div class="mp-m1-progress-line"><span style="width:${ratio}%"></span></div>
        <div class="mp-m1-challenge-foot">
          <span class="mp-m1-count">${Math.min(value, goal)} / ${goal}</span>
          ${ch.metric === "manual" && !done ? `<div class="mp-m1-stepper">
            <button type="button" ${store.busy || !value ? "disabled" : ""} onclick="mpM1Adjust('${ch.id}',-1)" aria-label="Sottrai una azione">−</button>
            <button type="button" ${store.busy || value >= goal ? "disabled" : ""} onclick="mpM1Adjust('${ch.id}',1)" aria-label="Aggiungi una azione">+</button>
            </div>` : ""}
          <button class="mp-m1-redeem" type="button" ${store.busy || done || value < goal ? "disabled" : ""}
            onclick="mpM1Claim('${ch.id}')">${done ? "Riscattato ✓" : "Riscatta"}</button>
        </div>
      </article>`;
    }).join("");
  }
  function renderChallengesUI() {
    if (!MAIN) return;
    const ctx = timeContext();
    const tabs = [
      ["weekly", "Settimanali"], ["role", "Di ruolo"], ["milestone", "Traguardi"]
    ];
    MAIN.innerHTML = `<section class="mp-m1-page mp-m1-challenges-page">
      <div class="mp-m1-heading"><div><p class="mp-m1-kicker">MATCHPULSE / OBIETTIVI</p>
       <h2>LE TUE SFIDE</h2><p>Gioca, completa gli obiettivi e riscatta token.</p></div>
       <div class="mp-m1-token"><small>SALDO STAGIONALE</small><strong>✦ ${store.ready ? wallet(ctx) : "—"}</strong></div></div>
      <div class="mp-m1-overview">
       <span>STAGIONE ${ctx.season.replace("-","/")}</span>
       <span>${store.tab === "milestone" ? "Nessuna scadenza nella stagione" : "Reset settimanale: lunedì 00:00 · Roma"}</span>
      </div>
      <div class="mp-m1-tabs" role="tablist">${tabs.map(([id,label]) =>
        `<button type="button" role="tab" aria-selected="${store.tab === id}" class="${store.tab === id ? "active" : ""}" onclick="mpM1Tab('${id}')">${label}</button>`).join("")}</div>
      ${store.error ? `<div class="mp-m1-error"><strong>Configurazione sfide necessaria</strong><p>${html(store.error)}</p><button type="button" onclick="mpM1Retry()">Riprova</button></div>` : ""}
      ${store.loading && !store.ready ? '<div class="mp-m1-loading">Caricamento delle sfide…</div>' : ""}
      ${store.ready ? `<div class="mp-m1-challenges-list">${challengeCards(store.tab,ctx)}</div>` : ""}
      ${store.ready && store.tab === "role" ? `<div class="mp-m1-hint">Ruolo di questa settimana: <strong>${html(ROLE_LABELS[roleLock(ctx)])}</strong>. Rimane bloccato fino al prossimo lunedì per evitare riscatti multipli.</div>` : ""}
      ${store.ready && store.tab === "milestone" ? '<div class="mp-m1-hint">Le azioni speciali si registrano con i pulsanti + e −. I traguardi si riscattano una sola volta per stagione.</div>' : ""}
    </section>`;
  }
  function refreshHomeWallet() {
    const el = document.querySelector("[data-m1-wallet]");
    if (el) el.textContent = store.ready ? String(wallet(timeContext())) : "—";
  }
  async function perform(fn) {
    if (store.busy || store.loading) return;
    store.busy = true;
    if (route === "challenges") renderChallengesUI();
    try {
      await fn();
      await fetchAll();
      store.ready = true; store.error = ""; store.lastLoad = Date.now();
    } catch (e) {
      console.error("MATCHPULSE M1 action", e);
      if (typeof toast === "function") toast(e.message || "Operazione non riuscita");
    } finally {
      store.busy = false;
      if (route === "challenges") renderChallengesUI();
      refreshHomeWallet();
    }
  }
  window.mpM1Tab = id => {
    if (!["weekly", "role", "milestone"].includes(id)) return;
    store.tab = id;
    renderChallengesUI();
  };
  window.mpM1Adjust = (id, delta) => perform(async () => {
    if (!store.catalogue.some(ch => ch.id === id && ch.metric === "manual")) return;
    const {error} = await client().rpc("mp_m1_adjust_manual", {
      p_challenge_id: id, p_delta: delta
    });
    if (error) throw error;
  });
  window.mpM1Claim = id => perform(async () => {
    const {data, error} = await client().rpc("mp_m1_claim", {p_challenge_id: id});
    if (error) throw error;
    if (typeof toast === "function") toast(`+${data?.tokens || 0} token riscattati!`);
  });
  window.mpM1Retry = () => load(true);
  function renderChallenges() {
    renderChallengesUI();
    void load(false);
  }
  function renderMatchesHub() {
    const all = typeof getMatches === "function" ? getMatches() : [];
    const ordered = [...all].sort((a,b) => String(b.date||"").localeCompare(String(a.date||"")));
    const last = ordered[0];
    MAIN.innerHTML = `<section class="mp-m1-page">
      <div class="mp-m1-heading"><div><p class="mp-m1-kicker">MATCHPULSE / CARRIERA</p><h2>PARTITE</h2>
      <p>Tutte le tue prestazioni, in un unico posto.</p></div></div>
      <div class="mp-m1-hub-grid">
        <button class="mp-m1-hub-primary" onclick="setRoute('new')"><span>＋</span><strong>NUOVA PARTITA</strong><small>Registra la prestazione</small></button>
        <button class="mp-m1-hub-tile" onclick="setRoute('history')"><span>▤</span><strong>STORICO</strong><small>${all.length} partite registrate</small></button>
        <button class="mp-m1-hub-tile" onclick="setRoute('stats')"><span>◫</span><strong>STATISTICHE</strong><small>Grafici e record</small></button>
      </div>
      ${last ? `<div class="mp-m1-panel"><span class="mp-m1-kicker">ULTIMA PARTITA</span>
        <h3>${html(last.result || "Partita giocata")}</h3>
        <p>${html(last.date || "")}${last.outcome ? ` · ${html(last.outcome)}` : ""}</p>
        <div class="mp-m1-inline-stats"><span>${digits(last.goals)} GOL</span><span>${digits(last.assists)} ASSIST</span></div>
        <button class="mp-m1-link" onclick="setRoute('history')">Apri lo storico →</button></div>` : ""}
    </section>`;
  }
  function renderStorePreview() {
    MAIN.innerHTML = `<section class="mp-m1-page mp-m1-store-preview">
      <div class="mp-m1-heading"><div><p class="mp-m1-kicker">MATCHPULSE / MARKET</p>
      <h2>NEGOZIO</h2><p>Le estetiche e i pacchetti arriveranno con il Macroblocco 2.</p></div>
      <div class="mp-m1-token"><small>I TUOI TOKEN</small><strong>✦ <span data-m1-wallet>${store.ready ? wallet(timeContext()) : "—"}</span></strong></div></div>
      <div class="mp-m1-panel mp-m1-store-hero"><span class="mp-m1-kicker">PROSSIMAMENTE</span>
      <h3>LA TUA CARTA. IL TUO STILE.</h3><p>Skin, collezioni tematiche e pacchetti animati. Nessun boost alle statistiche.</p>
      <button type="button" onclick="setRoute('challenges')">Guadagna token dalle Sfide →</button></div>
    </section>`;
    if (!store.ready) void load(false);
  }
  function mountHome() {
    const home = MAIN.querySelector(".premium-home");
    if (!home) return;
    home.classList.add("mp-m1-home");
    home.querySelectorAll(".home-achievements-card, .home-trend-card, .home-action-grid, .action-grid-premium").forEach(el => el.remove());
    const title = `<div class="mp-m1-home-top"><div><p class="mp-m1-kicker">MATCHPULSE ULTIMATE TEAM</p>
      <h2>LA TUA CARRIERA</h2><span>La tua carta. Le tue partite. Le tue sfide.</span></div>
      <div class="mp-m1-token"><small>TOKEN</small><strong>✦ <span data-m1-wallet>${store.ready ? wallet(timeContext()) : "—"}</span></strong></div></div>`;
    home.insertAdjacentHTML("afterbegin", title);
    home.insertAdjacentHTML("beforeend", `<div class="mp-m1-home-links">
      <button onclick="setRoute('matches')"><span>⚽</span><strong>PARTITE</strong><small>Registra e consulta</small></button>
      <button onclick="setRoute('challenges')"><span>✦</span><strong>SFIDE</strong><small>Ottieni token</small></button>
      <button onclick="setRoute('playstyles')"><span>◇</span><strong>PLAYSTYLE</strong><small>La tua specialità</small></button>
      <button onclick="setRoute('promos')"><span>✧</span><strong>PROMO</strong><small>Le tue carte speciali</small></button>
    </div>`);
    const month = home.querySelector(".home-mini-grid");
    if (month) month.insertAdjacentHTML("beforebegin", '<div class="mp-m1-section-caption">IL TUO RIEPILOGO</div>');
    if (!store.ready) void load(false);
  }

  // Il progetto originale contiene render() concatenati per Club/Promo/PlayStyles.
  // Li preserviamo delegando solo le nuove rotte e pulendo la Home DOPO i vecchi wrapper.
  // I record personali erano nella vecchia pagina Focus: li trasferiamo in Stats.
  const previousStats = renderStats;
  renderStats = function (...args) {
    const result = previousStats.apply(this, args);
    if (typeof goalsPageRecords === "function" && MAIN &&
        !MAIN.querySelector(".mp-m1-records")) {
      const records = goalsPageRecords(getMatches());
      MAIN.insertAdjacentHTML("beforeend", `<section class="mp-m1-records">
        <p class="mp-m1-kicker">ARCHIVIO CARRIERA</p><h2>RECORD PERSONALI</h2>
        ${records}</section>`);
    }
    return result;
  };
  window.renderStats = renderStats;
  const previousHome = renderHome;
  renderHome = function (...args) {
    const result = previousHome.apply(this, args);
    mountHome();
    return result;
  };
  window.renderHome = renderHome;
  const previousRender = render;
  render = function (...args) {
    if (route === "matches") return renderMatchesHub();
    if (route === "challenges" || route === "goals") return renderChallenges();
    if (route === "store") return renderStorePreview();
    return previousRender.apply(this, args);
  };
  window.render = render;
  // Mantiene attiva Partite anche nelle pagine figlie (Nuova/Storico/Stats/Dettaglio).
  const previousSetRoute = setRoute;
  setRoute = function (next, id = null) {
    const newRoute = next === "goals" ? "challenges" : next;
    const result = previousSetRoute(newRoute, id);
    if (NAV) {
      const tab = ["new","history","stats","detail"].includes(newRoute) ? "matches" : newRoute;
      NAV.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.route === tab));
    }
    return result;
  };
  window.setRoute = setRoute;
  // Se una partita viene eliminata, rimuoviamo il solo mirror Sfide su Supabase.
  if (typeof deleteMatch === "function") {
    const previousDelete = deleteMatch;
    deleteMatch = async function (id, ...args) {
      const existed = (getMatches() || []).some(m => String(m.id) === String(id));
      const result = await previousDelete.call(this, id, ...args);
      if (existed && !(getMatches() || []).some(m => String(m.id) === String(id))) {
        try {
          const userId = await identity();
          const {error} = await client().from(AUTH_TABLES.events).delete()
            .eq("user_id", userId).eq("match_id", String(id));
          if (error) throw error;
          store.ready = false; store.lastLoad = 0;
        } catch (e) { console.warn("Mirror Sfide: partita non rimossa dal cloud", e); }
      }
      return result;
    };
    window.deleteMatch = deleteMatch;
  }
  if (NAV) NAV.classList.add("mp-m1-nav");
  window.MP_M1_READY = true;
  window.mpM1Inspect = () => ({ version: CLIENT_VERSION, season: timeContext().season,
    week: timeContext().week, role: roleLock(timeContext()),
    backendReady: store.ready, backendError: store.error,
    challenges: store.catalogue.length, wallet: wallet(timeContext()) });
  if (typeof render === "function") render();
})();
