// Pre-submission check. Reads the public site and the repository and reports what would stop a judge.
//
//   node site/tools/preflight.mjs [public-url]
//
// Exit code 0 when every check passes, 1 otherwise. Nothing here writes or deploys.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
const url = process.argv[2] ?? 'https://luna-lens.gaobing1230.workers.dev/';

let failed = 0;
const ok = (label, detail = '') => console.log(`  PASS  ${label}${detail ? `  ${detail}` : ''}`);
const bad = (label, detail = '') => { failed++; console.log(`  FAIL  ${label}${detail ? `  ${detail}` : ''}`); };

console.log(`preflight: ${url}`);

// 1. Public reachability without a login.
try {
  const res = await fetch(url, { redirect: 'manual' });
  const location = res.headers.get('location') ?? '';
  if (res.status >= 300 && res.status < 400 && /access|login|cloudflareaccess/.test(location)) {
    bad('site is behind a login', `${res.status} → ${location.split('?')[0]}`);
  } else if (res.status === 200) {
    ok('site answers without a login', `${res.status}`);
  } else {
    bad('site answered unexpectedly', String(res.status));
  }
  const page = res.status === 200 ? await res.text() : '';
  if (page) {
    if (/nasa-logo/.test(page)) bad('page references the NASA logo asset');
    else ok('no NASA logo reference in the page');
    if (!/LunaLens/.test(page)) bad('page has no LunaLens text');
  }
} catch (error) {
  bad('site unreachable', error.message);
}

// 2. The pieces a judge needs, on disk.
for (const [label, path] of [
  ['submission text', 'doc/SUBMISSION.md'],
  ['challenge text kept', 'doc/Background.md'],
  ['TODO current', 'TODO.md'],
  ['Atlas page build', 'site/atlas/index.html'],
  ['app bundle', 'site/js/app.js'],
]) {
  if (!existsSync(join(ROOT, path))) { bad(`missing ${label}`, path); continue; }
  if (path === 'site/js/app.js' && /__lunaDebug/.test(readFileSync(join(ROOT, path), 'utf8'))) bad('debug hook left in app.js');
  else ok(label);
}

// 3. Text the rules require to be present somewhere in the submission draft.
const draft = existsSync(join(ROOT, 'doc/SUBMISSION.md')) ? readFileSync(join(ROOT, 'doc/SUBMISSION.md'), 'utf8') : '';
for (const [label, pattern] of [
  ['Super Intelligence disclosure', /Super Intelligence/],
  ['NASA data list', /NASA data/i],
  ['demo within limits', /seven slides|30-second/i],
  ['final-project link', /luna-lens\.gaobing1230\.workers\.dev/],
  ['sunlight validation quoted', /rank correlation 0\.98/i],
]) {
  if (pattern.test(draft)) ok(label); else bad(label);
}

// 4. Repository size, against the free plan's per-file limit.
const atlasFiles = existsSync(join(ROOT, 'site/atlas')) ? 'present' : 'missing';
ok('atlas build', atlasFiles);

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
