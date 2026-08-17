#!/usr/bin/env python3
"""Inject the shared TMG nav + footer into standalone site pages.

The site's pages were authored as standalone HTML (Google Sites supplied the
nav). This script is the single source of truth for the site chrome: it drops a
self-scoped sticky nav right after <body> and a shared footer right before
</body>, without touching any page's own markup or CSS.

Re-running is safe: the injected blocks are fenced with TMG-CHROME markers and
are replaced in place, so the script can be run again after editing the chrome
here.

Usage:
    python3 tools/inject-site-chrome.py [page.html ...]   # default: PAGES
"""

import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Nav order and labels are fixed. href -> label.
NAV = [
    ("/", "Home"),
    ("/video.html", "Video"),
    ("/readings.html", "Readings"),
    ("/schedule.html", "Schedule"),
    ("/practitioners.html", "Practitioner"),
    ("/ipa.html", "IPA"),
    ("/apps.html", "Apps"),
    ("/testimonials.html", "Testimonials"),
    ("/events.html", "Events"),
    ("/about.html", "About"),
    ("/contact.html", "Contact"),
]

# Every page that carries the shared chrome.
PAGES = [
    "index.html",
    "video.html",
    "readings.html",
    "schedule.html",
    "practitioners.html",
    "ipa.html",
    "apps.html",
    "testimonials.html",
    "events.html",
    "about.html",
    "contact.html",
    "blog.html",
    "privacy.html",
    "terms.html",
]

# The legal documents are the only pages allowed to carry the business postal
# address; every other page must not.
ADDRESS_EXEMPT = {"privacy.html", "terms.html"}

EMAIL = "Lisa@TripleMoonGoddess.com"
PRIVACY_URL = "/privacy.html"
TERMS_URL = "/terms.html"

FONTS_LINK = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    '<link href="https://fonts.googleapis.com/css2?'
    "family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400"
    "&family=Cinzel:wght@400;500;600"
    '&display=swap" rel="stylesheet">'
)

CHROME_CSS = """<style id="tmg-chrome-css">
  /* Shared TMG site chrome — self-scoped, must not depend on or affect page CSS. */
  .tmg-nav, .tmg-nav *, .tmg-footer, .tmg-footer * { box-sizing: border-box; }

  .tmg-nav {
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    z-index: 9999;
    margin: 0 0 0 0;
    padding: 0;
    background: rgba(10, 6, 8, 0.94);
    border-bottom: 1px solid rgba(212, 175, 106, 0.18);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    font-family: 'Cinzel', Georgia, serif;
    line-height: 1.2;
  }

  .tmg-nav-inner {
    max-width: 1180px;
    margin: 0 auto;
    padding: 0 24px;
    min-height: 58px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }

  .tmg-nav-brand {
    display: inline-block;
    padding: 6px 0;
    font-family: 'Cinzel', Georgia, serif;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #e8c989;
    text-decoration: none;
    white-space: nowrap;
  }
  .tmg-nav-brand:hover { color: #f5e8d0; }

  .tmg-nav-links {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 2px 18px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .tmg-nav-links li { margin: 0; padding: 0; list-style: none; }

  .tmg-nav-link {
    display: inline-block;
    padding: 18px 0;
    font-family: 'Cinzel', Georgia, serif;
    font-size: 10.5px;
    font-weight: 400;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(201, 184, 150, 0.78);
    text-decoration: none;
    border: 0;
    border-bottom: 1px solid transparent;
    background: none;
    transition: color 0.25s ease, border-color 0.25s ease;
  }
  .tmg-nav-link:hover { color: #e8c989; border-bottom-color: rgba(212, 175, 106, 0.5); }
  .tmg-nav-link[aria-current="page"] { color: #d4af6a; border-bottom-color: #b8945a; }

  .tmg-nav-toggle { display: none; }
  .tmg-nav-burger {
    display: none;
    padding: 10px 12px;
    margin: 0;
    cursor: pointer;
    color: #d4af6a;
    font-size: 16px;
    line-height: 1;
    border: 1px solid rgba(212, 175, 106, 0.28);
    border-radius: 2px;
    background: none;
    user-select: none;
    -webkit-user-select: none;
  }

  @media (max-width: 900px) {
    .tmg-nav-inner { padding: 0 16px; min-height: 52px; }
    .tmg-nav-burger { display: inline-block; }
    .tmg-nav-links {
      display: none;
      position: absolute;
      left: 0;
      right: 0;
      top: 100%;
      flex-direction: column;
      align-items: stretch;
      gap: 0;
      padding: 4px 16px 16px;
      background: rgba(10, 6, 8, 0.98);
      border-bottom: 1px solid rgba(212, 175, 106, 0.18);
      max-height: 78vh;
      overflow-y: auto;
    }
    .tmg-nav-toggle:checked ~ .tmg-nav-links { display: flex; }
    .tmg-nav-link {
      padding: 12px 0;
      font-size: 11px;
      border-bottom: 1px solid rgba(212, 175, 106, 0.1);
    }
  }

  .tmg-footer {
    position: relative;
    z-index: 10;
    margin: 0;
    padding: 44px 20px 40px;
    background: rgba(5, 3, 4, 0.72);
    border-top: 1px solid rgba(212, 175, 106, 0.18);
    text-align: center;
  }
  .tmg-footer-inner { max-width: 900px; margin: 0 auto; padding: 0; }

  .tmg-footer-links {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 6px 16px;
    margin: 0 0 18px;
    padding: 0;
    font-family: 'Cinzel', Georgia, serif;
    font-size: 10.5px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    line-height: 2;
  }
  .tmg-footer-links a {
    color: rgba(212, 175, 106, 0.85);
    text-decoration: none;
    border: 0;
    border-bottom: 1px solid rgba(184, 148, 90, 0.3);
    padding-bottom: 1px;
    background: none;
    transition: color 0.25s ease, border-color 0.25s ease;
  }
  .tmg-footer-links a:hover { color: #e8c989; border-bottom-color: rgba(212, 175, 106, 0.7); }
  .tmg-footer-sep { color: rgba(212, 175, 106, 0.3); }

  .tmg-footer p {
    margin: 0 0 6px;
    padding: 0;
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 13px;
    letter-spacing: 0.04em;
    color: rgba(201, 184, 150, 0.55);
  }
  .tmg-footer p:last-child { margin-bottom: 0; }
  .tmg-footer .tmg-footer-patent { font-style: italic; }
</style>"""


def nav_html(active_href):
    items = []
    for href, label in NAV:
        current = ' aria-current="page"' if href == active_href else ""
        items.append(
            '      <li><a class="tmg-nav-link" href="%s"%s>%s</a></li>' % (href, current, label)
        )
    return (
        "<!-- TMG-CHROME:NAV:START (generated by tools/inject-site-chrome.py) -->\n"
        + CHROME_CSS
        + "\n"
        '<nav class="tmg-nav" aria-label="Main">\n'
        '  <div class="tmg-nav-inner">\n'
        '    <a class="tmg-nav-brand" href="/">Triple Moon Goddess</a>\n'
        '    <input class="tmg-nav-toggle" type="checkbox" id="tmg-nav-toggle" hidden>\n'
        '    <label class="tmg-nav-burger" for="tmg-nav-toggle" aria-label="Menu">&#9776;</label>\n'
        '    <ul class="tmg-nav-links">\n'
        + "\n".join(items)
        + "\n"
        "    </ul>\n"
        "  </div>\n"
        "</nav>\n"
        "<!-- TMG-CHROME:NAV:END -->"
    )


FOOTER_HTML = (
    "<!-- TMG-CHROME:FOOTER:START (generated by tools/inject-site-chrome.py) -->\n"
    '<footer class="tmg-footer">\n'
    '  <div class="tmg-footer-inner">\n'
    '    <div class="tmg-footer-links">\n'
    '      <a href="mailto:%s">%s</a>\n'
    '      <span class="tmg-footer-sep">&middot;</span>\n'
    '      <a href="%s">Privacy Policy</a>\n'
    '      <span class="tmg-footer-sep">&middot;</span>\n'
    '      <a href="%s">Terms of Service</a>\n'
    "    </div>\n"
    "    <p>&copy; 2026 Lisa Hagan. All rights reserved.</p>\n"
    '    <p class="tmg-footer-patent">Integrative Pattern Astrology (IPA) &mdash; '
    "Patent Pending &mdash; Application #63/998,305</p>\n"
    "  </div>\n"
    "</footer>\n"
    '<script id="tmg-chrome-js">\n'
    "/* Some pages pad <body> themselves. Pull the chrome out to the page edges\n"
    "   so the bar is full-bleed, without editing that page\'s own CSS. */\n"
    "(function () {\n"
    "  var cs = getComputedStyle(document.body);\n"
    "  var px = function (v) { return parseFloat(v) || 0; };\n"
    "  var t = px(cs.paddingTop), r = px(cs.paddingRight),\n"
    "      b = px(cs.paddingBottom), l = px(cs.paddingLeft);\n"
    "  var nav = document.querySelector('.tmg-nav');\n"
    "  var foot = document.querySelector('.tmg-footer');\n"
    "  if (nav && (t || r || l)) { nav.style.margin = -t + 'px ' + -r + 'px 0 ' + -l + 'px'; }\n"
    "  if (foot && (r || b || l)) { foot.style.margin = '0 ' + -r + 'px ' + -b + 'px ' + -l + 'px'; }\n"
    "})();\n"
    "</script>\n"
    "<!-- TMG-CHROME:FOOTER:END -->"
) % (EMAIL, EMAIL, PRIVACY_URL, TERMS_URL)

NAV_BLOCK_RE = re.compile(
    r"<!-- TMG-CHROME:NAV:START.*?<!-- TMG-CHROME:NAV:END -->\n?", re.S
)
FOOTER_BLOCK_RE = re.compile(
    r"<!-- TMG-CHROME:FOOTER:START.*?<!-- TMG-CHROME:FOOTER:END -->\n?", re.S
)
BODY_OPEN_RE = re.compile(r"<body[^>]*>")
HEAD_CLOSE_RE = re.compile(r"</head>")


def active_href(filename):
    return "/" if filename == "index.html" else "/" + filename


def ensure_fonts(html):
    """Pages that never loaded the display fonts (they inherited them from the
    Google Sites shell) need the Google Fonts link so the chrome renders right."""
    head_end = html.find("</head>")
    head = html[:head_end] if head_end != -1 else html
    if head_end == -1 or ("Cinzel" in head and "Cormorant" in head):
        return html
    return html[:head_end] + FONTS_LINK + "\n" + html[head_end:]


def inject(path):
    filename = os.path.basename(path)
    with open(path, encoding="utf-8") as fh:
        html = fh.read()

    # Drop any previously injected chrome so re-runs replace instead of stack.
    html = NAV_BLOCK_RE.sub("", html)
    html = FOOTER_BLOCK_RE.sub("", html)

    body = BODY_OPEN_RE.search(html)
    if not body:
        raise SystemExit("%s: no <body> tag" % filename)
    if "</body>" not in html:
        raise SystemExit("%s: no </body> tag" % filename)

    html = ensure_fonts(html)
    body = BODY_OPEN_RE.search(html)  # offsets moved if fonts were added

    end = body.end()
    html = html[:end] + "\n" + nav_html(active_href(filename)) + "\n" + html[end:]

    idx = html.rindex("</body>")
    html = html[:idx] + FOOTER_HTML + "\n" + html[idx:]

    with open(path, "w", encoding="utf-8") as fh:
        fh.write(html)
    return filename


def main():
    targets = sys.argv[1:] or PAGES
    for name in targets:
        path = name if os.path.isabs(name) else os.path.join(REPO, name)
        if not os.path.exists(path):
            raise SystemExit("missing page: %s" % path)
        print("chrome -> %s" % inject(path))


if __name__ == "__main__":
    main()
