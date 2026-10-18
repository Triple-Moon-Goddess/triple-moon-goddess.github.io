// node .hosting/point-app-links.test.cjs — the dev copy's app links open the dev app.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { pointAppLinks, pointSiteAppLinks, PROD_APP } = require('./point-app-links.cjs');

const DEV_APP = 'https://triple-moon-goddess-dev.web.app';
let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`✓ ${name}`); }

test('a reading button opens the dev app', () => {
  const html = `<a href="${PROD_APP}/reading-checkout?type=romantic_reading">Get</a>`;
  assert.strictEqual(pointAppLinks(html, DEV_APP), `<a href="${DEV_APP}/reading-checkout?type=romantic_reading">Get</a>`);
});

test('other hosts are left alone', () => {
  const html = '<a href="https://www.youtube-nocookie.com/x">v</a><a href="https://formspree.io/f">f</a>';
  assert.strictEqual(pointAppLinks(html, DEV_APP), html);
});

test('every page in the built site is rewritten, no prod link left', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tmg-site-'));
  fs.mkdirSync(path.join(dir, 'legal'));
  fs.writeFileSync(path.join(dir, 'online-readings.html'), `<a href="${PROD_APP}/a">1</a><a href="${PROD_APP}/b">2</a>`);
  fs.writeFileSync(path.join(dir, 'legal', 'terms.html'), `<a href="${PROD_APP}/?page=chart">3</a>`);
  fs.writeFileSync(path.join(dir, 'about.html'), '<p>no app links</p>');
  assert.strictEqual(pointSiteAppLinks(dir, DEV_APP), 3);
  for (const f of ['online-readings.html', 'legal/terms.html']) {
    const html = fs.readFileSync(path.join(dir, f), 'utf8');
    assert.ok(!html.includes(PROD_APP), `${f} still links to prod`);
    assert.ok(html.includes(DEV_APP), `${f} has no dev link`);
  }
});

test('an unknown origin is refused', () => {
  assert.throws(() => pointSiteAppLinks(os.tmpdir(), 'https://evil.example'), /unknown app origin/);
});

console.log(`point-app-links: ${passed} passed`);
