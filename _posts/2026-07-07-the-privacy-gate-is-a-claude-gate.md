---
layout: post
title: "The Privacy Gate Is a Claude Gate"
date: 2026-07-07
---

My platform has one privacy rule that sits above all the others: **client names never enter the system.** Not in a database, not in a form, not in a PDF. Every client is an access code, and the page that maps codes to human beings is a paper journal in my handwriting. Email lives in one encrypted vault, birth data in another, and everything else connects by code. If you read every table I own, you'd find geometry belonging to locker numbers.

That rule was written down in three places: the repo's instruction file that Claude Code reads at the start of every session, the standards document it's required to re-read, and Claude's own persistent memory of my corrections. Three copies of the same sentence, all binding.

This week, Claude built me a beautiful new relationship-reading module — and put a name field in it. Two, actually. *"Partner A display name (labels only — not stored)."*

"Not stored" is not the bar. A name typed on a screen is already an artifact — in a browser, in a download, in a screenshot. The pseudonym architecture doesn't have small holes; it has holes. I told it so, and it fixed the fields in minutes, contrite as ever. And then I said the thing that actually mattered: *I want a solution once and for all, so this never happens again.*

## Rules that ask, gates that block

Here's what I'd already learned the hard way, months ago, about a different problem. Claude used to be able to deploy my platform — and one bad afternoon taught me that "please don't deploy without asking" is not a control. So we built a machine-level lock: every deploy path from inside a session is physically blocked unless I issue a one-shot grant from my own terminal. Since that day, the deploy rule has never been broken. Not because the model got more obedient — because the rule stopped being a sentence and became a wall.

The privacy rule was still a sentence. Three copies of a sentence, and the model wrote a name field anyway, because a model under pressure to ship a feature will drift past prose it has technically read.

So the fix wasn't a fourth copy. The fix was a gate — and let's be precise about what it gates. It doesn't gate my users. It doesn't gate my data. **It gates Claude.**

## What the gate does

It's one small script in the repo, and it stands in two doorways.

The first doorway is the keyboard. Every time Claude tries to write or edit a file, a hook hands the change to the gate before it touches disk. If the change collects a person's name — a `clientName` variable, a "full name" label, a "display name (labels only)" field — the write is refused, and the refusal comes back to the model with the rule attached: *client names never enter the system; people are Partner A/B or access codes.* The same check blocks lookups by unencrypted email and blocks birth data being written anywhere but its vault.

The second doorway is the deploy. Before anything ships — to the test environment or to production — the gate reads the entire codebase. One violation, and the deploy exits. Not a warning in a log. A stopped release.

Two details turned out to matter more than I expected. The gate **tests itself first**: every run begins by proving it can still catch the known violations, so if the watchdog goes blind, the watchdog fails the build. And it keeps a **ratchet**: the legacy hits from before the gate existed are recorded on a review list that is only allowed to shrink. New code answers to the full rule from day one; old code gets burned down deliberately instead of grandfathered forever.

## The gate caught Claude the same day

The best part of this story is the part that would embarrass a salesman.

Hours after the gate went live, Claude was building the encrypted vault for consent-form signatures — the one legitimate place a legal name must exist, sealed under keys no browser ever holds. Mid-task, the gate blocked it. Its own migration code mentioned the legacy name field it was built to remove, and the gate doesn't care about intent.

Claude didn't argue and didn't work around it. It added a narrow, documented exception for that one file — visible in the diff, reviewable by me — and moved on. That's the whole model of working with an AI assistant in one moment: the machine proposes, the gate refuses, the exception is explicit, and the human can audit every word of it.

The gate also went digging through code that predates it, and found real things: a field typed as "client's full name" on an old order record, lookups still keyed on plaintext email. Fixed, or queued on the shrinking list — but *found*, by a script, not by hoping someone re-reads the standards document on the right afternoon.

## Why this is the future of working with these tools

I use Claude Code for nearly everything technical at Triple Moon Goddess, and it is genuinely good. It is also a very fast typist with no stake in my liability. The lesson of this week is not "AI can't be trusted with privacy." It's sharper than that:

**Anything you'd fire a contractor for should be enforced by a gate, not a paragraph.** Documentation asks. Gates block. My deploy rule became unbreakable the day it became a wall, and my privacy rule joined it this week. The instructions files are still there — they explain the *why* — but the *no* is now mechanical.

Your name still isn't in my system. The difference is that now, that sentence doesn't depend on anyone — human or machine — having a good day.

*— Lisa*
