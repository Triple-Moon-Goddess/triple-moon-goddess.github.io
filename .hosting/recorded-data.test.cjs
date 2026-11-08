// node .hosting/recorded-data.test.cjs — every Recorded video (_data/recorded.yml)
// has its required fields, a unique YouTube id, and its click-to-play thumbnail.
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`✓ ${name}`); }

/** The flat "- key: value" list shape recorded.yml uses (no nesting). */
function parseRecorded(text) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*(#|$)/.test(line)) continue;
    const m = line.match(/^(- |  )([a-z_]+): "(.*)"$/);
    assert.ok(m, `bad recorded.yml line: ${line}`);
    if (m[1] === '- ') out.push({});
    out[out.length - 1][m[2]] = m[3];
  }
  return out;
}

const videos = parseRecorded(fs.readFileSync(path.join(root, '_data', 'recorded.yml'), 'utf8'));

test('there is at least one video', () => assert.ok(videos.length > 0));

test('every video has title, youtube_id, date and location', () => {
  for (const v of videos) {
    for (const k of ['title', 'youtube_id', 'date', 'location']) assert.ok(v[k], `${v.title || '?'}: missing ${k}`);
    assert.match(v.youtube_id, /^[A-Za-z0-9_-]{11}$/, `${v.title}: bad youtube_id`);
    assert.match(v.date, /^\d{4}-\d{2}-\d{2}$/, `${v.title}: bad date`);
  }
});

test('youtube ids are unique', () => {
  const ids = videos.map((v) => v.youtube_id);
  assert.strictEqual(new Set(ids).size, ids.length);
});

test('every video has its thumbnail in assets/video-thumbs', () => {
  for (const v of videos) {
    const thumb = path.join(root, 'assets', 'video-thumbs', `${v.youtube_id}.jpg`);
    assert.ok(fs.existsSync(thumb), `${v.title}: missing ${path.relative(root, thumb)}`);
  }
});

test('the Palo Alto talk (2026-11-07) is listed', () => {
  assert.ok(videos.some((v) => v.youtube_id === 'rJnqR1Eu82M' && v.date === '2026-11-07'));
});

console.log(`\n${passed} passed`);
