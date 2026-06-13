---
layout: post
title: "Many Claudes, One Codebase: Keeping Parallel AI Sessions From Clobbering Each Other"
date: 2026-06-13
---

I build this platform with Claude — and often with *several* Claude sessions open at once, each on a different job. One's fixing an email bug, another's adding a new reading product, a third's chasing a deploy. It's like running a small team. And like a small team sharing one repo, they will step on each other the moment you let them.

This week one of them did. Here's what broke, why, and the dead-simple system that fixed it.

## The collision

The setup had two fixed "desks" — two git worktrees, `wt-a` and `wt-b`, each pinned to its own branch. Each session was told to grab one and work there. The flaw: sessions *self-selected* a desk, and nothing stopped two of them from sitting at the same one.

That's exactly what happened. Two sessions both landed on `wt-a` and were committing to the *same branch*. When my email-fix session finished and pushed its work up to `main`, it carried the other session's half-built feature along with it — a commit I had never reviewed, now sitting on the main line and heading toward production.

Nothing was lost. But that was luck, not design. A push from one worker silently shipped another worker's work.

## Two things were quietly shared

Once I traced it, the problem split cleanly in two:

| What was shared | Why it bit | 
|---|---|
| **A pool of two branches** | Sessions picked from a fixed set, so two could pick the same one and end up committing to the same branch. |
| **One dev/test environment** | Every session that wanted to test deployed to the *same* dev project, overwriting whatever the last one put there. |

The first caused the swept-in commit. The second meant even when sessions *were* on separate branches, only one could meaningfully test at a time.

## Fix part 1: a private, disposable workspace per session

Git worktrees let one repo have many working folders, each on its own branch, all backed by the same history. So instead of a shared pool of two, every session now creates its **own uniquely named worktree** the moment it starts real work — and tears it down when the work is done.

| Stage | What the session does |
|---|---|
| **Start** | Creates a fresh worktree on a uniquely named branch off the latest `main`. Never reuses another session's. |
| **Develop** | Works only in its own folder, on its own branch. Fully isolated from every other session. |
| **Integrate** | Before merging, it checks that the commits it's about to push are *only its own* — if anything unexpected appears, it stops and asks me. |
| **Destroy** | After the work lands on `main`, it deletes its worktree and branch. No leftovers for the next session to stumble onto. |

That one check — *"does this push contain only my own commits?"* — is the guardrail that would have caught the original mess outright.

## Fix part 2: you can't clone a shared test environment cheaply, so take turns

The obvious instinct is "give every session its own test environment too." But the backend runs on database triggers — code that fires automatically when data changes. You can't run two copies of that against one shared database without them both firing; truly isolating it means standing up an entire parallel project per session, with its own copy of every secret and every record, kept in sync by hand. For a solo operator, that's a maintenance tax with no payoff.

So I didn't fight it. **Coding happens in parallel; testing happens one at a time.** A session must ask me before it deploys to the shared dev environment, and wait for the go-ahead. It's a single lane on purpose — and that's fine, because the expensive, parallelizable part (writing the code) is already isolated.

## The lifecycle now

1. A new session spins up its **own** workspace — a fresh worktree on a uniquely named branch.
2. It develops there, fully walled off from the others.
3. Before testing, it **asks me** — the test environment is shared, one session at a time.
4. I give the go-ahead; it deploys to dev; I verify the fix actually works.
5. Only my-approved work merges to `main` — and the push is verified to contain *only* that session's commits.
6. The session **destroys** its workspace.

## The short version

Parallel AI sessions are a real force multiplier — right up until two of them share a branch, and one quietly ships the other's unreviewed work. The fix wasn't fancier tooling. It was three boring rules: give each session a private, disposable workspace; let them all *write* at once but *test* one at a time; and never let a push carry a commit nobody reviewed.

The isolation is what makes the parallelism safe.
