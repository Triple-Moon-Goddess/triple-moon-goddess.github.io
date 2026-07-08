# Triple Moon Goddess — Web Style Guide

Design system used across `triple-moon-goddess.github.io`. Any new page should match this so it drops into the existing site seamlessly. (Source of truth: `triple-moon-goddess-readings.html`.)

## Fonts (Google Fonts)
- **Cormorant Garamond** — display headings, leads, taglines, body-serif. Weights 300–600 + italic. Italic `<em>` in headings renders in cream ink, not gold.
- **Cinzel** — eyebrows, labels, tags, buttons, price rows. Always UPPERCASE, wide letter-spacing (0.16em–0.32em).
- **Inter** — base UI body font, weight 300.

```
Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400
Cinzel:wght@400;500;600
Inter:wght@300;400;500
```

## Color palette (CSS variables)
```
--gold:        #d4af6a
--gold-bright: #e8c989   /* headings */
--gold-deep:   #b8945a
--ink:         #f5e8d0   /* primary text */
--ink-soft:    #c9b896   /* secondary text */
--bg:          #0a0608   /* near-black cosmic */
--bg-deep:     #050304
--bg-card:     #110a0d
--line:        rgba(212, 175, 106, 0.18)
--line-strong: rgba(212, 175, 106, 0.4)
```

## Signature background
Dark body with two fixed layers:
- `body::before` — layered radial gradients (gold glow top-left + bottom-right, dark vignette center).
- `body::after` — scattered 1–2px radial-gradient "stars" with a slow `twinkle` 8s opacity animation (0.7 ↔ 0.4).

## Recurring components
- **Eyebrow**: Cinzel, uppercase, 0.32em, gold, flanked by `✦` via ::before/::after.
- **H1**: Cormorant 400, `clamp(2.6rem, 5.5vw, 4.5rem)`, gold-bright, italic `<em>` in ink.
- **Ornament divider**: 200px gold gradient line with a centered `☾` glyph on the bg.
- **Cards / frames**: dark translucent gradient, 1px `--line` border, `backdrop-filter: blur(8px)`, and decorative corner brackets via ::before/::after (top-left + bottom-right, gold-deep, opacity 0.5).
- **Primary CTA**: Cinzel uppercase 0.24em, gradient `gold-deep → gold-bright` on `--bg-deep` text; hover brightens + gold glow box-shadow.
- **Glyphs**: astrological/celestial unicode — `☾ ☽ ✦ ✧ ⚹ ⚴` etc.
- **Animations**: `fadeUp` (20px rise + fade) staggered by delay; `fadeIn` for the ornament.

## Inclusive imagery (non-negotiable)
- **Never use ♀/♂ (Venus/Mars) or any default male–female pairing to represent a couple or relationship.** Lisa and TMG are queer; the site must not assume heterosexual pairings. For couples/synastry, name the people directly and/or use neutral celestial motifs (e.g. two moons `☾ ☽`, stars, interlocking rings). This applies to icons, glyphs, illustrations, and stock imagery alike.

## Content conventions
- Reading offers are **$25**, delivered instantly online, **"$25 session credit included"** toward a 90-minute consultation with Lisa (the charter's Taurus-step → Scorpio-descent staircase).
- Voice: plain, unhurried, "a map rather than a verdict." No manufactured urgency, no FOMO. Stated once.
- Footer contact line: *Questions before you order?* → `Lisa@TripleMoonGoddess.com`.
- Prod pages omit the red `test-banner`; `*-prod.html` variants exist per page and use live checkout URLs.

## Checkout / links
- Live reading checkout pattern: `.../reading-checkout?type=<reading_key>` (e.g. `romantic_reading`, `archetype_reading`).
- The Relationship Reading promo page (`triple-moon-goddess-relationship-reading.html`) points its buttons to `https://www.triplemoongoddess.com/relationship`.
