#!/usr/bin/env node
/**
 * send-mail.cjs — email Lisa from a workflow with no app password (Workspace
 * audit ADD-34, 2026-10-20). The job signs in by Workload Identity Federation as
 * gh-website-deploy, which may sign as the TMG mail sender
 * (tmg-mail-sender@triple-moon-goddess, granted only gmail.send by domain-wide
 * delegation). The signed assertion is exchanged for a token for Lisa's mailbox
 * and the message is uploaded to the Gmail API. Same path as the app repo's
 * .github/actions/send-mail.
 *
 * Usage (env): MAIL_TO, MAIL_FROM, MAIL_SUBJECT, MAIL_BODY, MAIL_ATTACHMENT (optional
 * path), LISA_EMAIL (the only allowed recipient), MAIL_SENDER_SA (optional).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DEFAULT_SENDER = 'tmg-mail-sender@triple-moon-goddess.iam.gserviceaccount.com';
const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SEND_URL = 'https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send?uploadType=media';

/** Refuses any recipient but Lisa: this sender can mail anyone as her. */
function checkRecipient(to, lisa) {
  if (!lisa || String(to).trim().toLowerCase() !== String(lisa).trim().toLowerCase()) {
    throw new Error('send-mail: refused, the only allowed recipient is Lisa');
  }
}

/** One header value on one line (no header injection). */
const oneLine = (s) => String(s).replace(/[\r\n]+/g, ' ');

/** A plain-text RFC 5322 message, with an optional text attachment. */
function buildMime({ from, to, subject, body, attachment }) {
  const head = [`From: ${oneLine(from)}`, `To: ${oneLine(to)}`, `Subject: ${oneLine(subject)}`, 'MIME-Version: 1.0'];
  const text = Buffer.from(String(body || ''), 'utf8').toString('base64');
  if (!attachment) {
    return [...head, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', text, ''].join('\r\n');
  }
  const boundary = `tmg-${Date.now().toString(36)}`;
  return [
    ...head,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', text,
    `--${boundary}`, `Content-Type: text/plain; charset=UTF-8; name="${oneLine(attachment.name)}"`,
    `Content-Disposition: attachment; filename="${oneLine(attachment.name)}"`, 'Content-Transfer-Encoding: base64', '',
    attachment.content.toString('base64'),
    `--${boundary}--`, '',
  ].join('\r\n');
}

/** The delegation claims: the mail sender acting as Lisa, send scope only. */
function delegationClaims(senderSa, lisa, nowSec) {
  return { iss: senderSa, sub: lisa, scope: GMAIL_SEND_SCOPE, aud: TOKEN_URL, iat: nowSec, exp: nowSec + 600 };
}

/** Signs the claims as the mail sender through the IAM Credentials API (gcloud). */
function signAsMailSender(claims, senderSa, exec = execFileSync) {
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'mail-'));
  const claimsFile = path.join(dir, 'claims.json');
  const jwtFile = path.join(dir, 'signed.jwt');
  fs.writeFileSync(claimsFile, JSON.stringify(claims));
  exec('gcloud', ['iam', 'service-accounts', 'sign-jwt', claimsFile, jwtFile, `--iam-account=${senderSa}`], { stdio: ['ignore', 'ignore', 'inherit'] });
  const jwt = fs.readFileSync(jwtFile, 'utf8').trim();
  fs.rmSync(dir, { recursive: true, force: true });
  return jwt;
}

async function sendMail(env, { exec = execFileSync, fetchImpl = fetch, nowSec = Math.floor(Date.now() / 1000) } = {}) {
  checkRecipient(env.MAIL_TO, env.LISA_EMAIL);
  const senderSa = env.MAIL_SENDER_SA || DEFAULT_SENDER;
  const attachment = env.MAIL_ATTACHMENT && fs.existsSync(env.MAIL_ATTACHMENT)
    ? { name: path.basename(env.MAIL_ATTACHMENT), content: fs.readFileSync(env.MAIL_ATTACHMENT) }
    : null;
  const raw = buildMime({ from: env.MAIL_FROM, to: env.MAIL_TO, subject: env.MAIL_SUBJECT, body: env.MAIL_BODY, attachment });
  const assertion = signAsMailSender(delegationClaims(senderSa, env.LISA_EMAIL, nowSec), senderSa, exec);
  const tokenRes = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }).toString(),
  });
  const token = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !token.access_token) throw new Error(`send-mail: token refused (HTTP ${tokenRes.status} ${token.error || ''})`);
  const sendRes = await fetchImpl(SEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'message/rfc822' },
    body: raw,
  });
  const sent = await sendRes.json().catch(() => ({}));
  if (!sendRes.ok) throw new Error(`send-mail: Gmail refused the message (HTTP ${sendRes.status})`);
  return sent.id;
}

if (require.main === module) {
  sendMail(process.env)
    .then((id) => console.log(`send-mail: sent (Gmail id ${id})`))
    .catch((err) => { console.error(err.message); process.exit(1); });
}

module.exports = { checkRecipient, buildMime, delegationClaims, signAsMailSender, sendMail, GMAIL_SEND_SCOPE, DEFAULT_SENDER };
