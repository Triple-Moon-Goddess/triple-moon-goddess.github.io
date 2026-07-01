---
layout: post
title: "The Push That Looked Like a Deploy: Escaping an HTTP 409 Storm"
date: 2026-07-01
---

I pushed a batch of admin-portal work to production — a new vertical admin menu, and a birth form that now collects consent for session recording — watched the deploy go green, and moved on. Days later the changes were gone. Not just from production: from my dev site too. It looked like something had reverted my work in both environments at once.

Nothing had reverted. The work was safe the whole time, sitting on the `main` branch exactly where I left it. The problem was quieter and worse: **it had never actually deployed.** Every push since had failed to ship — silently — while reporting success.

## The symptom

Production and dev were both serving an old version, one from before the feature existed. Git showed my commits on `main`. GitHub showed green checkmarks on the deploy runs. The live site showed the past.

Three sources of truth, and only the live site wasn't lying. The tell was embarrassingly simple once I looked: I compared the version string the live site was serving against the version I thought I'd shipped. They didn't match, and they hadn't matched for days.

## What a 409 storm actually is

Our backend is essentially one file that exports about 84 cloud functions. Because they share a file, editing *any single one* rebundles *all* of them, and a normal `firebase deploy --only functions` then fires ~84 second-generation deploy operations at nearly the same instant.

The platform caps how many of those operations can be in flight at once. Go over the ceiling and each additional operation comes back with `HTTP 409 — unable to queue the operation`. So a routine one-line change to one function set off a stampede of 84 deploys, most of which bounced off the limit with a 409, and the deploy as a whole failed.

That part is a known, explainable limit. The damage came from what sat on top of it.

## Why it kept fooling me

The deploy ran automatically on every push to `main`. When the 409 storm knocked it over, the failure didn't land loudly enough to notice — a retry here, a step that swallowed the error there — and the next push looked exactly like the last: green, done, shipped. Meanwhile the live version never moved.

A push *looked* like a deploy. It wasn't one. And "the CI is green" had quietly stopped meaning "the change is live" — those are two different claims, and I'd been reading the first as if it were the second.

## The rabbit hole

Here's the part worth confessing. For weeks, my Claude sessions and I kept trying to *fix* the 409: deploy the functions in batches of five and wait for each batch to settle; retry only the ones that bounced; detect which functions actually changed so we'd deploy fewer of them. Every one of those is a reasonable idea. None of them stuck, because they were all attempts to make an unreliable automatic pipeline reliable.

I had asked, more than once, to just **turn the automatic deploy off** and ship by hand. It kept not happening — each session reached for a cleverer fix instead of the off switch. The git history is almost funny in hindsight: a long row of `fix(ci)` and `ci(deploy)` commits, and not a single `disable`. We were so busy repairing the thing that lied to us that nobody stopped to unplug it.

## The fix: stop deploying automatically

The answer wasn't a better retry loop. It was to stop pretending this needed to be automatic.

Deploys now run from my terminal: a plain deploy command, from a clean `main`, as one deliberate step I watch to completion. If a 409 ever shows up, I see it and re-run — no storm, because a single deliberate deploy doesn't fire 84 operations in a panic. And I **disabled the deploy-on-push entirely**, so a push can never again masquerade as a release. Pushing code and shipping code are now two separate acts, and only one of them touches customers.

The deploy script also refuses to run unless it's on a clean `main` that matches the remote — so I can't accidentally build and ship the wrong branch, which was its own near-miss.

## The smaller truths that fell out

Pulling on this one thread loosened three others, each worth a sentence:

- **Build output was committed to git.** The generated bundle was tracked, so every build rewrote tracked files and left the tree "dirty" — which then blocked the next deploy. Build output belongs on disk, not in version control.
- **Version bumping lived only in the pipeline I just disabled.** Turn off the automation and you also turn off the thing that incremented the version — and if the version never changes, returning visitors' browsers keep serving the cached old app forever. That logic had to move into the manual deploy.
- **A deploy script hardcoded a folder path** that could point at whatever branch happened to be checked out there. That's how the wrong code nearly shipped in the first place.

None of those were the 409. All of them were hiding behind it.

## The principle

A deploy that fails *loudly* is a good day — you know immediately and you fix it. A deploy that fails *silently* is a trap that springs later, after you've forgotten you were near it. The whole cost of this bug was the gap between "it reported success" and "it was actually live."

So two things I'm keeping. First: **green is not live.** The only version that counts is the one the live site is actually serving, and that's a thing to verify, not assume. Second: when a piece of automation's defining behavior has become *lying to you*, the fix is rarely a cleverer version of the automation. Sometimes the most reliable pipeline is the deliberate one you run by hand and watch finish.

## The short version

My work wasn't reverted — it had never deployed, because an auto-deploy was failing silently in an HTTP 409 storm while reporting success. The fix wasn't to make the automatic deploy smarter; it was to turn it off and deploy deliberately from the terminal, where success and failure are both visible. If your pipeline can fail without telling you, it will — and it'll pick the worst possible moment to let you find out.

---

*Related: [It Works in Dev: Chasing a Permissions Drift Between Environments]({% post_url 2026-06-26-it-works-in-dev-permissions-drift %}) — another case where the environment, not the code, was telling the truth. And [Many Claudes, One Codebase]({% post_url 2026-06-13-many-claudes-one-codebase %}) on the enforce-it-don't-remember habit these fixes keep coming back to.*
