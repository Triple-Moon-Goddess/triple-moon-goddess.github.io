#!/usr/bin/env bash
# zap-summary.sh — the website ZAP run's summary, email subject and pass/fail
# (.github/workflows/zap-scan.yml). Findings Lisa decided on (.hosting/zap-decisions.json:
# same plugin AND name, every URL on a TMG host) are listed with her note and do not
# count; any other finding of Low risk or higher fails the run.
#   bash .hosting/zap-summary.sh <report_json.json> <title> <out.md>
# Prints "subject=…" and "rc=0|1" lines (for $GITHUB_OUTPUT).
set -euo pipefail
REPORT="$1"; TITLE="$2"; OUT="$3"
DECISIONS="$(dirname "${BASH_SOURCE[0]}")/zap-decisions.json"
HOSTS='["triplemoongoddess.com","www.triplemoongoddess.com","triplemoongoddess-site.web.app","triplemoongoddess-site-dev.web.app"]'
if [ ! -f "$REPORT" ]; then
  echo "No ZAP report was produced — the scan itself failed. See the run log." > "$OUT"
  echo "subject=🚨 FAILED — $TITLE produced no report"; echo "rc=1"; exit 0
fi
# Each alert tagged with the decision that covers it (or null).
TAGGED="$(jq --slurpfile d "$DECISIONS" --argjson hosts "$HOSTS" '
  [.site[].alerts[] | . as $a
   | ($a.instances | map(.uri | capture("^https?://(?<h>[^/:?#]+)").h) | all(. as $h | $hosts | index($h))) as $ours
   | ($d[0] | map(select(.pluginid == $a.pluginid and .name == $a.name)) | first) as $dec
   | $a + {decision: (if $ours and ($a.instances | length) > 0 then $dec else null end)}]' "$REPORT")"
count() { jq "[.[] | select(.decision == null and .riskcode == \"$1\")] | length" <<<"$TAGGED"; }
high=$(count 3); medium=$(count 2); low=$(count 1); info=$(count 0)
{
  echo "# $TITLE"; echo ""
  echo "| High | Medium | Low | Informational |"; echo "|---:|---:|---:|---:|"
  echo "| $high | $medium | $low | $info |"; echo ""
  echo "## Findings"; echo ""
  jq -r '[.[] | select(.decision == null)] | sort_by(-(.riskcode | tonumber), .name) | .[] |
    ({"3":"High","2":"Medium","1":"Low","0":"Informational"}[.riskcode]) as $risk |
    "- **\($risk)** — \(.name) (plugin \(.pluginid)\(if .cweid != "-1" then ", CWE-\(.cweid)" else "" end))",
    ([.instances[] | "  - \(.method // "GET") \(.uri)"] | unique | .[])' <<<"$TAGGED"
  if [ "$(jq '[.[] | select(.decision != null)] | length' <<<"$TAGGED")" -gt 0 ]; then
    echo ""; echo "## Decided by Lisa (listed every run, not failing)"; echo ""
    jq -r '[.[] | select(.decision != null)] | .[] |
      ({"3":"High","2":"Medium","1":"Low","0":"Informational"}[.riskcode]) as $risk |
      "- **\(.decision.kind)** — \(.name) (plugin \(.pluginid), \($risk)) — \(.decision.decided)",
      "  - \(.decision.note)",
      ([.instances[] | "  - \(.method // "GET") \(.uri)"] | unique | .[])' <<<"$TAGGED"
  fi
} > "$OUT"
counts="High $high, Medium $medium, Low $low, Informational $info"
if [ $((high + medium + low)) -gt 0 ]; then
  printf '\n**FAIL: %s finding(s) at Low risk or higher.**\n' $((high + medium + low)) >> "$OUT"
  echo "subject=🚨 FAILED — $TITLE: $counts"; echo "rc=1"
else
  echo "subject=passed — $TITLE: $counts"; echo "rc=0"
fi
