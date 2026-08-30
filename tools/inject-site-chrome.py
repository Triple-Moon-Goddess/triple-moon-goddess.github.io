#!/usr/bin/env python3
"""RETIRED — the site chrome no longer lives in this script.

As of the Jekyll-includes migration, the shared nav and footer are single-source
Jekyll includes:

    _includes/nav.html      (nav, chrome CSS, https upgrade, dropdown JS)
    _includes/footer.html   (footer, full-bleed margin JS)

Each page carries empty front matter (---/---) and two include tags:

    {% include nav.html active="/<page>.html" %}
    {% include footer.html %}

To change the nav or footer, edit the include file — one file, every page
updates on the next GitHub Pages build. Do NOT run this script; re-injecting
the old baked chrome would duplicate the menu on every page.
"""
raise SystemExit(__doc__)
