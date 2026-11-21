// node .hosting/events-data.test.cjs — every event (_data/events.yml) has the
// fields events.html and the Event schema read, and the 2027 SoulSearch booth
// weekends are listed as Saturday + Sunday pairs.
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { parseFlatYaml } = require('./flat-yaml.cjs');

const root = path.join(__dirname, '..');
let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`✓ ${name}`); }

const FIELDS = ['title', 'date', 'type', 'venue', 'location', 'status', 'duration', 'notes'];
const TYPES = ['keynote', 'expo', 'workshop', 'panel', 'podcast', 'other'];
const STATUSES = ['confirmed', 'tentative'];

/** 0 = Sunday … 6 = Saturday, for a YYYY-MM-DD date. */
function weekday(date) { return new Date(`${date}T12:00:00Z`).getUTCDay(); }

const events = parseFlatYaml(fs.readFileSync(path.join(root, '_data', 'events.yml'), 'utf8'), 'events.yml');

test('there is at least one event', () => assert.ok(events.length > 0));

test('every event has exactly the fields the page reads, in order', () => {
  for (const e of events) assert.deepStrictEqual(Object.keys(e), FIELDS, `${e.date} ${e.title}`);
});

test('every event has a title, a real date, a known type and a known status', () => {
  for (const e of events) {
    assert.ok(e.title, `${e.date}: missing title`);
    assert.match(e.date, /^\d{4}-\d{2}-\d{2}$/, `${e.title}: bad date`);
    assert.strictEqual(new Date(`${e.date}T12:00:00Z`).toISOString().slice(0, 10), e.date, `${e.title}: not a real date ${e.date}`);
    assert.ok(TYPES.includes(e.type), `${e.date} ${e.title}: bad type ${e.type}`);
    assert.ok(STATUSES.includes(e.status), `${e.date} ${e.title}: bad status ${e.status}`);
  }
});

test('no two events share a title and date', () => {
  const keys = events.map((e) => `${e.date}|${e.title}`);
  assert.strictEqual(new Set(keys).size, keys.length);
});

test('every "Booth — Day 1" is a Saturday with its "Booth — Day 2" the next day at the same expo', () => {
  const day1s = events.filter((e) => e.title === 'Booth — Day 1');
  const day2s = events.filter((e) => e.title === 'Booth — Day 2');
  assert.strictEqual(day1s.length, day2s.length);
  for (const d1 of day1s) {
    assert.strictEqual(weekday(d1.date), 6, `${d1.date}: Day 1 is not a Saturday`);
    const next = new Date(new Date(`${d1.date}T12:00:00Z`).getTime() + 86400000).toISOString().slice(0, 10);
    const d2 = day2s.find((e) => e.date === next);
    assert.ok(d2, `${d1.date}: no Day 2 on ${next}`);
    assert.deepStrictEqual({ ...d2, title: '', date: '' }, { ...d1, title: '', date: '' }, `${d1.date}: Day 2 differs from Day 1`);
  }
});

test('the six 2027 SoulSearch booth weekends are listed, matching the Dublin 2026 booth records', () => {
  const dublin = events.find((e) => e.title === 'Booth — Day 1' && e.date === '2026-12-12');
  assert.ok(dublin, 'Dublin 2026 Day 1 missing');
  const weekends = [
    ['2027-01-16', '2027-01-17', 'Rohnert Park'],
    ['2027-02-27', '2027-02-28', 'Dublin'],
    ['2027-03-20', '2027-03-21', 'Palo Alto'],
    ['2027-04-24', '2027-04-25', 'Concord'],
    ['2027-05-15', '2027-05-16', 'Santa Cruz'],
    ['2027-08-21', '2027-08-22', 'Concord'],
  ];
  for (const [sat, sun, city] of weekends) {
    [sat, sun].forEach((date, i) => {
      const found = events.filter((e) => e.date === date);
      assert.strictEqual(found.length, 1, `${date}: expected one record, found ${found.length}`);
      assert.deepStrictEqual(found[0], {
        ...dublin,
        title: `Booth — Day ${i + 1}`,
        date,
        venue: `SoulSearch ${city} Enlightenment Expo`,
        location: `${city}, CA`,
      });
    });
  }
  assert.strictEqual(events.filter((e) => e.date.startsWith('2027-')).length, 12);
});

console.log(`\n${passed} passed`);
