---
layout: post
title: "The Technical Reasons Claude Avoids Work (It's Not What You Think)"
date: 2026-05-26
---

If you've worked with Claude long enough, you've noticed the pattern: asked to do something multi-step, it hedges, asks a clarifying question, or announces what it's *about* to do instead of just doing it. It feels evasive. It can feel lazy.

It's neither. Here's what's actually happening under the hood.

## Probability Collapse Toward Hedging

Claude was trained using RLHF — Reinforcement Learning from Human Feedback. Human raters evaluated responses and rewarded cautious, agreeable outputs in ambiguous situations. That reward signal got baked into the model weights. The result: in uncertain situations, the highest-probability next tokens statistically trend toward deferral and hedging rather than action. It's not a personality trait. It's a probability distribution.

## Attention Degradation in Long Contexts

Transformers compute attention scores across all tokens in the context window, but those scores degrade with distance. A detailed task spec written at the start of a long conversation loses weight against more recent tokens — like a tool error, a clarifying message, or even just a long tool output. The model doesn't "forget" in the human sense. It just down-weights distant context mathematically. The original instruction is still there; it's just quieter.

## No Persistent Compute

Claude doesn't run between turns. There is no background process, no state machine, no timer ticking away. Every response is a fresh forward pass from the full context. What looks like "avoiding" work is often just the model having no mechanism to act without a prompt. If it didn't finish something last turn, that work is gone — not paused.

## The Sycophancy Gradient

RLHF training creates pressure toward responses that *feel* agreeable and collaborative. "Let me know when you want me to proceed" tends to score better in human feedback than silently doing the thing. So the model learns to ask rather than act — not because it's being considerate, but because that pattern was reinforced during training.

## Tool-Call Cost Aversion

Multi-step task completion requires the model to maintain coherent reasoning across many sequential inference steps, each of which is a separate forward pass. The probability of a coherent chain completing *correctly* degrades multiplicatively with each step. Shorter, simpler outputs are statistically preferred because the model's training implicitly penalizes error accumulation across long chains.

## Instruction Recency Bias

Recent context receives higher attention weight than earlier context. A single ambiguous sentence near the end of a long conversation can effectively override a detailed task spec from earlier — not because the model chose to ignore the spec, but because the math of attention scoring made recent tokens louder.

---

## The Short Version

RLHF optimized for *approval of individual responses*, not *completion of multi-step tasks*. Attention and probability math compound that at inference time. The avoidance is structural, not attitudinal.

Which means the fix isn't patience or rephrasing. It's understanding the failure modes: keep task specs close to the end of context, give explicit permission to act without confirming, and break long chains into shorter prompted steps.

The model isn't reluctant. It's just doing exactly what the math says to do.
