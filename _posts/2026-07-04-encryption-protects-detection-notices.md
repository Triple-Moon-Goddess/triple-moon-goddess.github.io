---
layout: post
title: "Encryption Protects, Detection Notices: Building a Breach Tripwire"
date: 2026-07-04
---

We'd just finished encrypting the sensitive data at rest — the emails and birth details people trust us with — behind a managed key. A stolen backup or a leaked database dump is now unreadable to whoever holds it; without the key it's noise. That felt like the finish line.

It was half of one. Encryption answers *"what if someone steals a copy of the data?"* It says nothing about *"what if someone is using the real data, right now?"* Those are two different questions, and I'd only answered the first.

## What encryption doesn't tell you

Encryption makes a copy worthless. It can't tell me whether someone is quietly turning the live data back into something readable — decrypting it in bulk, exporting the whole database, or granting themselves the ability to. Prevention is a locked vault. Detection is knowing when someone opens it. I had a very good lock and no alarm.

The uncomfortable version: before this, there was no record of *who read what*. If someone had walked off with real data, I wouldn't have been the last to know — I wouldn't have known at all.

## Watch the key, not every door

The obvious move is to log everything: every read of every record. It's also the wrong one. It's expensive, it's deafeningly noisy, and — now that the data is encrypted — it's low-signal, because a raw read returns ciphertext anyway.

Here's the insight that made the whole thing tractable: after encryption, there is exactly one way to turn stored data back into something readable, and that's to decrypt it through the one managed key. That key is the chokepoint. Every path to the real data runs through it. So instead of watching a million doors, I watched the one that matters. Legitimate decryption is occasional and quiet, which means an *un*-quiet moment stands out sharply — high signal, low cost, exactly backwards from logging every read.

## The signals worth an alarm

From there the alarm list almost wrote itself — the small set of things that should never happen without me hearing about it:

- a sudden spike of decryption (someone draining the vault),
- the whole database being exported at once,
- a change to *who* is allowed to decrypt,
- a new portable credential being minted.

Every one of those is a step on the path data takes when it's being stolen — the exfiltration path — not a normal Tuesday. Each now sends me an email the moment it happens. I deliberately did *not* try to alarm every footstep; I alarmed the path out the door.

## An alarm is only half an answer

An alert at 2am is useless if it just says "something happened." Panic isn't a plan. So each alarm ships with a one-page answer: what it means in plain words, and the first move — *who did this, and how do I shut it down.* The alarm tells you the door opened; the runbook tells you what to do about it before you're awake enough to think.

The other half of the answer is being honest about who does what. Some steps a machine can do instantly — read the logs, name the person or credential behind the event. Some steps only a human should ever do — revoke access, rotate the key, pull the plug. Writing that split down ahead of time is the difference between a calm 2am and a bad one.

## The tripwire caught me first

The best proof came free, on day one. I was rotating a credential as routine housekeeping — retire the old, mint a new one — and about a minute after I created the new key, my own alarm went off: *a new credential was just minted.*

For one honest second, my stomach dropped. Then I did exactly what the runbook says to do: check who did it. It was me. Stand down.

That's the entire system working end to end, on a real event instead of a drill. The action happened, the log caught it, the alarm fired, I checked the actor, and the answer was "known — that was you." If it had been *anyone* else, I'd have found out the same way, within the same minute. An alarm that goes off for your own hand is an alarm you can trust to go off for someone else's.

## The principle

Prevention and detection are different jobs, and doing one does not excuse skipping the other. Encryption means a stolen copy is worthless. Detection means I'd know if someone used the real thing. A vault with no alarm is just trusting that nobody ever gets in; an alarm with no vault is noise. You want both — the lock so the theft doesn't matter, and the tripwire so you are never the last to know.

A smaller truth fell out of it, too: testing the alarm meant actually triggering it, and triggering it surfaced an unrelated bug that had been quietly breaking a real feature for who knows how long. Alarms you never test are decorations. Proving this one worked paid for itself twice before it ever caught a real intruder.

## The short version

Encryption protects the data; it doesn't notice misuse. So I added detection: a tripwire on the one key that can turn stored data back into something readable, plus alarms on the handful of moves that mean someone is walking data out the door — each wired to a plain-language runbook so a 2am alert comes with its own answer. It proved itself on day one by catching my own routine key change within a minute. Encryption protects; detection notices; a serious system does both.

---

*Related: [The Push That Looked Like a Deploy]({% post_url 2026-07-01-the-push-that-looked-like-a-deploy %}) — another lesson in loud-versus-silent failure, and why "it reported success" is not "it actually happened." The whole point of a tripwire is to make the silent thing loud.*
