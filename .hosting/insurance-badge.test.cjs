// The Qualifications page shows the "Proudly insured by Alternative Balance" logo.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

// The page pulls the badge in, right after the Kepler badge.
assert.match(
  read('training.html'),
  /\{% include kepler-badge\.html issuer=true %\}\s*\{% include insurance-badge\.html %\}/,
);

const badge = read('_includes/insurance-badge.html');
const img = badge.match(/<img\b[^>]*>/);
assert.ok(img, 'the badge has an image');
assert.match(img[0], /alt="Proudly insured by Alternative Balance"/);

// The image is served from this site (the CSP allows img-src 'self' only) and exists.
const src = img[0].match(/src="([^"]+)"/)[1];
assert.match(src, /^\/assets\/badges\/[a-z0-9-]+\.png$/);
const file = fs.readFileSync(path.join(root, src));
assert.deepStrictEqual([...file.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'a real PNG');

// width/height in the tag match the file, so the page doesn't jump while it loads.
assert.strictEqual(Number(img[0].match(/width="(\d+)"/)[1]), file.readUInt32BE(16));
assert.strictEqual(Number(img[0].match(/height="(\d+)"/)[1]), file.readUInt32BE(20));

// Dark lettering needs a white card on the site's dark pages.
assert.match(badge, /\.tmg-insurance-badge img \{[^}]*background: #ffffff;/);
console.log('insurance-badge: ok');
