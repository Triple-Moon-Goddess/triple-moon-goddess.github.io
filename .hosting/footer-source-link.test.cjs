// The website footer offers the API's public source (AGPL-3.0 section 13).
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const footer = fs.readFileSync(path.join(__dirname, '../_includes/footer.html'), 'utf8');
assert.match(
  footer,
  /<a href="https:\/\/github\.com\/Triple-Moon-Goddess\/swisseph-python-api" target="_blank" rel="noopener noreferrer">Open source: Swiss Ephemeris API \(AGPL-3\.0\)<\/a>/,
);
// Lisa, 2026-10-30: no patent notice in the footer.
assert.doesNotMatch(footer, /patent/i);
console.log('footer-source-link: ok');
