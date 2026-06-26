---
layout: post
title: "It Works in Dev: Chasing a Permissions Drift Between Environments"
date: 2026-06-26
---

Practitioner sign-in worked perfectly in my dev environment and threw a blank `500 INTERNAL` in production. Same code, same deploy, two different outcomes. That gap — *works here, breaks there* — almost always means the difference isn't in the code. It's in the environment. This time it was a single missing permission, and chasing it down turned into a small lesson about how two environments quietly drift apart.

## The symptom

A new practitioner signs in, the app calls a backend function to grant them their role, and... 500. No detail in the browser — just `INTERNAL`, the generic shrug a backend gives for any uncaught error.

The function log had the real story: the backend tried to set the user's account permissions and was told it didn't have the right to. The code that grants a practitioner their access needs permission to *update a user* — and in production, the account the backend runs as simply didn't have it.

## Why dev didn't catch it

Here's the part that stung: dev worked. Not because dev was set up correctly — because dev was set up *too* permissively. The dev backend was running with a broad "admin" grant over the auth system, wide enough to cover the update by accident. Prod had no such grant, so prod was the one telling the truth.

So I actually had two problems, not one:

| Problem | What it meant |
|---|---|
| **Prod was missing a permission** | The real, customer-facing break — practitioners couldn't activate. |
| **Dev had an over-broad one** | The reason the gap stayed invisible until it hit production. |

The over-grant in dev wasn't a convenience. It was camouflage — it hid a real prod gap behind a "works on my machine."

## The fix: ask what the code actually does

The instinct under pressure is to slap the same broad admin role on prod and move on. That clears the symptom and keeps the bad pattern. Instead I listed every privileged thing the backend actually does to user accounts — and it was a short list: look a user up, and update a user's claims. Two operations. Nothing else.

So I built a **custom role with exactly those two permissions** and nothing more, and bound it to the backend on *both* projects. Then I removed the broad admin grant from dev. Now dev and prod hold the identical, minimal permission for this — and "it works in dev" means something again, because dev is no longer cheating. While I was in there I found another over-broad "admin" role on prod where a narrower read/write pair would do, and narrowed that too.

## The real principle: same except where noted

The bug underneath the bug was *drift*. The two environments had been set up at different times and had quietly diverged — different roles, different breadth, no record of which differences were intentional. So I wrote the differences down: dev and prod should hold the **same** permissions, except for a short, explicit list of deliberate exceptions (prod builds and ships its own functions, for instance, so it legitimately carries a few build-and-deploy roles dev doesn't). Every exception has its reason sitting right next to it.

That document is good. But a document is just another rule someone has to remember — and the whole reason this bug existed is that nobody was checking.

## So I made it enforce itself

The last step is the one that actually keeps this fixed. My pre-deploy checklist — the script I run before shipping to production — now **compares the two environments' permissions automatically**. It asserts the shared baseline is identical, allows only the exceptions I documented (by name, with their reasons), and **fails the deploy** if anything else has crept in: a permission added to one side but not the other, or a broad "admin" grant sneaking back.

If a future session — me or one of my Claude sessions — re-introduces an over-grant, the deploy stops and says so, pointing at exactly which role and which environment. The parity rule isn't a note in a doc anymore. It's a gate.

## The short version

"It works in dev" is only reassuring if dev is configured like prod. A too-generous dev environment doesn't prevent production bugs — it hides them until a customer finds them. The fix has three parts: give each environment the *narrowest* permission the code actually needs; write down every place they're allowed to differ, with the reason; and make a check enforce that parity so they can't silently drift again.

Least privilege isn't a one-time cleanup. It's a property you have to keep — and the only way to keep it is to stop trusting anyone to remember.

---

*Related: [Many Claudes, One Codebase]({% post_url 2026-06-13-many-claudes-one-codebase %}) — the same enforce-it-don't-remember idea applied to parallel AI sessions sharing one repo.*
