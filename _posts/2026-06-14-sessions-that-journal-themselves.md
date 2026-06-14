---
layout: post
title: "Sessions That Journal Themselves: Logging Claude Code and Claude Desktop Into Obsidian"
date: 2026-06-14
---

I build and run this platform with Claude — coding in Claude Code in the terminal, and doing longer planning and writing work in the Claude Desktop app. The trouble with working this way is that an enormous amount of context lives inside conversations that vanish the moment I close the window. What did we decide about the encryption pivot? Why did the deploy flow change? What broke on Tuesday and how did we fix it?

For a while my answer was "scroll back and hope." Now my sessions write themselves down. Here's the setup.

## The goal: one vault, one timeline

Everything funnels into a single Obsidian vault. It's become my one knowledge base — I migrated off Notion entirely, and my GitHub docs library mirrors into it read-only. Obsidian Sync keeps it current on every device.

What I wanted was simple to say and annoying to do by hand: **every working session — terminal or desktop — should leave a note in that day's daily note under a `## Work log` heading.** No copy-paste, no "I'll write it up later" (I never do).

## Two different tools, two different mechanisms

The catch is that Claude Code and Claude Desktop are completely different programs, so each needed its own road to the same destination.

**Claude Code (the terminal).** Claude Code supports *hooks* — scripts that fire on lifecycle events. I use the `SessionEnd` hook. When I close out a coding session, the hook runs automatically, summarizes what the session did, and appends it to the day's daily note under `## Work log`. I never touch it; it just shows up.

**Claude Desktop (the app).** The desktop app doesn't have hooks, so it's a two-part setup:

| Piece | Role |
|---|---|
| **Filesystem MCP server** | The *capability*. It gives Claude permission to write files directly into the vault. |
| **A logging skill** | The *instructions*. It encodes exactly where the daily note lives, the `## Work log` heading to append under, and the format each entry should take. |

The skill is what makes the desktop side reliable. Without it I'd be hoping I remember to say "please log this" and describe the format every time. With it, the routine is captured once — so desktop sessions document themselves into the same daily note, in the same shape, as the terminal ones. The MCP server *can* touch the vault; the skill knows *how* a work-log entry should be written. Together they make the desktop app behave like the terminal's `SessionEnd` hook, just reached by a different route.

The payoff: both halves of my day — the coding and the thinking — land in one chronological place, no matter which tool I was in.

## Why the daily note, specifically

My vault follows a PARA-style workflow built on native daily and periodic notes. Putting session logs in the daily note means I never have to decide where anything goes — the date is the index. When I need to reconstruct "what happened the week we stood up production KMS," I open those daily notes and the work log is right there, woven in next to whatever else I captured that day.

(One hard-won detail: I use Obsidian's built-in `{{date}}` tokens for those templates, *not* a templating plugin — the plugin kept leaving raw code or blank notes in the daily-note flow.)

## A couple of things I learned the hard way

- **Keep `.git` out of the vault.** Obsidian Sync and a git repo in the same folder fight each other. Since my GitHub library mirrors *into* the vault, I had to be deliberate about not letting version-control metadata leak in.
- **Automation that rebuilds is dangerous; automation that appends is safe.** A separate nightly mirror job once gutted about a hundred notes in a "destructive rebuild" after a network blip. Append-only logging — like the work-log hook and skill — is far safer than anything that regenerates files. If you automate writes into a vault you care about, prefer adding over replacing.

## Why this matters for a one-person business

I'm a solo operator. There's no team standup where context gets shared out loud — if I don't capture it, it's gone, and I'm the only person who can lose it. Letting my tools journal themselves turns every session into a permanent, searchable record without adding a single chore to my day.

## The short version

Claude Code logs itself with a `SessionEnd` **hook**. Claude Desktop logs itself with a filesystem **MCP server** (the capability) plus a **skill** (the instructions). Both append to the same `## Work log` heading in the same daily note. The work documents itself — and future-me gets to read it.
