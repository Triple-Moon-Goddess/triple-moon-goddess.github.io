---
layout: post
title: "The Back Office in One Folder: Reliable Enough to Trust, Safe Enough to Back Up"
date: 2026-07-04
---

Running a one-person business means you are also its bookkeeper, its operations department, and its IT team. Nobody hands you a back office — you either build one or you drown in the parts of the work that aren't the work.

Mine lives in a single folder. Claude Code runs it, and the deal I've made with myself is that it should cost about ten minutes a week. Inside that folder are a few small skills and some plain-text data: a ledger, a subscriber list, an expo schedule, a set of categorization rules the system has learned from watching me. I drop a bank export into an `inbox/` and say *"do my books,"* and it reconciles the month, asking me only about the rows it genuinely can't place. I say *"what's coming up"* and it reads my calendar for the next month and tells me what's unbooked or unpaid. Before an expo I say *"prep me for Palo Alto"* and it writes a one-page brief and a packing list.

It's a good little system. But this week I went to do the most boring, most important thing you can do to a system you depend on — **back it up** — and the act of backing it up forced two decisions I'd been quietly avoiding. Both are worth writing down, because they're the difference between a back office that's convenient and one you can actually trust.

## First it has to be reliable — and the connection kept dying

Before you back something up, you notice how often it's broken. And the thing that kept breaking was the connection between Claude on my desktop and GitHub, where the code for all of this lives. Several times a day, Claude Desktop would announce, with total confidence, that it had no GitHub connection at all.

My first instinct was the obvious one: a token expired, an auth thing, log in again. That instinct was wrong, and it's worth saying why, because it's the same wrong instinct every time. The credentials were fine. I checked — the login was valid, the token worked, the endpoint answered on the first try. Nothing was misconfigured. The plumbing was healthy and the tap still ran dry.

The real cause was quieter. The desktop app reaches GitHub through a tiny local relay — a bridge that keeps the connection authenticated so it doesn't expire mid-session. And that bridge had one fatal habit: **the moment the connection to GitHub dropped, it shut itself down.**

Connections drop all the time. The laptop goes to sleep. The network hiccups. GitHub quietly closes a link that's been idle too long. None of that is exceptional — it's just Tuesday. But the bridge treated every one of those ordinary events as the end of the world and exited. And here's the part that turned a hiccup into an outage: **the desktop app does not restart a helper that has died.** So the bridge would quietly exit the first time I left the laptop alone for a while, and then simply stay dead — for hours — until I noticed and restarted everything by hand. The logs said it plainly, in hindsight: *closed unexpectedly… process exiting early.* Every idle afternoon killed the connection, and nothing was ever going to bring it back on its own.

Once that was clear, the fix stopped being about *preventing* drops — you can't; the network is the network — and became about *surviving* them. The bridge shouldn't die when GitHub goes quiet. It should reconnect, quietly re-do the small handshake that establishes a fresh session, and carry on as if nothing happened. The desktop app should never even learn a blink occurred. And the only thing that should ever shut the bridge down is me actually closing the app.

That's what it does now. It reconnects on its own, with a patient backoff if GitHub is slow to come back, and it runs a small heartbeat so it notices a silent death early instead of on my next click. I tested it the honest way — by deliberately severing the connection mid-session and watching it heal itself, list its tools again, and keep serving, all without the app noticing. The failure that used to cost me an afternoon now costs nothing, because recovery is invisible.

The reframe is the whole lesson: **resilience isn't the absence of failure, it's making recovery invisible.** A system that never drops is a fantasy. A system that drops and silently heals is just… reliable.

## Then it has to be safe — so I backed up the system, not the statements

With the connection trustworthy, I could finally do the backup. A private repository, so a folder living on one laptop isn't one spilled coffee away from gone.

And immediately: the question I'd been avoiding. What, exactly, goes into the backup?

Because that folder doesn't just hold tooling. It holds my actual books — the ledger, the personal spreadsheet, and the raw bank and credit-card statements the whole thing chews on. Backing all of that up to the cloud is the most natural thing in the world and also, if I'm honest, the riskiest. A private repo is private until an account is compromised or a permission is set wrong, and the day that happens I do not want my bank statements to be what's sitting there.

So I drew a line that turned out to be clarifying. **Back up the system, not the data.** The skills, the checklists, the rules the system has learned, the little bridge that keeps it connected — that's the part that took real work to build and would be genuinely painful to reconstruct. It's also completely safe to store: there's nothing in it but logic. It goes in the repo.

The financial data does not. And the reason it's okay to leave it out is the same reason it's dangerous to put in: it's *data*. The statements are re-downloadable from the bank any time. The ledger is something the system rebuilds from those statements on command. If the laptop died tomorrow, I'd clone the repo, pull down fresh exports, and say *"do my books"* — and the back office would reassemble itself. I'd lose nothing that isn't a few minutes and a download away.

There's a tidy way to say it: **back up the recipe, not the meal.** The recipe is small, safe, and the thing you can't easily reinvent. The meal you can always cook again — and you really don't want yesterday's sitting out in public.

## The principle

A back office you can trust has two properties, and I'd been treating them as one. It has to be **reliable** — which meant a connection that heals itself instead of dying at the first idle afternoon. And it has to be **safe** — which meant being honest about what's precious versus what's merely sensitive, and only ever cloud-backing the first.

The nice part is that both fixes made the system *smaller* to worry about, not bigger. One relay that reconnects on its own is one fewer thing I babysit. One repository that holds only logic is one fewer place my finances can leak. The ten-minute-a-week promise survives precisely because the parts underneath it stopped asking for my attention.

Build the back office nobody hands you. Then make it reliable enough to depend on, and safe enough to back up — and notice that those are two different jobs.
