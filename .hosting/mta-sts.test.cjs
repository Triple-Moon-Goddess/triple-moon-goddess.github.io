// node .hosting/mta-sts.test.cjs — the MTA-STS policy (audit ADD-50) is valid,
// names Google's MX, and reaches the built site and the Firebase upload.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { buildConfig } = require('./build-config.cjs');

const root = path.join(__dirname, '..');
let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`✓ ${name}`); }

/** RFC 8461 section 3.2: "key: value" lines. */
function parsePolicy(text) {
  const out = {};
  for (const line of text.split(/\r?\n/).filter(Boolean)) {
    const m = line.match(/^([a-z_]+): (.+)$/);
    assert.ok(m, `bad policy line: ${line}`);
    assert.ok(!(m[1] in out) || m[1] === 'mx', `duplicate key: ${m[1]}`);
    out[m[1]] = m[1] === 'mx' ? [...(out.mx || []), m[2]] : m[2];
  }
  return out;
}

const policy = parsePolicy(fs.readFileSync(path.join(root, '.well-known', 'mta-sts.txt'), 'utf8'));

test('policy has exactly version, mode, mx and max_age', () => {
  assert.deepStrictEqual(Object.keys(policy).sort(), ['max_age', 'mode', 'mx', 'version']);
  assert.strictEqual(policy.version, 'STSv1');
});

test('mode is testing or enforce', () => {
  assert.ok(['testing', 'enforce'].includes(policy.mode), policy.mode);
});

test('mx is Google Workspace mail (matches the MX record 1 smtp.google.com)', () => {
  assert.deepStrictEqual(policy.mx, ['smtp.google.com']);
});

test('max_age is a day to a year', () => {
  const n = Number(policy.max_age);
  assert.ok(Number.isInteger(n) && n >= 86400 && n <= 31557600, policy.max_age);
});

test('Jekyll is told to include the .well-known folder', () => {
  const config = fs.readFileSync(path.join(root, '_config.yml'), 'utf8');
  assert.match(config, /^include:\s*\n(\s+-\s+.*\n)*\s+-\s+\.well-known\s*$/m);
});

test('the Firebase ignore list does not drop /.well-known/mta-sts.txt', () => {
  const site = fs.mkdtempSync(path.join(os.tmpdir(), 'tmg-site-'));
  fs.writeFileSync(path.join(site, 'index.html'), '<p>home</p>');
  const { config } = buildConfig(site);
  // firebase-tools globs **/* with dot:true; a pattern only drops this file if it
  // names .well-known or ends in a folder-wide /** under a dot folder.
  for (const p of config.hosting.ignore) {
    assert.ok(!/well-known/.test(p) && !/^\*\*\/\.[^/]*\/\*\*$/.test(p), `ignore pattern ${p} would drop the policy`);
  }
});

console.log(`${passed} passed`);
