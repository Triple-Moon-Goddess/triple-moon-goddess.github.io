// The talk feedback page (Lisa, 2026-10-31): Lisa's exact wording, seven segments in order.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const page = fs.readFileSync(path.join(__dirname, '../feedback.html'), 'utf8');
const data = fs.readFileSync(path.join(__dirname, '../_data/talk_feedback.yml'), 'utf8');

const labels = [...data.matchAll(/label: "(.+)"/g)].map((m) => m[1]);
assert.deepStrictEqual(labels, [
  "Was learning Lisa's story helpful?",
  "How was learning how astrology impacts Lisa's psyche?",
  'How was the Moon interpretation reading?',
  "How was hearing Lisa's physical health story?",
  'How was learning how constitutions work?',
  'How was learning about the free apps?',
  'How were the readings?',
]);
assert.ok(page.includes('>Do More</button>') && page.includes('>Do Less</button>'));
assert.ok(page.includes('If you would like to hear back from Lisa, please enter your email address and she will reach out to you for more info.'));
assert.ok(page.includes('>Submit</button>'));
assert.ok(page.includes('Thank you for the feedback, this is very helpful. If you\'d like more info about TMG <a href="https://triplemoongoddess.com">click here</a>'));
// Everything is optional, and no name is ever asked for.
assert.doesNotMatch(page, /\srequired[\s>]/);
assert.doesNotMatch(page, /name="(full)?name"/i);
console.log('feedback-page: ok');
