#!/usr/bin/env python3
"""Checks for the shared site chrome and the site's hard content rules.

Run after tools/inject-site-chrome.py (or any page edit):

    python3 tools/check-site-chrome.py

Asserts, for every page in PAGES:
  * exactly one injected nav block and one injected footer block
  * the nav carries all 11 links, in order, root-relative, with the current
    page marked
  * the footer carries the email, privacy, terms, copyright and patent lines
  * the display fonts are loaded
  * no "Fremont, CA" (belongs only in the privacy/terms documents)
  * no newsletter page or link
  * every root-relative internal link resolves to a file in the repo
"""

import importlib.util
import os
import re
import sys

# inject-site-chrome.py is not importable by name (hyphens), so load it by path.
_spec = importlib.util.spec_from_file_location(
    "site_chrome", os.path.join(os.path.dirname(os.path.abspath(__file__)), "inject-site-chrome.py")
)
site_chrome = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(site_chrome)

REPO = site_chrome.REPO
PAGES = site_chrome.PAGES
NAV = site_chrome.NAV

failures = []


def fail(page, msg):
    failures.append("%s: %s" % (page, msg))


def internal_targets(html):
    for href in re.findall(r'href="(/[^"]*)"', html):
        href = href.split("#")[0].split("?")[0]
        if href in ("", "/"):
            continue
        yield href


for page in PAGES:
    path = os.path.join(REPO, page)
    if not os.path.exists(path):
        fail(page, "page missing")
        continue
    html = open(path, encoding="utf-8").read()

    # chrome present exactly once
    for marker, count in (
        ("<!-- TMG-CHROME:NAV:START", 1),
        ("<!-- TMG-CHROME:NAV:END -->", 1),
        ("<!-- TMG-CHROME:FOOTER:START", 1),
        ("<!-- TMG-CHROME:FOOTER:END -->", 1),
    ):
        if html.count(marker) != count:
            fail(page, "expected %d of %r, found %d" % (count, marker, html.count(marker)))

    # nav sits after <body>, footer before </body>
    body_open = re.search(r"<body[^>]*>", html)
    nav_at = html.find("<!-- TMG-CHROME:NAV:START")
    footer_at = html.find("<!-- TMG-CHROME:FOOTER:START")
    if not body_open or not (body_open.end() <= nav_at < footer_at < html.rindex("</body>")):
        fail(page, "chrome is not positioned after <body> / before </body>")

    # nav links: all present, in order
    found = re.findall(r'<a class="tmg-nav-link" href="([^"]+)"', html)
    expected = [href for href, _ in NAV]
    if found != expected:
        fail(page, "nav links wrong: %s" % found)
    for href, label in NAV:
        if ">%s</a>" % label not in html:
            fail(page, "nav label missing: %s" % label)

    # current page marked (pages that are in the nav; blog and the legal
    # documents are reachable from the footer / posts, not the nav)
    want = "/" if page == "index.html" else "/" + page
    if want in [href for href, _ in NAV]:
        if 'href="%s" aria-current="page"' % want not in html:
            fail(page, "current nav item not marked for %s" % want)

    # footer content
    for needle in (
        "mailto:Lisa@TripleMoonGoddess.com",
        'href="/privacy.html"',
        'href="/terms.html"',
        "&copy; 2026 Lisa Hagan. All rights reserved.",
        "Patent Pending &mdash; Application #63/998,305",
    ):
        if needle not in html:
            fail(page, "footer missing %r" % needle)

    # fonts loaded
    if "family=Cinzel" not in html and "Cinzel:wght" not in html:
        fail(page, "Cinzel font not loaded")

    # content rules
    if page not in site_chrome.ADDRESS_EXEMPT and re.search(r"Fremont", html, re.I):
        fail(page, 'contains "Fremont" (allowed only in privacy/terms docs)')
    if re.search(r"newsletter", html, re.I):
        fail(page, "contains a newsletter reference")

    # internal links resolve
    for target in internal_targets(html):
        if not os.path.exists(os.path.join(REPO, target.lstrip("/"))):
            fail(page, "dead internal link: %s" % target)

if failures:
    print("FAIL (%d)" % len(failures))
    for f in failures:
        print("  - " + f)
    sys.exit(1)

print("OK — %d pages carry the shared chrome and pass the content rules." % len(PAGES))
