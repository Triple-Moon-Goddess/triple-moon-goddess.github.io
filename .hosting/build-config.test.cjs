// node .hosting/build-config.test.cjs — the events page is readable by exactly one
// app origin (the admin Reading Reconciliation report), never '*' (Lisa, 2026-10-18).
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { buildConfig, PROD_APP } = require('./build-config.cjs');

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

console.log(`build-config: ${passed} passed`);
