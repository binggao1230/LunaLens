// Expert "Find touchdown windows" panel: period controls, ranked candidates, and in-place A/B
// comparison. Rendering only; every number comes from engine/scenario.js and engine/search.js.
import { t } from '../i18n.js';
import { escapeHtml, fmtDateTime, isoDate, fmtTime } from '../format.js';
import {
  HOUR_MS, DAY_MS, STAY_CHOICES, makeRequest, availableYears,
} from '../engine/scenario.js';
import { searchTouchdowns, scanSite, displayGroups, stayStats, eligibleMask } from '../engine/search.js';

const $ = (id) => document.getElementById(id);
const pct = (n, d) => `${((100 * n) / Math.max(1, d)).toFixed(1)}%`;
const num = (n) => Number(n).toLocaleString('en-US');
const signed = (n, unit = '') => `${n > 0 ? '+' : n < 0 ? '−' : ''}${num(Math.abs(n))}${unit}`;

export function createExpert(ctx) {
  const ui = {
    mode: 'year', year: null, half: 1, dayMs: null, hourMs: null,
    startMs: null, endMs: null, ranking: 'flexibility', compareMode: null,
    pins: { A: null, B: null }, result: null, seq: 0, ready: false, searching: false,
  };

  function bounds() { return ctx.bounds(); }

  function defaults() {
    const b = bounds();
    const now = ctx.landing();
    const years = availableYears(b);
    ui.year = years.includes(new Date(now).getUTCFullYear()) ? new Date(now).getUTCFullYear() : years[years.length - 1];
    ui.half = new Date(now).getUTCMonth() < 6 ? 1 : 2;
    ui.dayMs = Math.floor(now / DAY_MS) * DAY_MS;
    ui.hourMs = Math.floor(now / HOUR_MS) * HOUR_MS;
    ui.startMs = Math.floor(now / DAY_MS) * DAY_MS;
    ui.endMs = ui.startMs + DAY_MS;
  }

  /** The five entry modes build one request object; the evaluator never sees the UI. */
  function buildRequest() {
    if (ui.mode === 'year') return makeRequest({ kind: 'year', year: ui.year });
    if (ui.mode === 'half') return makeRequest({ kind: 'half', year: ui.year, half: ui.half });
    if (ui.mode === 'day') return makeRequest({ kind: 'day', touchdownMs: ui.dayMs });
    if (ui.mode === 'hour') return makeRequest({ kind: 'hour', touchdownMs: ui.hourMs });
    // A date-only end is inclusive in the UI and maps to the following midnight.
    return makeRequest({ kind: 'range', startMs: ui.startMs, endMs: ui.endMs });
  }

  function modeFields() {
    const isYear = ui.mode === 'year' || ui.mode === 'half';
    $('ex-yearWrap').hidden = !isYear;
    $('ex-halfWrap').hidden = ui.mode !== 'half';
    $('ex-dayWrap').hidden = ui.mode !== 'day';
    $('ex-hourWrap').hidden = ui.mode !== 'hour';
    $('ex-startWrap').hidden = ui.mode !== 'range';
    $('ex-endWrap').hidden = ui.mode !== 'range';
  }

  function refreshInputs() {
    const b = bounds();
    const years = availableYears(b);
    $('ex-mode').innerHTML = [['year', 'Full year'], ['half', 'Half year'], ['day', 'One day'], ['hour', 'Exact hour'], ['range', 'Custom range']]
      .map(([v, label]) => `<option value="${v}"${ui.mode === v ? ' selected' : ''}>${escapeHtml(t(label))}</option>`).join('');
    $('ex-half').innerHTML = [['1', 'Jan – Jun'], ['2', 'Jul – Dec']]
      .map(([v, label]) => `<option value="${v}"${String(ui.half) === v ? ' selected' : ''}>${escapeHtml(t(label))}</option>`).join('');
    $('ex-year').innerHTML = years.map((y) => `<option value="${y}"${y === ui.year ? ' selected' : ''}>${y}</option>`).join('');
    $('ex-day').value = isoDate(ui.dayMs);
    $('ex-hour').value = `${isoDate(ui.hourMs)}T${fmtTime(ui.hourMs)}`;
    $('ex-start').value = isoDate(ui.startMs);
    $('ex-end').value = isoDate(ui.endMs - DAY_MS);
    $('ex-stay').innerHTML = STAY_CHOICES.map((s) => `<option value="${s.key}"${ctx.stayKey() === s.key ? ' selected' : ''}>${escapeHtml(t(s.label))}</option>`).join('');
    $('ex-margin').innerHTML = [2, 5].map((v) => `<option value="${v}"${ctx.margin() === v ? ' selected' : ''}>${v}°</option>`).join('');
    $('ex-sun').value = String(ctx.conditions().requiredSunH);
    $('ex-earth').checked = ctx.conditions().requireEarthAtTouchdown;
    $('ex-years-note').textContent = t('Data covers {first} to {last}.', {
      first: isoDate(b.firstMs), last: isoDate(b.lastMs),
    });
    modeFields();
  }

  function coverageText(r) {
    const c = r.coverage;
    if (!c) return '';
    const req = `${num(c.requestedHours)} ${t('hourly starts')}`;
    if (c.state === 'none') return t('No covered start in this request. Requested {req}.', { req });
    const ev = `${num(c.evaluatedHours)} ${t('hourly starts')}`;
    const limit = t('The latest complete touchdown is {time}.', { time: fmtDateTime(c.latestTouchdownMs) });
    if (c.state === 'full') return t('Requested {req}; evaluated {ev}. {limit}', { req, ev, limit });
    return t('Requested {req}; evaluated only {ev}, {omitted} omitted because a full stay no longer fits the data. {limit}', {
      req, ev, omitted: num(c.omittedHours), limit,
    });
  }

  function reasonText(site, conditions, coverage) {
    return t(conditions.requireEarthAtTouchdown
      ? 'Earth clears {margin}° at touchdown; {sun} h of continuous sunlight from touchdown; the whole {stay} h stay is covered by the data.'
      : 'Earth visibility at touchdown is optional; {sun} h of continuous sunlight from touchdown; the whole {stay} h stay is covered by the data.', {
      margin: conditions.marginDeg, sun: conditions.requiredSunH, stay: conditions.stayH,
    }) + (coverage?.state === 'partial' ? ` ${t('Only the evaluated part of the requested period was searched.')}` : '');
  }

  function windowLabel(g, conditions) {
    const first = fmtDateTime(g.startMs), last = fmtDateTime(g.endMs);
    return t('{first} → {last} · {count} sampled starts · representative {rep} · {overlap} h Sun+Earth', {
      first, last, count: num(g.starts), rep: fmtDateTime(g.representative.ms), overlap: num(g.representative.bothH),
    });
  }

  function pinButton(pin, g, site, period) {
    const start = period ? ` data-start="${period.startMs}" data-end="${period.endMs}"` : '';
    return `<button type="button" class="ex-pin" data-act="pin${pin}" data-site="${escapeHtml(site.id)}" data-ms="${g.representative.ms}"${start}
      aria-label="${escapeHtml(t('Pin {label} as {pin}', { label: fmtDateTime(g.representative.ms), pin }))}">${pin}</button>`;
  }

  function renderResults() {
    const host = $('ex-results');
    const r = ui.result;
    if (!r) { host.innerHTML = ''; $('ex-status').textContent = ''; return; }
    $('ex-status').innerHTML = `<b>${escapeHtml(t('Ranking'))}: ${escapeHtml(t(ui.ranking === 'flexibility' ? 'schedule flexibility' : 'Sun+Earth overlap'))}</b>
      <div class="seg ex-rank" role="group" aria-label="${escapeHtml(t('Ranking preference'))}">
        <button type="button" data-rank="flexibility" aria-pressed="${ui.ranking === 'flexibility'}" class="${ui.ranking === 'flexibility' ? 'on' : ''}">${escapeHtml(t('More eligible starts'))}</button>
        <button type="button" data-rank="overlap" aria-pressed="${ui.ranking === 'overlap'}" class="${ui.ranking === 'overlap' ? 'on' : ''}">${escapeHtml(t('Maximize overlap'))}</button>
      </div>
      <p class="ex-cov">${escapeHtml(coverageText(r))}</p>`;

    if (r.state === 'invalid') {
      host.innerHTML = `<p class="ex-empty">${escapeHtml(r.errors.map((e) => t(e.message)).join(' ') || t('Invalid search.'))}</p>`;
      return;
    }
    if (r.state === 'no-coverage') {
      host.innerHTML = `<p class="ex-empty">${escapeHtml(t('No complete stay fits inside the data for this request. Nothing was evaluated, so this is not a no-match result.'))}</p>`;
      return;
    }
    if (r.state === 'no-match') {
      host.innerHTML = `<p class="ex-empty">${escapeHtml(t('Every evaluated start fails at least one condition. The failing conditions below are counted over the evaluated starts; one start can fail more than one.'))}</p>` + failureList(r.unranked, r.conditions);
      return;
    }

    const best = r.candidates[0];
    const cards = r.candidates.map((site, i) => `<article class="ex-card">
      <div class="ex-cardhead"><b>${i + 1} · ${escapeHtml(t(site.name))}</b>
        <span class="badge">${escapeHtml(t(i === 0 ? (ui.ranking === 'flexibility' ? 'Best schedule flexibility' : 'Best Sun+Earth overlap') : 'Qualifies'))}</span></div>
      <p class="sub">${escapeHtml(site.terrain)} · ${escapeHtml(t('{n} h overlap in the representative stay', { n: site.representative.bothH }))}</p>
      <div class="ex-stats">
        <div><b>${num(site.eligibleCount)}</b><span>${escapeHtml(t('eligible starts'))} · ${pct(site.eligibleCount, r.searchedStarts)}</span></div>
        <div><b>${num(site.widestGroup)} h</b><span>${escapeHtml(t('widest window'))}</span></div>
        <div><b>${fmtDateTime(site.representative.ms)}</b><span>${escapeHtml(t('representative touchdown'))}</span></div>
      </div>
      <p class="ex-why">${escapeHtml(reasonText(site, r.conditions, r.coverage))}</p>
      <div class="ex-windows">${displayGroups(site).map((g) => `<div class="ex-window">
        <span>${escapeHtml(windowLabel(g, r.conditions))}</span>
        ${pinButton('A', g, site, r.request.evaluated)}${pinButton('B', g, site, r.request.evaluated)}
        <button type="button" class="ex-open" data-act="open" data-site="${escapeHtml(site.id)}" data-ms="${g.representative.ms}">${escapeHtml(t('Inspect'))}</button>
        <button type="button" class="btn-primary ex-use" data-act="choose" data-site="${escapeHtml(site.id)}" data-ms="${g.representative.ms}" aria-label="${escapeHtml(t('Use {time} at {site} in Globe', { time: fmtDateTime(g.representative.ms), site: t(site.name) }))}">${escapeHtml(t('Use this date'))}<span aria-hidden="true"> →</span></button>
      </div>`).join('')}</div>
    </article>`).join('');

    const failed = r.unranked.length ? `<details class="ex-failed"><summary>${escapeHtml(t('Terrain sites with no qualifying start ({n})', { n: r.unranked.length }))}</summary>${failureList(r.unranked, r.conditions)}</details>` : '';
    const refs = r.reference.length ? `<p class="ex-ref">${escapeHtml(t('Smooth-sphere references, never ranked: {list}', { list: r.reference.map((s) => t(s.name)).join(' · ') }))}</p>` : '';
    host.innerHTML = cards + failed + refs + `<p class="ex-best">${escapeHtml(t('First place: {name}. {reason}', { name: t(best.name), reason: reasonText(best, r.conditions, r.coverage) }))}</p>`;
  }

  function failureList(list, conditions) {
    return `<ul class="ex-fail">${list.map((s) => `<li><b>${escapeHtml(t(s.name))}</b>: ${escapeHtml(t('no continuous {sun} h of sunlight from touchdown at {sunFails} starts; Earth below the {margin}° margin at {earthFails}; stay not covered at {covFails}.', {
      sun: conditions.requiredSunH, sunFails: num(s.failures.sun), margin: conditions.marginDeg, earthFails: num(s.failures.earth), covFails: num(s.failures.coverage),
    }))}</li>`).join('')}</ul>`;
  }

  /* ---------- comparison ---------- */

  function siteById(id) { return ctx.sites().find((s) => s.id === id) ?? null; }

  function pinData(pin) {
    const site = siteById(pin.siteId);
    if (!site) return null;
    const conditions = ctx.conditions();
    const st = stayStats(site, Math.round((pin.ms - bounds().firstMs) / bounds().stepMs), conditions);
    const index = Math.round((pin.ms - bounds().firstMs) / bounds().stepMs);
    const range = pin.start != null ? { startIndex: Math.round((pin.start - bounds().firstMs) / bounds().stepMs), endIndex: Math.round((pin.end - bounds().firstMs) / bounds().stepMs) } : null;
    const scan = range ? scanSite(site, { evaluated: range }, conditions) : null;
    if (scan) scan.range = range;
    return { pin, site, st, index, range, scan, conditions };
  }

  function timeline(site, index, conditions, label) {
    const { series } = site;
    const h = conditions.stayH, w = 300, rowH = 12;
    let marks = '';
    for (let k = 0; k < h; k++) {
      const i = index + k;
      if (i >= series.n) break;
      if (series.sunVis[i] === 1) marks += `<rect x="${k}" y="0" width="1" height="${rowH}" fill="var(--sun)" opacity=".85"/>`;
      if (series.earthClr[i] > conditions.marginDeg) marks += `<rect x="${k}" y="${rowH + 2}" width="1" height="${rowH}" fill="var(--earth)" opacity=".85"/>`;
    }
    return `<figure class="ex-tl"><figcaption>${escapeHtml(label)}</figcaption>
      <svg viewBox="0 0 ${h} ${rowH * 2 + 2}" preserveAspectRatio="none" role="img" aria-label="${escapeHtml(t('Sunlight and Earth link over the stay'))}">${marks}</svg>
      <span class="ex-tl-scale">${escapeHtml(t('elapsed hours'))} 0 → ${h}</span></figure>`;
  }

  function csvCell(value) {
    const text = String(value ?? '');
    return `"${text.replaceAll('"', '""')}"`;
  }

  function comparisonCsv(a, b) {
    const headers = ['record_type', 'elapsed_hour', 'metric', 'unit', 'A_value', 'B_value', 'B_minus_A',
      'A_utc', 'B_utc', 'A_site', 'B_site', 'A_sun_visible', 'B_sun_visible',
      'A_earth_above_margin', 'B_earth_above_margin', 'A_sun_elevation_deg', 'B_sun_elevation_deg',
      'A_earth_elevation_deg', 'B_earth_elevation_deg', 'earth_margin_deg', 'stay_hours',
      'required_continuous_sun_hours', 'earth_at_touchdown_required'];
    const rows = [headers];
    const put = (values) => rows.push(headers.map((key) => csvCell(values[key] ?? '')).join(','));
    const summary = [
      [t('Sun+Earth overlap'), a.st.bothH, b.st.bothH],
      [t('Sunlight in the stay'), a.st.sunH, b.st.sunH],
      [t('Earth link in the stay'), a.st.earthH, b.st.earthH],
      [t('Continuous sun from touchdown'), a.st.sunFromTouchdownH, b.st.sunFromTouchdownH],
      [t('Longest darkness'), a.st.longestDarkH, b.st.longestDarkH],
      [t('Longest no-Earth gap'), a.st.longestNoEarthH, b.st.longestNoEarthH],
    ];
    for (const [metric, av, bv] of summary) put({ record_type: 'summary', metric, unit: 'h', A_value: av, B_value: bv, B_minus_A: bv - av });
    const conditions = a.conditions;
    const n = Math.min(conditions.stayH, a.site.series.n - a.index, b.site.series.n - b.index);
    for (let elapsed = 0; elapsed < n; elapsed++) {
      const ai = a.index + elapsed, bi = b.index + elapsed;
      const as = a.site.series, bs = b.site.series;
      put({
        record_type: 'hourly', elapsed_hour: elapsed,
        A_utc: new Date(a.pin.ms + elapsed * HOUR_MS).toISOString(),
        B_utc: new Date(b.pin.ms + elapsed * HOUR_MS).toISOString(),
        A_site: t(a.site.name), B_site: t(b.site.name),
        A_sun_visible: as.sunVis[ai] === 1, B_sun_visible: bs.sunVis[bi] === 1,
        A_earth_above_margin: as.earthClr[ai] > conditions.marginDeg,
        B_earth_above_margin: bs.earthClr[bi] > conditions.marginDeg,
        A_sun_elevation_deg: as.sunEl[ai].toFixed(4), B_sun_elevation_deg: bs.sunEl[bi].toFixed(4),
        A_earth_elevation_deg: as.earthEl[ai].toFixed(4), B_earth_elevation_deg: bs.earthEl[bi].toFixed(4),
        earth_margin_deg: conditions.marginDeg, stay_hours: conditions.stayH,
        required_continuous_sun_hours: conditions.requiredSunH,
        earth_at_touchdown_required: conditions.requireEarthAtTouchdown,
      });
    }
    return `\uFEFF${rows.join('\r\n')}`;
  }

  function exportComparison(a, b) {
    const blob = new Blob([comparisonCsv(a, b)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lunalens-comparison-${isoDate(a.pin.ms)}-vs-${isoDate(b.pin.ms)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function stayCompare(a, b) {
    const rows = [
      [t('Sun+Earth overlap'), a.st.bothH, b.st.bothH, t('h')],
      [t('Sunlight in the stay'), a.st.sunH, b.st.sunH, t('h')],
      [t('Earth link in the stay'), a.st.earthH, b.st.earthH, t('h')],
      [t('Continuous sun from touchdown'), a.st.sunFromTouchdownH, b.st.sunFromTouchdownH, t('h')],
      [t('Longest darkness'), a.st.longestDarkH, b.st.longestDarkH, t('h')],
      [t('Longest no-Earth gap'), a.st.longestNoEarthH, b.st.longestNoEarthH, t('h')],
    ];
    const sameUhr = a.pin.ms === b.pin.ms;
    const head = sameUhr
      ? t('Same touchdown {time}; two sites under the same stay and conditions.', { time: fmtDateTime(a.pin.ms) })
      : a.site === b.site
        ? t('Two windows at {site}; both stay lengths and conditions are identical.', { site: t(a.site.name) })
        : t('Two sites at different touchdowns under identical stay lengths and conditions.');
    return `<h3>${escapeHtml(t('Compare A and B'))}</h3>
      <p class="sub">${escapeHtml(head)}</p>
      <p class="ex-cond">${escapeHtml(t('Conditions for both: {stay} h stay, {margin}° Earth margin, {sun} h continuous sun from touchdown, Earth at touchdown {state}.', {
        stay: a.conditions.stayH, margin: a.conditions.marginDeg, sun: a.conditions.requiredSunH, state: t(a.conditions.requireEarthAtTouchdown ? 'required' : 'not required'),
      }))}</p>
      <table class="ex-table"><thead><tr><th></th><th>A · ${escapeHtml(t(a.site.name))}<br><span class="sub">${escapeHtml(fmtDateTime(a.pin.ms))}</span></th>
      <th>B · ${escapeHtml(t(b.site.name))}<br><span class="sub">${escapeHtml(fmtDateTime(b.pin.ms))}</span></th><th>${escapeHtml(t('B − A'))}</th></tr></thead>
      <tbody>${rows.map(([name, x, y, unit]) => `<tr><th>${escapeHtml(name)}</th><td>${num(x)} ${unit}</td><td>${num(y)} ${unit}</td><td class="${y - x < 0 ? 'neg' : 'pos'}">${signed(y - x, ` ${unit}`)}</td></tr>`).join('')}</tbody></table>
      <div class="ex-compare-actions"><button type="button" class="ex-export" data-act="export-csv">${escapeHtml(t('Export hourly comparison CSV'))}</button></div>
      <div class="ex-tls">${timeline(a.site, a.index, a.conditions, `A · ${t(a.site.name)} · ${fmtDateTime(a.pin.ms)}`)}${timeline(b.site, b.index, b.conditions, `B · ${t(b.site.name)} · ${fmtDateTime(b.pin.ms)}`)}</div>`;
  }

  function rangeCompare(a, b) {
    const samePeriod = a.range.startIndex === b.range.startIndex && a.range.endIndex === b.range.endIndex;
    const rep = (scan) => (scan.representative ? fmtDateTime(scan.representative.ms) : t('none'));
    const share = (scan) => pct(scan.eligibleCount, scan.range.endIndex - scan.range.startIndex);
    const rows = [
      [t('Eligible starts'), num(a.scan.eligibleCount), num(b.scan.eligibleCount)],
      [t('Share of its own evaluated hours'), share(a.scan), share(b.scan)],
      [t('Widest window'), String(a.scan.widestGroup), String(b.scan.widestGroup)],
      [t('Representative touchdown'), rep(a.scan), rep(b.scan)],
      [t('Sun+Earth overlap in that stay'), String(a.scan.representative?.bothH ?? 0), String(b.scan.representative?.bothH ?? 0)],
    ];
    const denom = a.range.endIndex - a.range.startIndex;
    let common = '';
    if (samePeriod) {
      const from = a.range.startIndex, to = a.range.endIndex;
      const ma = eligibleMask(a.site, from, to, a.conditions).mask;
      const mb = eligibleMask(b.site, from, to, b.conditions).mask;
      let both = 0;
      for (let i = 0; i < ma.length; i++) if (ma[i] && mb[i]) both++;
      common = both ? t('{n} UTC starts are eligible at both sites ({share} of the shared {denom} evaluated hours).', { n: num(both), share: pct(both, denom), denom: num(denom) })
        : t('The two sites share no eligible UTC start in this period.');
    } else if (a.site === b.site) {
      common = t('The two windows are compared with their own denominators; no rate is transferred from one period to the other.');
    } else {
      const lo = Math.max(a.range.startIndex, b.range.startIndex), hi = Math.min(a.range.endIndex, b.range.endIndex);
      if (hi > lo) {
        const ma = eligibleMask(a.site, lo, hi, a.conditions).mask, mb = eligibleMask(b.site, lo, hi, b.conditions).mask;
        let both = 0;
        for (let i = 0; i < ma.length; i++) if (ma[i] && mb[i]) both++;
        common = both ? t('{n} UTC starts are eligible at both sites in the overlapping part of the two ranges.', { n: num(both) }) : t('The two ranges overlap but share no eligible UTC start.');
      } else common = t('The two ranges do not overlap; their counts are not combined.');
    }
    return `<h3>${escapeHtml(t('Compare A and B'))}</h3>
      <p class="sub">${escapeHtml(t('Period comparison. Each range keeps its own evaluated denominator; representatives are labelled with their own UTC date.'))}</p>
      <p class="ex-cond">${escapeHtml(t('A: {site} · {from} → {to}. B: {siteB} · {fromB} → {toB}.', {
        site: t(a.site.name), from: isoDate(a.pin.start), to: isoDate(a.pin.end - HOUR_MS),
        siteB: t(b.site.name), fromB: isoDate(b.pin.start), toB: isoDate(b.pin.end - HOUR_MS),
      }))}</p>
      <table class="ex-table"><thead><tr><th></th><th>A · ${escapeHtml(t(a.site.name))}</th><th>B · ${escapeHtml(t(b.site.name))}</th></tr></thead>
      <tbody>${rows.map(([name, x, y]) => `<tr><th>${escapeHtml(name)}</th><td>${escapeHtml(String(x))}</td><td>${escapeHtml(String(y))}</td></tr>`).join('')}</tbody></table>
      <p class="ex-common">${escapeHtml(common)}</p>`;
  }
  function renderCompare() {
    const host = $('ex-compare');
    const { A, B } = ui.pins;
    const chip = (pin, name) => pin
      ? `<span class="ex-chip"><b>${name}</b> ${escapeHtml(t(pin.siteName))} · ${escapeHtml(fmtDateTime(pin.ms))} <button type="button" data-act="clear${name}" aria-label="${escapeHtml(t('Clear pin {pin}', { pin: name }))}">×</button></span>`
      : `<span class="ex-chip empty">${escapeHtml(t('{pin} not pinned', { pin: name }))}</span>`;
    if (!A || !B) {
      host.innerHTML = `<h3>${escapeHtml(t('Compare A and B'))}</h3><p class="ex-pins">${chip(A, 'A')}${chip(B, 'B')}</p><p class="sub">${escapeHtml(t('Pin two windows from the results to compare them here. Nothing is retyped.'))}</p>`;
      return;
    }
    const a = pinData(A), b = pinData(B);
    if (!a || !b) { host.innerHTML = ''; return; }
    if (A.siteId === B.siteId && A.ms === B.ms) {
      host.innerHTML = `<h3>${escapeHtml(t('Compare A and B'))}</h3><p class="ex-pins">${chip(A, 'A')}${chip(B, 'B')}</p><p class="sub">${escapeHtml(t('A and B are the same site and touchdown. Pin another window or site to compare.'))}</p>`;
      return;
    }
    // Same touchdown means an hourly A/B; different touchdowns default to the period comparison,
    // and the reader can force the hourly view over the same frozen pins.
    const bothRanges = A.start != null && B.start != null && A.ms !== B.ms;
    const mode = ui.compareMode === 'hour' ? 'hour' : ui.compareMode === 'period' ? 'period' : (bothRanges && A.siteId !== B.siteId ? 'period' : 'hour');
    const toggle = bothRanges ? `<div class="seg ex-rank" role="group" aria-label="${escapeHtml(t('Comparison mode'))}">
      <button type="button" data-cmode="hour" aria-pressed="${mode === 'hour'}" class="${mode === 'hour' ? 'on' : ''}">${escapeHtml(t('Touchdown A/B'))}</button>
      <button type="button" data-cmode="period" aria-pressed="${mode === 'period'}" class="${mode === 'period' ? 'on' : ''}">${escapeHtml(t('Period'))}</button></div>` : '';
    host.innerHTML = `<p class="ex-pins">${chip(A, 'A')}${chip(B, 'B')}</p>${toggle}` + (mode === 'period' ? rangeCompare(a, b) : stayCompare(a, b));
  }

  /* ---------- wiring ---------- */

  function run() {
    const seq = ++ui.seq;
    ui.searching = true;
    $('ex-run').disabled = true;
    $('ex-results').setAttribute('aria-busy', 'true');
    for (const button of $('ex-results').querySelectorAll('button')) button.disabled = true;
    $('ex-status').textContent = t('Searching {description}…', { description: t(ui.mode === 'hour' ? 'the exact hour' : ui.mode === 'day' ? 'one day' : ui.mode === 'half' ? 'half a year' : ui.mode === 'year' ? 'a full year' : 'the custom range') });
    const request = buildRequest();
    setTimeout(() => {
      if (seq !== ui.seq) return;
      const result = searchTouchdowns({ sites: ctx.sites(), request, bounds: bounds(), conditions: ctx.conditions(), ranking: ui.ranking });
      if (seq !== ui.seq) return;
      ui.result = result;
      ui.searching = false;
      $('ex-run').disabled = false;
      $('ex-results').setAttribute('aria-busy', 'false');
      renderResults();
      renderCompare();
      ctx.announce?.(result);
    }, 0);
  }

  function pin(pinName, el) {
    const site = siteById(el.dataset.site);
    if (!site) return;
    const ms = Number(el.dataset.ms);
    const label = fmtDateTime(ms);
    ui.pins[pinName] = {
      siteId: site.id, siteName: site.name, ms,
      start: el.dataset.start ? Number(el.dataset.start) : null,
      end: el.dataset.end ? Number(el.dataset.end) : null,
    };
    ctx.setTouchdown(ms);
    ctx.selectSite(site.id);
    renderCompare();
    ctx.toast?.(t('Pinned {pin}: {name} · {time}', { pin: pinName, name: t(site.name), time: label }));
  }

  function mount() {
    defaults();
    refreshInputs();
    $('ex-mode').onchange = (e) => { ui.mode = e.target.value; modeFields(); refreshInputs(); };
    $('ex-year').onchange = (e) => { ui.year = Number(e.target.value); };
    $('ex-half').onchange = (e) => { ui.half = Number(e.target.value); };
    $('ex-day').onchange = (e) => { const ms = Date.parse(`${e.target.value}T00:00:00Z`); if (!Number.isNaN(ms)) ui.dayMs = ms; };
    $('ex-hour').onchange = (e) => { const ms = Date.parse(`${e.target.value}Z`); if (!Number.isNaN(ms)) ui.hourMs = ms; };
    $('ex-start').onchange = (e) => { const ms = Date.parse(`${e.target.value}T00:00:00Z`); if (!Number.isNaN(ms)) ui.startMs = ms; };
    $('ex-end').onchange = (e) => { const ms = Date.parse(`${e.target.value}T00:00:00Z`); if (!Number.isNaN(ms)) ui.endMs = ms + DAY_MS; };
    $('ex-stay').onchange = (e) => { ctx.setStay(e.target.value); };
    $('ex-margin').onchange = (e) => { ctx.setMargin(Number(e.target.value)); };
    $('ex-sun').onchange = (e) => { const n = Number(e.target.value); if (Number.isInteger(n) && n >= 0) ctx.setSunHours(n); };
    $('ex-earth').onchange = (e) => { ctx.setRequireEarth(e.target.checked); };
    $('ex-run').onclick = run;
    $('expert').addEventListener('click', (e) => {
      const rank = e.target.closest('[data-rank]');
      if (rank) { ui.ranking = rank.dataset.rank; run(); return; }
      const cmode = e.target.closest('[data-cmode]');
      if (cmode) { ui.compareMode = cmode.dataset.cmode; renderCompare(); return; }
      const act = e.target.closest('[data-act]');
      if (!act) return;
      const a = act.dataset.act;
      if (ui.searching && ['pinA', 'pinB', 'open', 'choose'].includes(a)) return;
      if (a === 'export-csv') {
        const { A, B } = ui.pins;
        const left = A && pinData(A), right = B && pinData(B);
        if (left && right) exportComparison(left, right);
      }
      else if (a === 'pinA') pin('A', act);
      else if (a === 'pinB') pin('B', act);
      else if (a === 'clearA') { ui.pins.A = null; renderCompare(); }
      else if (a === 'clearB') { ui.pins.B = null; renderCompare(); }
      else if (a === 'choose') {
        const result = ui.result;
        const candidate = result?.candidates.find((site) => site.id === act.dataset.site);
        const touchdownMs = Number(act.dataset.ms);
        if (!candidate?.groups.some((group) => group.representative?.ms === touchdownMs)) return;
        ctx.chooseWindow?.({ siteId: candidate.id, touchdownMs, conditions: { ...result.conditions } });
      }
      else if (a === 'open') {
        const site = siteById(act.dataset.site);
        if (!site) return;
        ctx.setTouchdown(Number(act.dataset.ms));
        ctx.selectSite(site.id);
        ctx.scrollToPanorama?.();
      }
    });
    ui.ready = true;
    renderCompare();
  }

  return {
    mount,
    /** Window/site changes keep the result; a condition change re-runs both consistently. */
    render() {
      if (!ui.ready) return;
      refreshInputs();
      const c = ctx.conditions();
      const old = ui.result?.conditions;
      const changed = old && (old.stayH !== c.stayH || old.marginDeg !== c.marginDeg || old.requiredSunH !== c.requiredSunH || old.requireEarthAtTouchdown !== c.requireEarthAtTouchdown);
      if (changed) run();
      else if (!ui.searching) renderResults();
      renderCompare();
    },
    refreshInputs,
    run,
    clear() { ui.pins = { A: null, B: null }; ui.result = null; renderResults(); renderCompare(); },
  };
}
