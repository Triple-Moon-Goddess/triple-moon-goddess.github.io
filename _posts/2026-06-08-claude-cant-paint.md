---
layout: post
title: "Claude Can't Paint: Building a 20-Character Art Pipeline with Two AIs"
date: 2026-06-08
---

I run this whole platform on Claude. It writes the readings, reasons about charts, and pair-programs the infrastructure with me. So when I decided my image-based readings needed actual *art* — a cast of planet-characters you could see — my first instinct was to ask Claude to make them.

Claude can't make them. Not "won't" — *can't*. It's a language-and-vision model: it can **read** an image and tell you what's in it, but it has no image-**generation** capability. There is no Anthropic model that paints a picture from a prompt. I'd been treating "AI" as one thing. It isn't.

That single fact reorganized the entire build.

## Right tool, right job

The fix wasn't a better prompt. It was admitting that no one model does everything, and splitting the work:

| Job | Tool | Why |
|---|---|---|
| Reading text, chart logic, the platform | **Claude** (Anthropic) | language + reasoning, already running everything |
| Generating the character art | **OpenAI `gpt-image-1`** | it actually paints — and exports transparent PNGs |
| Compositing, glyphs, consistency | **Python** | deterministic, exact, free |

Claude is also what designed and wrote the Python glue, and what translated my astrology framework into art prompts. The image model never touches text reasoning; Claude never touches pixels. Each does the one thing it's actually good at.

## The combinatorics that forced layering

A placement isn't one thing — it's a planet, in a sign, in a house. In my framework: the **planet** is the character, the **sign** is its costume, the **house** is the setting. Render every finished combination and you're looking at 10 × 12 × 12 = **1,440 images**.

So you don't render finished scenes. You render **layers** — each as a transparent PNG on a fixed canvas — and composite them per chart. Build the parts once, stack them on demand. That decision is why every character had to be a clean cutout with nothing behind it.

## Two characters per planet

Each planet in my system has a bright expression and a shadow expression — defined by its *Faculty*, *Process*, and *States*. So Mars isn't one character; he's a confident warrior **and** a snarling brute. The Sun is a radiant showman **and** a smug, arrogant blowhard. Twenty characters, not ten — the framework drove the art, not the other way around.

## The consistency trap

Here's the thing nobody tells you: **image models have no memory between calls.** Ask for "smiling Mars," then ask for "angry Mars," and you get two completely different beings — different head, different costume, different everything. The model never saw the first one.

The fix is image-to-image editing. Generate the bright version once, *lock it as the source of truth*, then generate the shadow version **from that locked image** — "same character, change only the expression." The design stays identical; just the mood flips. Same trick will keep each planet recognizable later across all twelve of its sign-costumes.

## Transparency, or it doesn't layer

Transparent backgrounds turned out to be the fussy part. The model will happily paint a gorgeous full scene around your character unless you aggressively forbid it — "isolated cutout, NO background, NO scenery, NO halo." Even then, the dreamy characters (Neptune, Uranus) came back wrapped in a glowing aura that *looked* transparent but wasn't, and would have haloed against any backdrop. Each got a second editing pass to strip the glow. If it isn't a clean cutout, the whole layering idea collapses.

## The thing AI genuinely cannot do: glyphs

Every character wears its planet's astrological symbol on its forehead. The image model **cannot reliably draw these.** Pluto came out wearing Mercury's glyph. Saturn's was a scribble. These are precise, culturally-fixed symbols, and a model that paints by vibe gets them wrong every time.

So I stopped asking it to. Python (Pillow) stamps the **real** glyph on after generation — the canonical Unicode character rendered from a font, or hand-drawn for the two glyphs fonts don't carry (Pluto's, and Uranus's `)+(` form). Deterministic code is *always* right. This is the whole lesson in miniature: use the generative model for the generative part, and exact code for the part that has exactly one correct answer.

## What it actually felt like

Not push-button. I art-directed every character — "more playful," "she looks like a monster, make her scared," "drop the phoenix, hood him like a criminal" — and we iterated until each one landed. I hit OpenAI's billing hard limit mid-run and had to top up. A key leaked into a log and got rotated. AI-augmented doesn't mean effortless; it means the effort moves from *making* to *deciding*.

## The short version

There is no single "AI." Claude reasons and writes; an image model paints; neither can do the other's job. The wins came from putting each where it belongs — and handing the parts with exactly one right answer (the glyphs, the compositing) to plain, deterministic Python. Twenty planet-characters, two faces each, every symbol correct. None of the three could have done it alone.
