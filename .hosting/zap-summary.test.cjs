// node .hosting/zap-summary.test.cjs — every ZAP finding fails the website scan,
// Informational included (Lisa, 2026-10-18); decided findings are listed, not counted.
'use strict';

const assert = require('assert');
const { summarize } = require('./zap-summary.cjs');

const report = (alerts) => ({ site: [{ alerts }] });
const alert = (riskcode, name, pluginid = '1') => ({
  pluginid, name, riskcode: String(riskcode), cweid: '-1',
  instances: [{ method: 'GET', uri: 'https://triplemoongoddess.com/' }],
});
let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`✓ ${name}`); }

test('an Informational-only scan fails', () => {
  const r = summarize(report([alert(0, 'Info only')]), 'T', []);
  assert.strictEqual(r.rc, 1);
  assert.ok(r.subject.startsWith('🚨 FAILED — T: High 0, Medium 0, Low 0, Informational 1'));
});

test('a Low finding fails', () => {
  assert.strictEqual(summarize(report([alert(1, 'Low one')]), 'T', []).rc, 1);
});

test('no findings passes', () => {
  const r = summarize(report([]), 'T', []);
  assert.strictEqual(r.rc, 0);
  assert.ok(r.subject.startsWith('passed'));
});

test('a decided finding is listed, not counted', () => {
  const d = [{ pluginid: '9', name: 'Decided', kind: 'accepted', decided: 'Lisa, 2026-10-14', note: 'why' }];
  const r = summarize(report([alert(0, 'Decided', '9')]), 'T', d);
  assert.strictEqual(r.rc, 0);
  assert.ok(/Decided by Lisa/.test(r.md) && /Accepted/.test(r.md));
});

console.log(`zap-summary: ${passed} passed`);
