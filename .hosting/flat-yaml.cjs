// The flat `- key: "value"` list shape the site's _data files use (no nesting):
// recorded.yml and events.yml. Shared by the .hosting data tests.
'use strict';

const assert = require('assert');

/** Parse a flat YAML list of records; `label` names the file in a failure. */
function parseFlatYaml(text, label) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*(#|$)/.test(line)) continue;
    const m = line.match(/^(- |  )([a-z_]+): "(.*)"$/);
    assert.ok(m, `bad ${label} line: ${line}`);
    if (m[1] === '- ') out.push({});
    assert.ok(out.length, `${label}: field before the first record: ${line}`);
    out[out.length - 1][m[2]] = m[3];
  }
  return out;
}

module.exports = { parseFlatYaml };
