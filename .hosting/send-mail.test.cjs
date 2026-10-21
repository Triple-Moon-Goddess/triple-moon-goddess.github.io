// Tests for send-mail.cjs: Lisa-only recipient, the MIME message, the
// delegation claims, and the token + upload calls (no network, no gcloud).
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const m = require('./send-mail.cjs');

const LISA = 'lisa@example.test';
let failures = 0;
async function check(label, fn) {
  try { await fn(); console.log(`PASS  ${label}`); } catch (e) { failures++; console.log(`FAIL  ${label}: ${e.message}`); }
}

(async () => {
  await check('refuses a recipient other than Lisa', () => {
    assert.throws(() => m.checkRecipient('someone@else.test', LISA), /only allowed recipient/);
    assert.throws(() => m.checkRecipient(LISA, ''), /only allowed recipient/);
    m.checkRecipient(' LISA@example.test ', LISA);
  });

  await check('plain message: headers on one line, body base64', () => {
    const raw = m.buildMime({ from: 'Bot <x@y>', to: LISA, subject: 'Hi\r\nBcc: evil@z', body: 'hello' });
    assert.match(raw, /^Subject: Hi Bcc: evil@z\r\n/m);
    assert.ok(!/^Bcc:/m.test(raw));
    assert.ok(raw.includes(Buffer.from('hello').toString('base64')));
  });

  await check('attachment goes in a multipart part', () => {
    const raw = m.buildMime({ from: 'a@b', to: LISA, subject: 's', body: 'b', attachment: { name: 'zap-summary.md', content: Buffer.from('# findings') } });
    assert.match(raw, /multipart\/mixed/);
    assert.match(raw, /filename="zap-summary.md"/);
    assert.ok(raw.includes(Buffer.from('# findings').toString('base64')));
  });

  await check('claims: mail sender acting as Lisa, gmail.send only, 10 minutes', () => {
    const c = m.delegationClaims('sa@p.iam', LISA, 1000);
    assert.deepStrictEqual(c, { iss: 'sa@p.iam', sub: LISA, scope: 'https://www.googleapis.com/auth/gmail.send', aud: 'https://oauth2.googleapis.com/token', iat: 1000, exp: 1600 });
  });

  await check('signs as the prod mail sender by default, exchanges, uploads', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-'));
    const att = path.join(dir, 'zap-summary.md');
    fs.writeFileSync(att, 'summary');
    const execCalls = [];
    const exec = (cmd, args) => { execCalls.push([cmd, ...args]); fs.writeFileSync(args[4], 'signed.jwt.value\n'); };
    const fetchCalls = [];
    const fetchImpl = async (url, opts) => {
      fetchCalls.push({ url, opts });
      if (url.includes('oauth2')) return { ok: true, status: 200, json: async () => ({ access_token: 'tok' }) };
      return { ok: true, status: 200, json: async () => ({ id: 'gmail123' }) };
    };
    const id = await m.sendMail({ MAIL_TO: LISA, LISA_EMAIL: LISA, MAIL_FROM: 'Bot <x@y>', MAIL_SUBJECT: 's', MAIL_BODY: 'b', MAIL_ATTACHMENT: att }, { exec, fetchImpl, nowSec: 1 });
    assert.strictEqual(id, 'gmail123');
    assert.strictEqual(execCalls[0][0], 'gcloud');
    assert.ok(execCalls[0].includes(`--iam-account=${m.DEFAULT_SENDER}`));
    assert.ok(fetchCalls[0].opts.body.includes('assertion=signed.jwt.value'));
    assert.strictEqual(fetchCalls[1].opts.headers.Authorization, 'Bearer tok');
    assert.match(fetchCalls[1].url, /uploadType=media/);
    assert.match(fetchCalls[1].opts.body, /filename="zap-summary.md"/);
  });

  await check('a refused token stops before any upload', async () => {
    const exec = (cmd, args) => fs.writeFileSync(args[4], 'j');
    let uploads = 0;
    const fetchImpl = async (url) => {
      if (url.includes('oauth2')) return { ok: false, status: 401, json: async () => ({ error: 'unauthorized_client' }) };
      uploads++; return { ok: true, status: 200, json: async () => ({}) };
    };
    await assert.rejects(m.sendMail({ MAIL_TO: LISA, LISA_EMAIL: LISA, MAIL_FROM: 'a', MAIL_SUBJECT: 's' }, { exec, fetchImpl, nowSec: 1 }), /token refused \(HTTP 401 unauthorized_client\)/);
    assert.strictEqual(uploads, 0);
  });

  await check('the ZAP workflow mails through this script, never SMTP or an app password', () => {
    const wf = fs.readFileSync(path.join(__dirname, '../.github/workflows/zap-scan.yml'), 'utf8');
    assert.ok(wf.includes('node repo/.hosting/send-mail.cjs'));
    assert.ok(!/smtp\.gmail\.com|GMAIL_APP_PASSWORD|action-send-mail/.test(wf));
    assert.match(wf, /id-token: write/);
  });

  console.log(failures ? `\n${failures} FAILED` : '\nAll send-mail checks passed');
  process.exit(failures ? 1 : 0);
})();
