#!/usr/bin/env node
// .hosting/point-app-links.cjs — point a built site's app links at another app site
// (Lisa, 2026-10-18: the dev copy's reading buttons opened the PROD app).
//
//   node .hosting/point-app-links.cjs <built site dir> <app origin>
//
// The pages link to the prod app (https://triple-moon-goddess.web.app). The dev
// copy (triplemoongoddess-site-dev.web.app) must link to the dev app instead, so a
// test checkout never lands on prod. Run it BEFORE build-config.cjs: an inline
// block's CSP hash is taken from its final text.
'use strict';

const fs = require('fs');
const { pages, PROD_APP, APP_ORIGINS } = require('./build-config.cjs');

// The contact form posts to the app project's functions (contactFormSubmit), so
// the dev copy must post to dev's, never prod's (2026-10-19).
const PROD_FUNCTIONS = 'https://us-central1-triple-moon-goddess.cloudfunctions.net';
const functionsFor = (origin) => (origin === PROD_APP ? PROD_FUNCTIONS : 'https://us-central1-triple-moon-goddess-dev.cloudfunctions.net');

/** Returns the page text with every prod app link and functions URL pointed at `origin`'s project. */
function pointAppLinks(html, origin) {
  return html.split(PROD_APP).join(origin).split(PROD_FUNCTIONS).join(functionsFor(origin));
}

/** Rewrites every page under `dir`; returns how many links changed. */
function pointSiteAppLinks(dir, origin) {
  if (!APP_ORIGINS.includes(origin)) throw new Error(`unknown app origin: ${origin}`);
  let changed = 0;
  for (const file of pages(dir)) {
    const html = fs.readFileSync(file, 'utf8');
    const count = (html.split(PROD_APP).length - 1) + (html.split(PROD_FUNCTIONS).length - 1);
    if (count === 0) continue;
    fs.writeFileSync(file, pointAppLinks(html, origin));
    changed += count;
  }
  return changed;
}

function main([dir, origin]) {
  if (!dir || !origin) {
    console.error('usage: point-app-links.cjs <built site dir> <app origin>');
    return 2;
  }
  console.log(`point-app-links: ${pointSiteAppLinks(dir, origin)} link(s) now open ${origin}`);
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { pointAppLinks, pointSiteAppLinks, PROD_APP, PROD_FUNCTIONS };
