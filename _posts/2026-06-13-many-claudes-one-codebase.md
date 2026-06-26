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
3. Before testing, it **claims a shared dev lock** — if another session already holds it, the claim is refused and names which session has dev. One session tests at a time, enforced, not just agreed.
4. I give the go-ahead; it deploys to dev; I verify the fix actually works.
5. Only my-approved work merges to `main` — and the push is verified to contain *only* that session's commits.
6. The session **destroys** its workspace.

## Update (June 26): "take turns" needed to be a lock, not a request

Two weeks in, the take-turns rule failed anyway — and the failure was the same shape as the first one. Several sessions were running. The rule said *ask before you deploy to dev*. But that rule lived in each session's instructions, not in anything that could actually stop one. So when things got busy, two sessions each deployed to the shared dev environment believing it was free, and overwrote each other's tests. Both then told me, in complete good faith, that "the other session caused the problem." They were both right.

Same lesson as the swept-in commit: a rule a worker has to *remember* is a rule that eventually gets skipped. If sharing is the danger, the guardrail can't be a line in the instructions — it has to be something the worker physically runs into.

So "take turns" is now a **lock** that every session on the machine can see:

- **Dev is free?** The session claims it, deploys, and **holds the claim through testing** — the shared environment is occupied the whole time it's being tested, not just during the deploy.
- **Dev is taken?** The claim is **refused**, and it names the exact branch and workspace that own dev right now. That's a stop sign, not a suggestion.
- **Done testing?** The session **releases** it and the next one goes. A claim held too long is flagged stale, so a genuinely abandoned one can be reclaimed.

The philosophy didn't change — write in parallel, test one at a time. What changed is that "one at a time" is now enforced by the machine instead of by everyone's good intentions. It's the same move as the *only-my-own-commits* check on every push: the safest behavior is the one the tooling makes automatic, so no one has to be trusted to recall it.

## The short version

Parallel AI sessions are a real force multiplier — right up until two of them share a branch, and one quietly ships the other's unreviewed work. The fix was three boring rules: give each session a private, disposable workspace; let them all *write* at once but *test* one at a time; and never let a push carry a commit nobody reviewed. And the rules only hold once the tooling enforces them — a lock for the shared test lane, a commit check on every push — because a rule a session has to *remember* is one it will eventually skip.

The isolation is what makes the parallelism safe. The enforcement is what keeps it safe when no one's watching.

---

*Related: [It Works in Dev: Chasing a Permissions Drift Between Environments]({% post_url 2026-06-26-it-works-in-dev-permissions-drift %}) — the same lesson (enforce it, don't trust anyone to remember) applied to keeping dev and prod permissions honest.*
