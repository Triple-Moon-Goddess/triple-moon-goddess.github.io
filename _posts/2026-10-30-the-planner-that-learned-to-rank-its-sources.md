---
layout: post
title: "The Planner That Learned to Rank Its Sources"
date: 2026-10-30
---

I'm studying at Kepler College, and my four-year course plan lived in a spreadsheet with a Gemini dashboard on top of it. It looked finished. It had totals, and it had 78 homework assignments. Those assignments weren't saved anywhere in the sheet. They existed only inside the dashboard, which had generated them.

So I had Claude Code build me a real planner, and it runs on my own Mac at `localhost:5199`. The rule was simple: it can't cost more than Claude does. That meant no database and no hosting. It's a small local server, a React page, and a folder of JSON files in a private GitHub repo. When I change something, the server writes the file, commits it about 5 seconds later, and pushes about a minute after that. GitHub history is my backup and my undo.

The first commit landed at 2:38 on a Tuesday afternoon. Version 1.6.1 landed at 4:09. Most of the versions in between weren't features. They were corrections to what the app believed.

## Version 1.0 believed the spreadsheet

The first version imported 27 courses from my sheet and checked every move against two rules: is this course offered that season, and are its prerequisites done in an earlier term? Those checks are only as good as the data behind them, and the data was my own old typing.

Then the better sources came in, one at a time:

- **Kepler's class calendar.** It showed which terms each course actually ran in during 2025. Season information changed for 16 of my 27 courses.
- **Kepler's published certificate requirements.** These replaced my sheet's cryptic marks with real rules: required courses, "choose 4", credit totals, either/or groups. They also exposed 7 credit values the sheet had wrong.
- **Kepler's own course cards.** These are newer than the calendar. They corrected seasons, instructors and prerequisites, and in one case removed a prerequisite my sheet had listed.
- **Kepler's 2026–27 Academic Planner.** This is the actual schedule for those terms.

The useful work wasn't loading more data. It was deciding which source wins, and writing that down in code.

## Exact, or only a hint?

A course card beats the 2025 calendar, and re-importing the calendar can't overwrite a season that came from a card. For Fall 2026 through Summer 2027 the Academic Planner is exact, so placing a course in a term it doesn't list is an error. For later years, nobody has published anything yet. If a season I picked comes only from older data, I get a warning, because one year of history is a hint and not a promise.

That difference between an error and a warning is the most honest thing in the app. Fixing the data moved real courses in my real plan. Three of them didn't run in the terms I'd given them, and a certificate's finish date moved as a result.

Three things stay marked as unproven on purpose:

- Prices and book lists read off the old dashboard add up to its totals, but they haven't been checked against Kepler's store, and the README says so.
- Class dates worked out from a start date say they're calculated, because Kepler hasn't published a list for that course.
- The 78 generated assignments were not imported at all. Real homework gets added from real syllabi.

## A bug the database would have hidden

No database means no database's protection, and that showed up immediately. With the app open in two tabs, a save from one could silently overwrite the other's changes. The fix is the same idea a database uses: every save names the version of the file it was based on. If another tab saved first, the server refuses with a 409, and the tab replays its unsaved edits on top of the newest data. One of the tests sends two saves at once on the same version and checks that exactly one wins.

The server listens on `127.0.0.1` only, which still doesn't stop a random website from trying to reach it through my browser. So it refuses requests without its custom header, requests with a foreign `Host` (DNS rebinding), and non-JSON bodies, and it can write only its named data files. The test suite sends each of those requests and checks each one is refused. All 127 tests in the repo pass as I write this.

## What it does now

It's at version 1.9.0, with Plan, Costs, Certificates, Books and Homework tabs, plus a Schedule tab with the week as a grid and every meeting by date. A certificate card only shows a finish term when every one of Kepler's rules is met. The Books tab has a box per book, and it knows that the same book listed two different ways on two course pages is one purchase.

Some of the rules are mine and not Kepler's. Kepler lets one course start during your last 18 months of Diploma study, but I want it after everything else, including the electives, so the app enforces my stricter rule. Overlapping Sunday classes aren't flagged at all, because I watch recordings. The only classes that need care are the ones whose cards require live attendance.

## The principle

A plan is only as good as the worst source nobody has ranked. Before you trust a tool's answer, ask where each fact came from, how old it is, and what happens when two sources disagree. If the tool can't tell you, it's guessing, however finished it looks.
