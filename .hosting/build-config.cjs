#!/usr/bin/env node
// .hosting/build-config.cjs — write the Firebase Hosting config for the built site
// (Lisa, 2026-10-14: move triplemoongoddess.com to Firebase so it can send security
// headers; OWASP ZAP findings).
//
//   node .hosting/build-config.cjs <built site dir> <out firebase.json>
//
// Reads every built page and:
//   - allows each inline <script> and <style> block by its sha256 hash, so the
//     Content-Security-Policy needs no 'unsafe-inline';
//   - FAILS the build on what a hash cannot cover (a style="" attribute, an
//     on*= event handler, a javascript: URL) or on an outside host that is not
//     in ALLOWED below — the page would break under the policy;
//   - serves /about as /about.html for every top-level page, as GitHub Pages did;
//   - lets the one app origin (--app-origin, default the prod app) read events.html.
//
// No Cross-Origin-Embedder-Policy: tested 2026-10-14, COEP credentialless stops the
// click-to-play YouTube player loading in Chromium and Firefox (~/tmg-hq/dev-e2e/zap/video-trial.cjs).
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// The TMG apps whose pages link here; the prod app is what the live site serves.
const PROD_APP = 'https://triple-moon-goddess.web.app';
const APP_ORIGINS = [PROD_APP, 'https://triple-moon-goddess-dev.web.app'];

// Pages the app reads from the browser, and so must allow that one app origin
// to read (Lisa, 2026-10-18): the admin Reading Reconciliation report reads the
// event list from events.html. One named origin, never '*' (ZAP 10098).
const APP_READABLE_PAGES = ['/events.html', '/events'];

// Outside hosts the site may load, by CSP directive. Adding one is a deliberate edit.
const ALLOWED = {
  'img-src': ['https://i.ytimg.com'],
  'frame-src': ['https://www.youtube-nocookie.com'],
  'connect-src': ['https://formspree.io'],
  'form-action': ['https://formspree.io'],
};

function pages(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.html')) out.push(p);
    }
  };
  walk(dir);
  return out.sort();
}

const sha = (text) => `'sha256-${crypto.createHash('sha256').update(text, 'utf8').digest('base64')}'`;

/** Inline blocks, problems and outside hosts of one page. */
function inspect(html) {
  const scripts = [];
  const styles = [];
  const problems = [];
  const hosts = { 'script-src': new Set(), 'img-src': new Set(), 'frame-src': new Set(), 'connect-src': new Set(), 'form-action': new Set(), 'style-src': new Set() };
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1];
    const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(attrs);
    if (src) { if (/^https?:/i.test(src[1])) hosts['script-src'].add(new URL(src[1]).origin); continue; }
    if (/type\s*=\s*["']application\/(ld\+)?json["']/i.test(attrs)) continue; // data, never run
    scripts.push(m[2]);
  }
  for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) styles.push(m[1]);
  const noBlocks = html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '');
  if (/<[a-z][^>]*\sstyle\s*=/i.test(noBlocks)) problems.push('a style="" attribute');
  if (/<[a-z][^>]*\son[a-z]+\s*=/i.test(noBlocks)) problems.push('an on*= event handler');
  if (/\bhref\s*=\s*["']\s*javascript:/i.test(noBlocks)) problems.push('a javascript: link');
  for (const m of noBlocks.matchAll(/<(img|iframe|link|source|video|audio)\b[^>]*\b(src|href|srcset)\s*=\s*["'](https?:\/\/[^"'\s]+)/gi)) {
    const tag = m[1].toLowerCase();
    if (tag === 'link' && !/rel\s*=\s*["'](stylesheet|preload|icon)/i.test(m[0])) continue;
    const dir = tag === 'iframe' ? 'frame-src' : tag === 'link' ? 'style-src' : 'img-src';
    hosts[dir].add(new URL(m[3]).origin);
  }
  for (const m of noBlocks.matchAll(/<form\b[^>]*\baction\s*=\s*["'](https?:\/\/[^"']+)/gi)) hosts['form-action'].add(new URL(m[1]).origin);
  return { scripts, styles, problems, hosts };
}

/**
 * Minify every script the site serves — assets/js/*.js and each page's inline
 * <script> — so no developer comment is shipped (ZAP 10027). Runs before the
 * hashes are taken, so the CSP allows exactly what is served. Needs esbuild
 * (.hosting/package.json; the workflow installs it).
 */
function minifyScripts(siteDir) {
  const esbuild = require(require.resolve('esbuild', { paths: [__dirname] }));
  const min = (code) => esbuild.transformSync(code, { loader: 'js', minify: true, legalComments: 'none' }).code.trim();
  let count = 0;
  for (const file of pages(siteDir)) {
    const html = fs.readFileSync(file, 'utf8');
    const out = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (all, attrs, code) => {
      if (/\bsrc\s*=/.test(attrs) || /application\/(ld\+)?json/i.test(attrs) || !code.trim()) return all;
      count += 1;
      return `<script${attrs}>${min(code)}</script>`;
    });
    if (out !== html) fs.writeFileSync(file, out);
  }
  const jsDir = path.join(siteDir, 'assets', 'js');
  if (fs.existsSync(jsDir)) {
    for (const f of fs.readdirSync(jsDir).filter((x) => x.endsWith('.js'))) {
      const p = path.join(jsDir, f);
      fs.writeFileSync(p, min(fs.readFileSync(p, 'utf8')) + '\n');
      count += 1;
    }
  }
  return count;
}

function buildConfig(siteDir, { appOrigin = PROD_APP } = {}) {
  if (!APP_ORIGINS.includes(appOrigin)) throw new Error(`unknown app origin: ${appOrigin}`);
  const scriptHashes = new Set();
  const styleHashes = new Set();
  const errors = [];
  const seenHosts = {};
  for (const file of pages(siteDir)) {
    const rel = path.relative(siteDir, file);
    const { scripts, styles, problems, hosts } = inspect(fs.readFileSync(file, 'utf8'));
    scripts.forEach((s) => scriptHashes.add(sha(s)));
    styles.forEach((s) => styleHashes.add(sha(s)));
    problems.forEach((p) => errors.push(`${rel}: ${p} (the Content-Security-Policy would block it; use a class or a script file)`));
    for (const [dir, set] of Object.entries(hosts)) {
      for (const h of set) {
        if (!(ALLOWED[dir] || []).includes(h)) errors.push(`${rel}: ${dir} loads ${h}, which is not in ALLOWED in .hosting/build-config.cjs`);
        (seenHosts[dir] = seenHosts[dir] || new Set()).add(h);
      }
    }
  }
  const topPages = fs.readdirSync(siteDir).filter((f) => f.endsWith('.html') && !['index.html', '404.html'].includes(f));
  const csp = [
    "default-src 'self'",
    ["script-src 'self'", ...[...scriptHashes].sort()].join(' '),
    ["style-src 'self'", ...[...styleHashes].sort()].join(' '),
    ["img-src 'self' data:", ...ALLOWED['img-src']].join(' '),
    "font-src 'self'",
    ["connect-src 'self'", ...ALLOWED['connect-src']].join(' '),
    ['frame-src', ...ALLOWED['frame-src']].join(' '),
    "media-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    ["form-action 'self'", ...ALLOWED['form-action']].join(' '),
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
  const config = {
    hosting: {
      public: path.relative(path.dirname(path.resolve(process.argv[3] || '.hosting/firebase.json')), path.resolve(siteDir)),
      ignore: ['CNAME', '**/.*'],
      cleanUrls: false,
      rewrites: topPages.map((f) => ({ source: `/${f.replace(/\.html$/, '')}`, destination: `/${f}` })),
      headers: [
        {
          source: '**',
          headers: [
            { key: 'Content-Security-Policy', value: csp },
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), usb=(), payment=()' },
            { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
            { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
            // Pages are never stored, so a change reaches every visitor at once (ZAP 10015/10050).
            { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          ],
        },
        ...APP_READABLE_PAGES.map((source) => ({
          source,
          headers: [
            { key: 'Access-Control-Allow-Origin', value: appOrigin },
            { key: 'Vary', value: 'Origin' },
          ],
        })),
        // Public files only; names are not content-hashed, so a day, never immutable.
        { source: '/assets/**', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }] },
        { source: '**/*.@(png|jpg|jpeg|gif|svg|ico|webp)', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }] },
      ],
    },
  };
  return { config, errors, counts: { pages: pages(siteDir).length, scripts: scriptHashes.size, styles: styleHashes.size, rewrites: topPages.length } };
}

function main(argv) {
  const [siteDir, out, ...rest] = argv;
  if (!siteDir || !out) { console.error('usage: build-config.cjs <built site dir> <out firebase.json> [--app-origin <origin>]'); return 2; }
  const i = rest.indexOf('--app-origin');
  const appOrigin = i >= 0 ? rest[i + 1] : PROD_APP;
  const minified = minifyScripts(siteDir);
  const { config, errors, counts } = buildConfig(siteDir, { appOrigin });
  if (errors.length) {
    console.error(`REFUSED: ${errors.length} problem(s) the security headers would break:\n  ${errors.join('\n  ')}`);
    return 1;
  }
  fs.writeFileSync(out, JSON.stringify(config, null, 2) + '\n');
  console.log(`minified ${minified} script(s); wrote ${out}: ${counts.pages} pages, ${counts.scripts} inline script hash(es), ${counts.styles} inline style hash(es), ${counts.rewrites} extensionless rewrites`);
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { inspect, buildConfig, minifyScripts, sha, pages, ALLOWED, PROD_APP, APP_ORIGINS, APP_READABLE_PAGES };
