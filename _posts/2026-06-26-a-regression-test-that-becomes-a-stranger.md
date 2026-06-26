---
layout: post
title: "A Regression Test That Becomes a Stranger Every Time It Runs"
date: 2026-06-26
---

Most of my automated tests check the path I've already walked. They sign in as a returning user — someone who already has a saved chart, whose email the system recognises, who sails past the front door because they've been through it before. That's useful. It's also a blind spot, because the single most fragile experience on the whole platform is the one those tests never touch: a brand-new person arriving with nothing, meeting the privacy gate for the first time, and trying to create an account from scratch.

So I taught my regression suite to become a stranger. Every time it runs, it forgets everything it knows and walks in the front door like it's never seen the place.

## Why returning-user tests lie to you by omission

My paid-reading test is a good example. It uses an email that already exists, because that's the fast way to get to the part it cares about — the payment. But that email skips the entire first-time flow: the consent screen, the empty form, the moment a never-before-seen address turns into a real account with a real chart. If something broke in *that* sequence, every one of my tests could stay green while a first-time visitor hit a wall.

The riskiest screen is the one your tests have a saved password for.

## Incognito by construction

The fix starts with throwing away the test's memory. The new journey runs in a fresh browser context with **no saved state at all** — no cookies, no stored consent, nothing. It's the same thing you get when you open an incognito window. That one decision forces the test to meet the real privacy-consent gate and click through it, exactly like a first-time visitor, instead of quietly inheriting a "yes, I already agreed" from a previous life.

There's one piece I *don't* make it relive: the anonymous sign-in handshake with Firebase is mocked, so running the test on a loop doesn't trip the "too many requests" rate limit. But that's separate from the browser's memory — the session is still genuinely blank, so consent and account creation happen for real.

## A new person on every single run

Here's the trick that makes it a true stranger. The test signs up as `lisa67+<something-unique>@gmail.com`, where the unique part is a timestamp generated the moment it runs. Gmail's plus-addressing means every one of those still lands in my real inbox — but to the platform, each is a brand-new human it has never met. The "oh, welcome back" shortcut can never fire, because there is no "back." It's always someone new.

So the test does the whole thing: passes the consent gate, types in the new email, fills out a birth date, time, and place, and submits. Then it watches the platform calculate a natal chart from nothing and confirms the finished chart actually renders on screen — not a spinner, not an error, the real thing. Once that works, it walks every public app in turn — the chart, the health journal, the blueprint, the daily widget, the tea blend — and confirms a first-timer can get through each one's front door without hitting a crash.

## The little lie that almost cost me an hour

One detail is worth telling because it nearly fooled me. The consent screen has a button, and my first instinct was to find that button to know the gate was there. The problem: until you tick the box, the button doesn't say "I agree" — it says "Please tick the box above." So my detector looked for "I agree," didn't find it, decided there was no gate at all, and sailed right past it into a wall.

The fix was to stop identifying the screen by the button that changes and start identifying it by the text that doesn't. A small thing, but it's the whole game in UI testing: anchor on what's stable, not on what's in the middle of changing.

## It cleans up after itself

A test that creates a real account every time it runs will quietly bury your database in junk if you let it. So this one remembers exactly what it made and deletes it when it's done — the chart and the identity record, both gone at the end of the run. It finds them the same way the app itself does: the platform never stores your raw email, only a one-way fingerprint of it, so the test recomputes that same fingerprint to locate precisely the account it just created and nothing else.

The cleanup is deliberately polite about credentials. If it has the keys to tidy up, it does. If it doesn't, it says so out loud and still passes, rather than failing a perfectly good test over housekeeping. (When I first wired it up my own credentials had expired, so it left a couple of test accounts behind, told me, and I swept them once I'd logged back in. The test was right to shrug and keep going.)

## The short version

If your tests always log in as someone the system already knows, they're rehearsing the easy path and skipping the scary one. The most valuable thing a regression test can do is forget — start blank, become a stranger, and walk through the front door the way a real new customer will, all the way from "I've never been here" to "here's my chart." Make it new every time, make it clean up its own mess, and anchor it on the parts of the screen that hold still.

---

*Related: [It Works in Dev: Chasing a Permissions Drift Between Environments]({% post_url 2026-06-26-it-works-in-dev-permissions-drift %}) — another case of a test environment quietly hiding the thing a real user would hit first.*
