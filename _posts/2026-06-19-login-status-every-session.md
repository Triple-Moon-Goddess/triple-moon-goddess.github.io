---
layout: post
title: "Login Status on Every Session: When the Right Tool Is the One You Weren't Reaching For"
date: 2026-06-19
---

I build and run this platform with Claude from the terminal, and that means I live behind a wall of authenticated CLIs — `gh` for GitHub, `firebase` for deploys, `gcloud` for our KMS encryption, `bw` for Bitwarden. Nothing wrecks momentum like getting three steps into a task before discovering a token expired or I was never logged in.

So I asked for something that sounds trivial: **at the start of every session, show me which logins are good and which need attention — without me having to ask.**

It was not trivial. The reason it wasn't is worth writing down, because it's a clean example of fighting a tool to do a job it was never built for.

## The setup that seemed obvious

Claude Code has a `SessionStart` hook — a script that runs when a session opens. The obvious move: check each CLI's auth state and report it. That half was easy:

```bash
#!/usr/bin/env bash
needs=()      # services that need a login
checked=()    # services we were able to check

have() { command -v "$1" >/dev/null 2>&1; }

if have gh; then
  checked+=("gh")
  gh auth status >/dev/null 2>&1 || needs+=("GitHub (gh)|! gh auth login")
fi
# ...same pattern for firebase, gcloud, bw...
```

The check ran perfectly. The hard part turned out to be the part I assumed was free: **getting the result onto my screen.**

## The dead end: hook output talks to Claude, not to me

A `SessionStart` hook has a few output channels, and over a frustrating stretch we tried all of them, each time confident it would work:

1. **JSON `additionalContext`** — the canonical "inject info at session start" field.
2. **Plain stdout** — which one source claimed shows up in the transcript.
3. **stderr with exit code 2** — which the official docs literally describe as *"Shows stderr to user only."*

All three put nothing on my screen. I'd start a fresh session and report back the same two words: *still nothing.*

Here's the catch, buried in the docs (emphasis mine):

> For most events, stdout is written to the debug log but not shown in the transcript. The exceptions are `UserPromptSubmit`, `UserPromptExpansion`, and `SessionStart`, where stdout **is added as context that Claude can see and act on.**

"Context that Claude can see." For a `SessionStart` hook, *every* output channel feeds the **model**, not the **human**. The status was being delivered — to Claude, who would then only repeat it back if it happened to. I was asking a context-injection mechanism to be a display mechanism. They are not the same thing, and no amount of reformatting the message was going to change that.

## The fix: stop making the hook *display*, make it *produce a fact*

The turn came from dropping the assumption entirely. The hook's job isn't to *show* anything — it's to *figure out a fact*. Showing is a separate concern with its own purpose-built tool: the **status line**, that persistent bar along the bottom of every Claude Code session. Always visible. Doesn't depend on anyone relaying it. Exactly where ambient status belongs.

So we split the two jobs with a file in between.

**1. The hook writes its result to a cache file:**

```bash
STATUS_CACHE="$HOME/.claude/login-status.txt"

if [ ${#needs[@]} -eq 0 ]; then
  compact="logins ✓ ${checked[*]}"
else
  svcs=""
  for n in "${needs[@]}"; do
    svc="${n%%|*}"
    svcs="${svcs:+$svcs, }${svc}"
  done
  compact="⚠ LOGIN NEEDED → ${svcs}"
fi

printf '%s' "$compact" > "$STATUS_CACHE"
```

**2. The status line reads that file and renders it:**

```bash
#!/usr/bin/env bash
input=$(cat)   # Claude passes session JSON on stdin (dir, model, etc.)
# ...parse dir + model from $input...

login="🔐 (login check pending)"
cache="$HOME/.claude/login-status.txt"
[ -r "$cache" ] && login="🔐 $(cat "$cache")"

printf '📁 %s  ·  🤖 %s  ·  %s' "$dir" "$model" "$login"
```

**3. Wire it into `settings.json`:**

```json
{
  "statusLine": {
    "type": "command",
    "command": "/Users/me/.claude/statusline.sh"
  }
}
```

Now every session opens with a bar like this:

```
📁 myproject  ·  🤖 Opus 4.8  ·  🔐 ⚠ LOGIN NEEDED → Bitwarden
```

…and when everything's authenticated:

```
📁 myproject  ·  🤖 Opus 4.8  ·  🔐 logins ✓ gh firebase bw
```

It works because each tool is finally doing the job it was designed for. The **hook** runs the check — it's allowed to be slow and hit the network, because it runs once at session start. The **status line** does the display — and stays cheap because it just reads a pre-computed file instead of re-running auth checks on every redraw.

## Why this is the right shape, not just a working one

There's a design lesson here that outlives login checks:

- **A status line must be cheap and synchronous.** It re-renders constantly. You never want it shelling out to `bw status` and a `gcloud` token fetch on every frame. Caching the expensive check and reading the cache is what makes it viable at all.
- **Session start is where the expensive check belongs** — once, when the cost is acceptable.
- **The cache file is the clean seam.** Producer writes, consumer reads, neither cares about the other's timing.

The one honest limitation: the bar reflects the **session-start** snapshot. A token that dies mid-session won't update it until the next session. For "tell me when I sit down," that's exactly the right granularity. If I needed live status, the hook (or a small timer) would refresh the cache on an interval.

## The lesson I actually paid for

It took three failed attempts to get here, and they were all the same mistake in different clothes: **treating a verifiable fact — "which hook channel is visible to the user" — as something to reason about instead of something to look up.**

- Attempt one: an assumption about what was broken.
- Attempt two: trust in a confident but unchecked claim.
- Attempt three: finally reading the documentation.

Each of the first two ended with me typing *still not working* and restarting a session. The lookup that settled it took about thirty seconds. When a system's behavior is documented and testable, find out — don't deduce. Confidence isn't evidence, no matter whose confidence it is.

And the payoff for stopping the fight: the real solution is small, boring, and correct. A check, a file, a status line. Which is exactly what good infrastructure is supposed to be.
