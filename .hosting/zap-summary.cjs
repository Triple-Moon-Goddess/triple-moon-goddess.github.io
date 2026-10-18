#!/usr/bin/env node
// .hosting/zap-summary.cjs — the website ZAP run's summary, email subject and pass/fail
// (.github/workflows/zap-scan.yml). Findings Lisa decided on (.hosting/zap-decisions.json)
// are listed with her note and not counted. A decision matches only when plugin AND name
// match, every URL is on a TMG host, and — where the entry says so — every evidence value
// matches its patterns, every URL matches its urlPattern, and the alert's other info
// matches otherinfoPattern. Any other finding fails the run, Informational included
// (Lisa, 2026-10-18: every finding alerts).
//
//   node .hosting/zap-summary.cjs <report_json.json> <title> <out.md>
// Prints "subject=…" and "rc=0|1" lines (for $GITHUB_OUTPUT).
'use strict';

const fs = require('fs');
const path = require('path');

const RISK = { 3: 'High', 2: 'Medium', 1: 'Low', 0: 'Informational' };
const KIND = { accepted: 'Accepted', 'false-positive': 'False positive', 'not-applicable': 'Not applicable' };
const HOSTS = ['triplemoongoddess.com', 'www.triplemoongoddess.com', 'triplemoongoddess-website.web.app', 'triplemoongoddess-site-dev.web.app'];

const allMatch = (values, patterns) => values.length > 0 && values.every((v) => patterns.some((p) => new RegExp(p).test(v)));
const hostOf = (u) => { try { return new URL(u).hostname; } catch { return ''; } };

/** The decision covering one ZAP alert, or null. */
function decisionFor(alert, decisions) {
  const urls = (alert.instances || []).map((i) => i.uri);
  const evidence = (alert.instances || []).map((i) => i.evidence).filter(Boolean);
  return decisions.find((d) =>
    d.pluginid === String(alert.pluginid) && d.name === alert.name &&
    urls.length > 0 && urls.every((u) => HOSTS.includes(hostOf(u))) &&
    (!d.evidencePatterns || allMatch(evidence, d.evidencePatterns)) &&
    (!d.urlPattern || allMatch(urls, [d.urlPattern])) &&
    (!d.otherinfoPattern || new RegExp(d.otherinfoPattern).test(alert.otherinfo || ''))
  ) || null;
}

function lines(alert) {
  return [...new Set((alert.instances || []).map((i) => `  - ${i.method || 'GET'} ${i.uri}`))].sort();
}

function summarize(report, title, decisions) {
  const alerts = (report.site || []).flatMap((s) => s.alerts || []).map((a) => ({ ...a, decision: decisionFor(a, decisions) }));
  const open = alerts.filter((a) => !a.decision).sort((a, b) => b.riskcode - a.riskcode || a.name.localeCompare(b.name));
  const decided = alerts.filter((a) => a.decision);
  const n = (code) => open.filter((a) => String(a.riskcode) === String(code)).length;
  const counts = { High: n(3), Medium: n(2), Low: n(1), Informational: n(0) };
  const md = [`# ${title}`, '', '| High | Medium | Low | Informational |', '|---:|---:|---:|---:|',
    `| ${counts.High} | ${counts.Medium} | ${counts.Low} | ${counts.Informational} |`, '', '## Findings', ''];
  if (!open.length) md.push('None.');
  for (const a of open) md.push(`- **${RISK[a.riskcode]}** — ${a.name} (plugin ${a.pluginid}${a.cweid !== '-1' ? `, CWE-${a.cweid}` : ''})`, ...lines(a));
  if (decided.length) {
    md.push('', '## Decided by Lisa (listed every run, not counted)', '');
    for (const a of decided) md.push(`- **${KIND[a.decision.kind]}** — ${a.name} (plugin ${a.pluginid}, ${RISK[a.riskcode]}) — ${a.decision.decided}`, `  - ${a.decision.note}`, ...lines(a));
  }
  const failing = open.length;
  if (failing) md.push('', `**FAIL: ${failing} finding(s) — every finding fails, Informational included.**`);
  const c = Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ');
  return { md: md.join('\n') + '\n', subject: `${failing ? '🚨 FAILED' : 'passed'} — ${title}: ${c}`, rc: failing ? 1 : 0 };
}

function main(argv) {
  const [reportFile, title, out] = argv;
  const decisions = JSON.parse(fs.readFileSync(path.join(__dirname, 'zap-decisions.json'), 'utf8'));
  if (!fs.existsSync(reportFile)) {
    fs.writeFileSync(out, 'No ZAP report was produced — the scan itself failed. See the run log.\n');
    console.log(`subject=🚨 FAILED — ${title} produced no report`); console.log('rc=1');
    return 0;
  }
  const r = summarize(JSON.parse(fs.readFileSync(reportFile, 'utf8')), title, decisions);
  fs.writeFileSync(out, r.md);
  console.log(`subject=${r.subject}`); console.log(`rc=${r.rc}`);
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { decisionFor, summarize };
