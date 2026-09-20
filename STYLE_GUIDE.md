# Triple Moon Goddess — Web Style Guide

Design system used across `triple-moon-goddess.github.io`. Any new page should match this so it drops into the existing site seamlessly. (Source of truth: `readings.html`.)

## Site chrome (nav + footer)

The site is built by GitHub Pages (Jekyll). Every page carries the same sticky
nav and footer, sourced from single-file Jekyll includes — never hand-edit the
chrome inside a page:

- `_includes/nav.html` — nav markup, the self-scoped chrome CSS, the https
  upgrade script, and the dropdown JS. `_includes/footer.html` — footer markup,
  footer CSS, and the full-bleed margin script. Edit the include; every page
  picks it up on the next Pages build.
- `tools/inject-site-chrome.py` and `tools/check-site-chrome.py` are **retired**
  and exit immediately. Do not run them — re-injecting the old baked chrome
  would double the menu on every page.
- Nav order (fixed): Home · Video · Relationship Reading · Schedule ·
  Practitioner · IPA · Apps · Testimonials · Events · About ▾ · Contact ▾.
  About holds About Lisa · Qualifications · Mission · Questions. Contact holds
  Contact Lisa · Birth Time Rectification. All links root-relative.
- Current-page state: `{% include nav.html active="/<page>.html" %}` marks the
  matching link `aria-current="page"`. A dropdown lights up as the current
  section when its `about_pages` / `contact_pages` list (assigned at the top of
  `nav.html`) contains `active` — add a new sub-page to that list.
- **The desktop nav row is width-critical.** It caps at 1180px and has only a
  few pixels of headroom. Before adding a label, a caret, or a link, load a page
  at ≥1230px wide and confirm `.tmg-nav-inner` is still one row (58px tall).
- Footer: `Lisa@TripleMoonGoddess.com`, `/privacy.html`, `/terms.html`,
  copyright, and the IPA patent-pending line.
- The legal documents live in this repo and nowhere else — `privacy.html` and
  `terms.html` are the canonical copies (moved out of the `tmg-legal` repo so
  there is exactly one version of every page). They are the only pages allowed
  to carry the business postal address. Nothing enforces this automatically any
  more — `grep -rl "Fremont" *.html` should return only the legal pages.

### Adding a page

1. Start the file with empty front matter (`---` / `---`) so Liquid runs.
2. In `<head>`: `{% include head-meta.html title="…" description="…" url="/<page>.html" %}`
   (canonical, OG, Twitter; optional `image=`) and `{% include schema-org.html %}`.
   Add a page-specific `schema-*.html` include only if one exists for it.
3. First thing in `<body>`: `{% include nav.html active="/<page>.html" %}`.
   Last thing before `</body>`: `{% include footer.html %}`.
4. Register it: a `<url>` entry in `sitemap.xml` (static, not generated) and a
   line in `llms.txt`. Add it to the nav include if it belongs in the menu.
5. There is no local Jekyll on the Mac. Check statically (front matter present,
   every `{% include %}` target exists in `_includes/`), then after pushing poll
   `gh api repos/Triple-Moon-Goddess/triple-moon-goddess.github.io/pages/builds/latest --jq .status`
   until `built` and look at the live page.

Page filenames are the public URLs (`/schedule.html`, `/video.html`, …); the old
`triple-moon-goddess-*-prod.html` names are retired.

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
- Pages carry no red `test-banner` and use live checkout URLs; the separate dev/test page variants are retired.

## Checkout / links
- Live reading checkout pattern: `.../reading-checkout?type=<reading_key>` (e.g. `romantic_reading`, `archetype_reading`).
- The Relationship Reading promo page (`readings.html`) points its buttons to `https://www.triplemoongoddess.com/relationship`.
