// node .hosting/build-config.test.cjs — the events page is readable by exactly one
// app origin (the admin Reading Reconciliation report), never '*' (Lisa, 2026-10-18).
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { buildConfig, PROD_APP, OLD_PAGE_REDIRECTS } = require('./build-config.cjs');

const DEV_APP = 'https://triple-moon-goddess-dev.web.app';
const site = fs.mkdtempSync(path.join(os.tmpdir(), 'tmg-site-'));
fs.writeFileSync(path.join(site, 'index.html'), '<p>home</p>');
fs.writeFileSync(path.join(site, 'events.html'), '<p>events</p>');

const acaoFor = (config, source) => {
  const block = config.hosting.headers.find((h) => h.source === source);
  return block && block.headers.find((h) => h.key === 'Access-Control-Allow-Origin')?.value;
};
let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`✓ ${name}`); }

test('the live site lets the prod app read events.html and /events', () => {
  const { config } = buildConfig(site);
  assert.strictEqual(acaoFor(config, '/events.html'), PROD_APP);
  assert.strictEqual(acaoFor(config, '/events'), PROD_APP);
});

test('the dev copy lets the dev app read it instead', () => {
  const { config } = buildConfig(site, { appOrigin: DEV_APP });
  assert.strictEqual(acaoFor(config, '/events.html'), DEV_APP);
});

test('no page is readable by any origin (no wildcard), and only the events page is readable at all', () => {
  const { config } = buildConfig(site);
  const all = config.hosting.headers.flatMap((h) => h.headers.filter((x) => x.key === 'Access-Control-Allow-Origin').map((x) => [h.source, x.value]));
  assert.ok(all.every(([, v]) => v !== '*'));
  assert.deepStrictEqual(all.map(([s]) => s).sort(), ['/events', '/events.html']);
});

test('an unknown app origin is refused', () => {
  assert.throws(() => buildConfig(site, { appOrigin: 'https://evil.example' }), /unknown app origin/);
});

test('old-site addresses are permanent (301) redirects to a page the site builds', () => {
  const pagesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tmg-site-'));
  for (const f of ['index.html', 'practitioners.html', 'online-readings.html']) fs.writeFileSync(path.join(pagesDir, f), '<p>x</p>');
  const { config } = buildConfig(pagesDir);
  assert.deepStrictEqual(config.hosting.redirects, [
    { source: '/practitioner', destination: '/practitioners.html', type: 301 },
    { source: '/astrology', destination: '/online-readings.html', type: 301 },
    { source: '/relationship', destination: '/online-readings.html', type: 301 },
    { source: '/tarot', destination: '/online-readings.html', type: 301 },
    { source: '/oracle', destination: '/online-readings.html', type: 301 },
    { source: '/naLogImpressions', destination: '/', type: 301 },
    { source: '/legal/PRIVACY_CHANGELOG.html', destination: '/privacy.html', type: 301 },
    { source: '/home', destination: '/', type: 301 },
    { source: '/home/', destination: '/', type: 301 },
  ]);
  const repo = path.join(__dirname, '..');
  for (const r of OLD_PAGE_REDIRECTS) {
    const page = r.destination === '/' ? '/index.html' : r.destination;
    assert.ok(fs.existsSync(path.join(repo, page)), `${r.destination} is not a page in the repo`);
  }
});

test('every old address Search Console reported as 404 (2026-11-15) now redirects', () => {
  const reported = ['/practitioner', '/oracle', '/relationship', '/astrology', '/naLogImpressions', '/tarot', '/legal/PRIVACY_CHANGELOG.html'];
  const sources = OLD_PAGE_REDIRECTS.map((r) => r.source);
  for (const u of reported) assert.ok(sources.includes(u), `${u} still 404s`);
});

test('a redirect never shadows a live page', () => {
  const repo = path.join(__dirname, '..');
  for (const r of OLD_PAGE_REDIRECTS) {
    const file = r.source.endsWith('.html') ? r.source : r.source.endsWith('/') ? `${r.source}index.html` : `${r.source}.html`;
    assert.ok(!fs.existsSync(path.join(repo, file)), `${file} exists, so ${r.source} must not redirect`);
    assert.ok(!fs.existsSync(path.join(repo, r.source, 'index.html')), `${r.source}/index.html exists, so ${r.source} must not redirect`);
  }
});

test('the old /home address is a 301 to the homepage, not a noindex page (Search Console 2026-11-16)', () => {
  for (const source of ['/home', '/home/']) {
    assert.deepStrictEqual(OLD_PAGE_REDIRECTS.find((r) => r.source === source), { source, destination: '/' });
  }
});

test('no page but 404.html carries a noindex tag', () => {
  const repo = path.join(__dirname, '..');
  const flagged = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === '_site') continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.html') && /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(fs.readFileSync(p, 'utf8'))) flagged.push(path.relative(repo, p));
    }
  };
  walk(repo);
  assert.deepStrictEqual(flagged, ['404.html']);
});

console.log(`build-config: ${passed} passed`);
