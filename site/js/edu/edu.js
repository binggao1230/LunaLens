// Education mode: a six-step guided story on the Mission page (objective → site → launch → anomaly → fix → done).
// The mode itself lives in ../mode.js and is chosen in the top bar or on the start page. The start page shows the
// guide's greeting itself (views/mission.js); this controller takes over when the Mission page opens in Education
// mode. It drives the existing views through the small API in views/mission.js and judges sites with edu/verdict.js.
// All story text comes from i18n/story.<lang>.json so the team can edit it without touching code.
import { escapeHtml } from '../format.js';
import { isEducation, onMode } from '../mode.js';
import { switchMode } from '../mode-transition.js';
import { CHARACTER_MARKUP } from './character.js';
import { assess, isOk, findBreakingDelay, findGoDelay, bestNearby, BATTERY_H, BATTERY_BONUS_H } from './verdict.js';

// Steps of the story; history (the flags of past landings) sits between the objective and the site pick.
const STEP = { objective: 1, history: 2, site: 3, launch: 4, anomaly: 5, fix: 6, done: 7 };
const DAY = 864e5, TOTAL = 7;
const fmt = (s, v = {}) => String(s ?? '').replace(/\{(\w+)\}/g, (m, k) => (v[k] ?? m));

/** ctx: { mission, sites, eph, landing, setLanding, margin, showView, view, language, toast } */
export function createEducation(ctx) {
  const root = document.getElementById('edu');
  const stories = new Map();
  const st = {
    active: isEducation(), skipped: false, story: null, step: 0, sub: 0, hold: false, focus: false, key: '',
    probe: 'apollo', picked: null, status: null, say: null, mood: 'happy',
    base: null, delay: 0, relay: false, bonus: 0, waited: null, moved: null, anomaly: null, tried: false, name: '',
  };

  async function load(lang) {
    if (!stories.has(lang)) {
      try {
        const response = await fetch(`i18n/story.${lang}.json`);
        if (!response.ok) throw new Error(String(response.status));
        stories.set(lang, await response.json());
      } catch {
        stories.set(lang, lang === 'en' ? null : await load('en'));
      }
    }
    return stories.get(lang);
  }
  const get = (path) => path.split('.').reduce((o, k) => o?.[k], st.story);
  const ui = (path, v) => fmt(get(`ui.${path}`), v);
  const line = (path, v) => fmt(get(`steps.${path}`), { name: get('character.name'), ...v });
  const idx = (ms) => Math.round(ctx.eph().indexOf(ms));
  const opts = () => ({ batteryH: (BATTERY_H[st.probe] ?? 48) + st.bonus, relay: st.relay, margin: ctx.margin() });
  const current = () => (st.picked ? assess(st.picked, idx(ctx.landing()), opts()) : null);
  const say = (path, values = {}, mood) => { st.say = { path, values }; if (mood) st.mood = mood; };
  const setStep = (n, sub = 0) => { st.step = n; st.sub = sub; st.focus = true; };
  const moodFor = () => (st.status ? (st.status.sun && st.status.link ? 'happy' : st.status.sun || st.status.link ? 'worried' : 'sleeping') : 'happy');
  const introLines = () => get('steps.objective.intro') ?? [];

  /* ---------- mode and story lifecycle ---------- */

  function reset() {
    Object.assign(st, { skipped: false, step: 0, sub: 0, base: null, delay: 0, relay: false, bonus: 0, waited: null, moved: null, anomaly: null, tried: false, hold: false, say: null, mood: 'happy' });
  }
  /** Step 1, the objective: starts whenever the Mission page opens in Education mode with no story running. */
  function startTour() {
    reset();
    st.probe = ctx.mission.probe();
    setStep(1); say('objective.intro.0', {}, 'happy');
    render();
  }
  function activate() {
    st.active = true;
    document.body.classList.add('edu-on');
    if (ctx.view() === 'mission') startTour(); else render();
  }
  function deactivate() {
    st.active = false; reset();
    document.body.classList.remove('edu-on');
    root.innerHTML = ''; st.key = '';
  }
  onMode((mode) => { if (mode === 'education') activate(); else deactivate(); });
  if (st.active) document.body.classList.add('edu-on');

  /* ---------- story steps ---------- */

  function enterHistory() { setStep(STEP.history); say('history.intro', {}, 'happy'); render(); ctx.mission.flags?.(); }
  function enterSite() {
    setStep(STEP.site); ctx.mission.flags?.();
    const o = opts(), list = ctx.sites(), ok = (ms) => list.some((s) => isOk(assess(s, idx(ms), o).verdict));
    if (!ok(ctx.landing())) {
      for (let d = 1; d <= 30; d++) {
        if (ok(ctx.landing() + d * DAY)) { st.hold = true; ctx.setLanding(ctx.landing() + d * DAY); say('site.darkWeek', {}, 'worried'); render(); return; }
      }
    }
    say('site.intro', {}, 'happy'); render();
  }
  function enterLaunch() {
    st.base = ctx.landing();
    setStep(STEP.launch); say('launch.cheer', {}, 'celebrating'); render();
    ctx.mission.send();
  }
  function enterAnomaly() {
    const hit = findBreakingDelay(st.picked, idx(st.base), opts());
    // Step and anomaly are set first so the timeline redraw below already carries the highlight.
    setStep(STEP.anomaly); say(hit ? 'anomaly.delay' : 'anomaly.contact', {}, 'worried');
    if (hit) {
      st.delay = hit.days;
      st.anomaly = { kind: hit.result.reason === 'earth' ? 'earth' : 'night', days: hit.days };
      ctx.setLanding(st.base + hit.days * DAY);
    } else {
      st.anomaly = { kind: 'contact', days: 0 };
      ctx.mission.setHour(Math.max(0, current()?.quietFrom ?? 0));
    }
    render();
  }
  function enterFix() { setStep(STEP.fix); say('fix.intro', {}, 'worried'); render(); }
  function enterDone() { setStep(STEP.done); say('done.cheer', {}, 'celebrating'); render(); }

  function next() {
    if (st.step === 1) {
      if (st.sub < introLines().length - 1) { st.sub++; st.focus = true; say(`objective.intro.${st.sub}`, {}, 'happy'); render(); } else enterHistory();
    } else if (st.step === STEP.history) enterSite();
    else if (st.step === STEP.site) { if (isOk(current()?.verdict)) enterLaunch(); }
    else if (st.step === STEP.anomaly) {
      if (st.anomaly.kind !== 'contact' && st.sub === 0) { st.sub = 1; st.focus = true; say(`anomaly.${st.anomaly.kind}`, { site: st.picked.short }, 'worried'); render(); }
      else enterFix();
    } else if (st.step === STEP.fix) { if (canComplete()) enterDone(); }
  }
  function back() {
    if (st.step === 1 && st.sub > 0) { st.sub--; st.focus = true; say(`objective.intro.${st.sub}`, {}, 'happy'); render(); }
    else if (st.step === STEP.history) { const last = Math.max(0, introLines().length - 1); setStep(STEP.objective, last); say(`objective.intro.${last}`, {}, 'happy'); render(); }
    else if (st.step === STEP.site) enterHistory();
  }
  const canComplete = () => current()?.verdict === 'go' && (st.anomaly?.kind !== 'contact' || st.tried);

  function lever(kind) {
    st.tried = true;
    const o = opts();
    if (kind === 'move') {
      if (st.moved) { const from = st.moved.from; st.moved = null; ctx.mission.pick(from); }
      else {
        const best = bestNearby(ctx.sites(), st.picked, idx(ctx.landing()), o);
        if (!best) return;
        st.moved = { from: st.picked.id, to: best.site.id }; ctx.mission.pick(best.site.id);
      }
    } else if (kind === 'wait') {
      if (st.waited != null) { st.waited = null; st.delay = st.anomaly.days; }
      else {
        const d = findGoDelay(st.picked, idx(st.base), st.delay, o);
        if (d == null) { say('fix.noWait', {}, 'worried'); render(); return; }
        st.waited = d; st.delay = d;
      }
      ctx.setLanding(st.base + st.delay * DAY);
    } else if (kind === 'relay') st.relay = !st.relay;
    else if (kind === 'battery') st.bonus = st.bonus ? 0 : BATTERY_BONUS_H;
    if (current()?.verdict === 'go') say('fix.go', {}, 'celebrating'); else say(`fix.${kind}`, {}, 'worried');
    ctx.mission.redraw(); // the timeline highlight follows the verdict
    render();
  }

  /* ---------- rendering ---------- */

  const visible = () => st.active && st.story && st.step > 0 && ctx.view() === 'mission';

  function leversHtml(r) {
    const best = st.moved ? null : bestNearby(ctx.sites(), st.picked, idx(ctx.landing()), opts());
    const card = (kind, on, title, hint, disabled = false) => `<button type="button" class="edu-lever${on ? ' on' : ''}" data-lever="${kind}" aria-pressed="${on}" ${disabled ? 'disabled' : ''}>
      <b>${escapeHtml(title)}</b><span>${escapeHtml(hint)}</span>${on ? `<i>${escapeHtml(ui('levers.undo'))}</i>` : ''}</button>`;
    return `<div class="edu-levers">
      ${card('move', !!st.moved, ui('levers.move'), st.moved ? ui('levers.moveTo', { site: st.picked.short }) : best ? ui('levers.moveTo', { site: best.site.short }) : ui('levers.moveNone'), !st.moved && !best)}
      ${card('wait', st.waited != null, ui('levers.wait'), ui('levers.waitHint'))}
      ${card('relay', st.relay, ui('levers.relay'), ui('levers.relayHint'))}
      ${card('battery', st.bonus > 0, ui('levers.battery'), ui('levers.batteryHint'))}
    </div>`;
  }

  function finalHtml(r) {
    const nightDays = r.nightH / 24;
    const night = nightDays < 1 ? ui('final.underDay') : ui('final.days', { n: nightDays.toFixed(nightDays < 10 ? 1 : 0) });
    const learned = (get('ui.final.learned') ?? []).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
    return `<div class="edu-final-wrap"><section class="edu-final" role="dialog" aria-modal="true" aria-labelledby="edu-final-title">
      <div class="edu-char mood-celebrating">${CHARACTER_MARKUP}</div>
      <h2 id="edu-final-title" tabindex="-1">${escapeHtml(ui('final.title'))}</h2>
      <p class="edu-final-site">${escapeHtml(ui('final.site', { site: st.picked.label }))}</p>
      <div class="edu-stats">
        <div><b>${Math.round(r.sunPct)}%</b><span>${escapeHtml(ui('final.sun'))}</span></div>
        <div><b>${Math.round(r.earthPct)}%</b><span>${escapeHtml(ui('final.earth'))}</span></div>
        <div><b>${escapeHtml(night)}</b><span>${escapeHtml(ui('final.night'))}</span></div>
      </div>
      <h3>${escapeHtml(ui('final.learnedTitle'))}</h3><ul>${learned}</ul>
      <div class="edu-badge">
        <div class="edu-badge-art" aria-hidden="true">★</div>
        <div><b>${escapeHtml(ui('final.badge'))}</b><span>${escapeHtml(ui('final.awarded', { name: st.name.trim() || ui('final.namePlaceholder') }))}</span></div>
      </div>
      <label class="edu-name">${escapeHtml(ui('final.namePrompt'))}<input type="text" id="edu-name" maxlength="40" value="${escapeHtml(st.name)}" placeholder="${escapeHtml(ui('final.namePlaceholder'))}" autocomplete="given-name"></label>
      <p class="edu-note">${escapeHtml(ui('final.note'))}</p>
      <div class="edu-actions"><button type="button" class="btn-primary" data-act="again">${escapeHtml(ui('playAgain'))}</button><button type="button" class="btn-ghost" data-act="expert">${escapeHtml(ui('expert'))}</button></div>
    </section></div>`;
  }

  function render() {
    if (!visible()) { root.innerHTML = ''; st.key = ''; return; }
    const r = st.step >= STEP.site ? current() : null;
    if (st.skipped) {
      const key = `skip|${ctx.language()}`;
      if (key !== st.key) {
        st.key = key;
        root.innerHTML = `<div class="edu-mini"><div class="edu-char mood-happy">${CHARACTER_MARKUP}</div>
          <button type="button" class="btn-ghost" data-act="replay">${escapeHtml(ui('replay'))}</button>
          <button type="button" class="btn-ghost" data-act="expert">${escapeHtml(ui('expert'))}</button></div>`;
      }
      return;
    }
    if (st.step === STEP.done) {
      const key = `final|${ctx.language()}|${st.name}`;
      if (key !== st.key) { st.key = key; root.innerHTML = finalHtml(r); if (st.focus) { st.focus = false; root.querySelector('#edu-final-title')?.focus({ preventScroll: true }); } }
      return;
    }
    const text = line(st.say.path, st.say.values);
    const key = [st.step, st.sub, text, st.mood, r?.verdict, st.relay, st.bonus, st.delay, st.moved?.to, st.waited, st.picked?.id, ctx.language(), st.step === STEP.fix && canComplete()].join('|');
    if (key === st.key) return;
    st.key = key;
    // Back and Next are on every step. Next is green when the story can move on, grey and locked when not.
    const LOCK = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg>';
    const btn = (act, label, enabled) => `<button type="button" class="${act === 'next' ? 'edu-next' : 'btn-ghost'}" data-act="${act}" ${enabled ? '' : 'disabled aria-disabled="true"'}>${act === 'next' && !enabled ? LOCK : ''}${escapeHtml(label)}</button>`;
    const canBack = (st.step === STEP.objective && st.sub > 0) || st.step === STEP.history || st.step === STEP.site;
    let nextLabel = ui('next'), canNext = true;
    if (st.step === STEP.site) { nextLabel = ui('continue'); canNext = isOk(r?.verdict); }
    else if (st.step === STEP.launch) canNext = false;
    else if (st.step === STEP.anomaly) nextLabel = st.anomaly.kind !== 'contact' && st.sub === 0 ? ui('whatHappened') : ui('fixIt');
    else if (st.step === STEP.fix) { nextLabel = ui('complete'); canNext = canComplete(); }
    const actions = btn('back', ui('back'), canBack) + btn('next', nextLabel, canNext);
    const skip = st.step === STEP.launch ? '' : `<button type="button" class="edu-skip" data-act="skip">${escapeHtml(ui('skip'))}</button>`;
    // Only the first intro line fills the page, and it shows the astronaut dog artwork instead of the mood poses.
    const full = st.step === STEP.objective && st.sub === 0;
    const art = full
      ? `<div class="edu-char edu-hero"><img src="assets/mascot/astronaut_dog_moon.svg" alt="" draggable="false"></div>`
      : `<div class="edu-char mood-${st.mood}">${CHARACTER_MARKUP}</div>`;
    root.innerHTML = `<aside class="edu-panel step-${st.step}${full ? ' full' : ''}" role="complementary" aria-label="${escapeHtml(ui('panel'))}">
      ${art}
      <div class="edu-bubble">
        <div class="edu-top"><span class="edu-step">${escapeHtml(ui('step', { n: st.step, total: TOTAL }))}</span></div>
        <p class="edu-text" id="edu-text" tabindex="-1" aria-live="polite"><b class="edu-speaker">${escapeHtml(get('character.name') ?? 'Lumi')}</b>${escapeHtml(text)}</p>
        ${st.step === STEP.fix ? leversHtml(r) : ''}
        <div class="edu-actions">${actions}${skip}</div>
      </div>
    </aside>`;
    if (st.focus) { st.focus = false; root.querySelector('#edu-text')?.focus({ preventScroll: true }); }
  }

  root.addEventListener('click', (event) => {
    const lv = event.target.closest('[data-lever]');
    if (lv) return lever(lv.dataset.lever);
    const act = event.target.closest('[data-act]')?.dataset.act;
    if (!act) return;
    if (act === 'next') next();
    else if (act === 'back') back();
    else if (act === 'skip') { st.skipped = true; render(); }
    else if (act === 'replay') startTour();
    else if (act === 'again') { reset(); ctx.showView('start'); } // choose a lander again; the story restarts on the Mission page
    else if (act === 'expert') switchMode('expert', event.target.closest('[data-act]'));
  });
  root.addEventListener('input', (event) => { if (event.target.id === 'edu-name') { st.name = event.target.value; st.key = ''; const el = root.querySelector('.edu-badge span'); if (el) el.textContent = ui('final.awarded', { name: st.name.trim() || ui('final.namePlaceholder') }); } });

  load(ctx.language()).then((story) => { st.story = story; if (st.active && st.step === 0 && ctx.view() === 'mission') startTour(); else render(); });

  return {
    get active() { return st.active; },
    /** The Mission page opened: begin the story if none is running, otherwise keep showing the current step. */
    onView(v) {
      if (st.active && v === 'mission' && st.step === 0) startTour(); else render();
    },
    /** Validate / "Start the mission" on the start page: the story always restarts at step 1. */
    onValidate() { if (st.active) reset(); },
    onProbePick(id) { st.probe = id; },
    onMissionRefresh(site, frame) {
      st.picked = site; st.status = site ? frame.status.get(site.id) ?? null : null;
      if (!st.active || st.skipped || !st.story) return;
      if (st.step === STEP.site) {
        if (st.hold) { st.hold = false; return; }
        const r = current(); let mood = moodFor(), path = `site.${mood}`;
        if (r?.neverLit) { path = 'site.shadow'; mood = 'sleeping'; } else if (isOk(r?.verdict)) path = 'site.ready';
        say(path, { site: site.short }, mood); render();
      } else if (st.step === STEP.anomaly || st.step === STEP.fix) render();
    },
    onArrived() { if (st.active && !st.skipped && st.step === STEP.launch) enterAnomaly(); },
    highlight() {
      if (!st.active || st.skipped || st.step < STEP.anomaly || st.step > STEP.fix || !st.picked || !st.anomaly) return null;
      const r = current();
      if (!r || r.verdict === 'go') return null;
      const run = st.anomaly.kind === 'night' ? [r.nightFrom, r.nightH] : [r.quietFrom, r.quietH];
      return run[1] ? { id: st.picked.id, from: run[0], to: run[0] + run[1] } : null;
    },
    async setLanguage(lang) { st.story = await load(lang); st.key = ''; render(); },
    /** A historic-site card opened (lesson) or closed (null): Lumi's pose follows the lesson. */
    react(lesson) {
      if (!st.active) return;
      if (lesson === null) { if (st.moodBase) { st.mood = st.moodBase; st.moodBase = null; } }
      else { st.moodBase ??= st.mood; st.mood = lesson === 'sun' || lesson === 'night' ? 'worried' : 'happy'; }
      st.key = ''; render();
    },
    /** Flags the history step points at. */
    highlightFlags() { return st.active && !st.skipped && st.step === STEP.history ? ['apollo11', 'im2'] : []; },
  };
}
