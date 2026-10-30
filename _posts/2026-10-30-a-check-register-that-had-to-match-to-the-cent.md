---
layout: post
title: "A Check Register That Had to Match to the Cent"
date: 2026-10-30
---

My business money lived in spreadsheet tabs: one for the bank account, one for income, one for the cash I take at expos, and a dashboard on top. On the evening of October 27, the same day I replaced my Kepler spreadsheet with [a small local app](/2026/10/30/the-planner-that-learned-to-rank-its-sources.html), I had Claude Code do the same for the books. TMG Register runs at `localhost:5201`, with the same recipe: a local server, a React page, JSON files in a private repo, and $0 a month beyond Claude.

A register is an easy app to build badly, because a wrong one still looks right. So the first test was arithmetic: import all 141 rows from the sheet, and the total has to equal the sheet's own total, to the cent. It did. Then the wrong parts started to show.

## The bars that were never there

Two transfers in the sheet had been typed with the year 2026, sitting among rows from January and February 2027. They were typos, and they were also the reason the old dashboard had shown odd bars for those months. Nobody had connected the two. Importing them meant deciding each date on purpose, and the README records why those two became 2027. The importer also read one date the sheet stored as a raw serial number, 46322, as the date it really was.

## Claude's cash model was wrong twice

The first version treated the cash wallet like a normal petty cash account, funded by withdrawing from the bank. That's a reasonable guess, and it isn't how my business works. Cash comes from clients who pay me at expos, and it leaves as spending, owner's draw, or a deposit into the bank. It never comes out of the bank. Version 1.1.0 removed the withdraw button and changed what the wallet means.

The idea came back in a smaller form. A "move to Cash" button on bank lines remained, which allowed the exact thing that never happens. Version 1.4.1 took it off and moved the rule into one function with its own tests.

The app could pass every test it had and still misunderstand the business. Only I could catch that, and I caught it by using it.

## The file I refused to import

My sheet also had a Stripe payments export, which would have been a tempting thing to pull in: detailed, complete, right there. It's full of customer email addresses. Client privacy is the first rule of my platform, and a bookkeeping side project doesn't get an exemption. The money in that export had already reached the bank as Stripe transfers, so the books lost nothing by leaving it out. The cash history did come in, with customer emails stripped first. I searched the repo's data files for anything shaped like an email address before writing this sentence, and found none.

## What the bank wouldn't say

The next day I connected the account through Plaid, expecting transactions to stop being typed by hand. The connection worked, and the first sync matched a real Stripe deposit. Then the numbers stopped adding up.

Plaid returned about two dozen transactions going back to August: deposits, transfers, a couple of card payments, interest. It returned none of my debit card purchases, even after forcing a refresh. My bank just doesn't send them through, and Goodbudget couldn't get them either.

There were two ways to respond. One was more code, guessing at purchases to fill the gap. The other was to accept what the feed could actually tell me. I took the second:

- The bank connection supplies the current balance and clears deposits and transfers.
- Card purchases stay typed in by hand.
- The "planned, but the bank hasn't shown it" list only covers money coming in and payees the bank has actually shown, so it stops crying wolf about purchases it can never see.

The dashboard compares the bank's balance with the register's cleared balance. A gap there is a question for me, and the app doesn't invent a transaction to close it.

## What I got less tidy about

In July I wrote that [my back office should back up the system, not the data](/2026/07/04/the-back-office-in-one-folder.html). This app doesn't follow that. Its ledger is JSON in a private GitHub repo, committed automatically, because GitHub history is the backup and the undo log. Anyone who got into that repo could read my business's transaction history. There are no clients in it, though: Stripe shows up as lump transfers and expo cash as expo readings, and the bank can give me the electronic side again.

Secrets are a different matter. The Plaid keys and the bank access token live only in Bitwarden. The app holds them in memory after I unlock, so after a restart it can't reach the bank until I type my password into a Mac dialog. The page is never sent them, and the tests check every API response and data file for them. I also searched every commit in the repo for the real values and found none. Bank setup works only from the Mac itself. My phone reaches the app over my private Tailscale network, where it can read and press Update, and the tests check that every setup route refuses it.

The line I actually care about is secrets, so that's where the rule is strict.

## The principle

When a tool is new, the numbers are the easy part to check, and the model is the hard part. A register that matches the sheet to the cent proves the arithmetic. It doesn't prove the app understands that cash only flows one way, or that a data feed has a hole in it. Test the arithmetic with math. Test the model by doing your real books in it and noticing what it lets you do that could never happen.
