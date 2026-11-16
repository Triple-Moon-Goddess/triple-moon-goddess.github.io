// node .hosting/sitemap.test.cjs — sitemap.xml lists every public page and every blog
// post, so Google can find them all (Search Console 2026-11-15: 11 posts and
// online-readings.html were missing and never indexed). After the Jekyll build, also
// checks the built _site/sitemap.xml against the built posts.
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const SITE = 'https://triplemoongoddess.com';
// Not pages for search: the 404 page (noindex) and Google's ownership file.
const NOT_LISTED = ['404.html', 'google15980f07fff87d52.html'];

let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`✓ ${name}`); }

const source = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

test('every top-level page is in the sitemap', () => {
  const listed = new Set(locs(source));
  const pages = fs.readdirSync(root).filter((f) => f.endsWith('.html') && !NOT_LISTED.includes(f));
  for (const f of pages) {
    const url = f === 'index.html' ? `${SITE}/` : `${SITE}/${f}`;
    assert.ok(listed.has(url), `${f} is not in sitemap.xml`);
  }
});

test('every sitemap address is a page in the repo', () => {
  for (const url of locs(source)) {
    if (url.includes('{{')) continue;
    const rel = url.slice(SITE.length) === '/' ? 'index.html' : url.slice(SITE.length + 1);
    assert.ok(fs.existsSync(path.join(root, rel)), `${url} has no page`);
  }
});

test('no address is listed twice', () => {
  const all = locs(source);
  assert.strictEqual(new Set(all).size, all.length);
});

test('the sitemap runs Liquid and lists site.posts', () => {
  assert.ok(source.startsWith('---\n'), 'sitemap.xml needs front matter so Jekyll runs the posts loop');
  assert.match(source, /{%-? for post in site\.posts %}[\s\S]*{{ post\.url }}[\s\S]*{%-? endfor %}/);
});

const built = path.join(root, '_site', 'sitemap.xml');
if (fs.existsSync(built)) {
  const xml = fs.readFileSync(built, 'utf8');
  test('built sitemap starts with the XML declaration (valid XML)', () => assert.ok(xml.startsWith('<?xml'), JSON.stringify(xml.slice(0, 40))));
  test('built sitemap lists every built blog post', () => {
    const listed = new Set(locs(xml));
    const posts = [];
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.html')) posts.push(`/${path.relative(path.join(root, '_site'), p).split(path.sep).join('/')}`);
      }
    };
    for (const d of fs.readdirSync(path.join(root, '_site')).filter((x) => /^\d{4}$/.test(x))) walk(path.join(root, '_site', d));
    const count = fs.readdirSync(path.join(root, '_posts')).filter((f) => f.endsWith('.md')).length;
    assert.strictEqual(posts.length, count, `${posts.length} built posts, ${count} in _posts`);
    for (const p of posts) assert.ok(listed.has(`${SITE}${p}`), `${p} is not in the built sitemap`);
  });
} else {
  console.log('- built checks skipped: no _site (they run in the deploy workflow after the Jekyll build)');
}

console.log(`sitemap: ${passed} passed`);
