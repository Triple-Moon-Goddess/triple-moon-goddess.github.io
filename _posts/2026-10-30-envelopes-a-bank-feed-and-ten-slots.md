---
layout: post
title: "Envelopes, a Bank Feed, and Ten Slots I Can't Get Back"
date: 2026-10-30
---

The third app in three days has nothing to do with the business. It's my household budget. It works like Goodbudget: every payday each envelope gets its amount, spending comes out of its envelope, and whatever's unused rolls over. The plan itself lived in a spreadsheet, one column per paycheck. Lifestyle Budget runs at `localhost:5203`, built with the same recipe as [my planner](/2026/10/30/the-planner-that-learned-to-rank-its-sources.html) and [my business register](/2026/10/30/a-check-register-that-had-to-match-to-the-cent.html): a local server, JSON files in a private repo, no database.

The first commit went in at 7:08 on a Wednesday morning, with the bank sync already in it. Version 1.4 went in at 3:41 that afternoon. Personal money is kept apart from the business here: its own GitHub account, its own repo, its own Plaid team.

## The import that's allowed to refuse

The heart of the app is the Plan tab, which is my sheet's paycheck-by-paycheck plan: 31 paydays across 14 months, one row per envelope. The import script refuses any sheet where a column doesn't add up to its Total row, or where there's an amount it can't place. A budget tool that quietly loads a wrong plan is worse than having none.

Even the starting numbers needed a decision. The sheet's Savings figure was a penny higher than the paycheck left room for, because of unrounded cells behind it. Savings is the remainder, so it takes the penny, and the budget adds up to the paycheck exactly. One payday in the sheet really is over the paycheck, and the Plan tab imports it that way instead of fixing it for me.

## Plaid's free plan, and how not to lose it

Bank data comes through Plaid's free Trial plan: real bank data for up to 10 connected bank logins, Transactions included. Two details cost nothing to learn from a README, and could cost something to learn the hard way:

- **A slot is gone for good.** Removing a connection doesn't give it back. So the app never creates a second connection for the same bank. "Reconnect" uses Plaid's update mode on the existing one.
- **Don't click the upgrade path.** The paid "Get Production access" application ends the Trial once it's submitted.

One bank login is one slot however many accounts sit behind it, and mine has several. That caused the next bug.

## Not every account is your budget

The first version assumed one checking account. When I connected for real, the bank shared eight accounts, including checking accounts I don't use and savings and a credit line. A page left open from an earlier version was labeling the overdraft line as Checking. A savings account ticked by mistake was being added into "Checking".

So only checking accounts can feed envelopes now, and the server refuses it for anything else, not just the page. Extra accounts can be hidden. Savings and credit lines only show balances, and a credit line shows what's owed. That also settles transfers: moving money to savings is one checking transaction filed under the Savings envelope, and it's never counted twice. The Savings tab projects forward on that same logic, from the accounts I've chosen to show plus each planned payday.

## The missing check

On October 29 a bank check showed up at the bank and not in the app. The natural guess is that Plaid filters out checks, which would have been a permanent hole like [the debit card purchases on my business account](/2026/10/30/a-check-register-that-had-to-match-to-the-cent.html). That guess was wrong. Plaid's copy of the bank was simply stale, because Plaid only checks the bank a few times a day.

The fix is small. The Update button now asks Plaid to refresh first, then syncs again 1½ and 5 minutes later to collect the result, since the refresh doesn't finish instantly. The daily morning sync doesn't refresh. If a refresh fails, the sync still takes what Plaid has.

Two apps, the same symptom, and two different causes. One was a gap that won't close, and the other was a delay that closes on its own. If I'd assumed they were the same thing, I would have built the wrong answer for one of them.

## Keys, and who can reach this

The same tradeoff I described in the register post applies here: transactions sit in a private GitHub repo, and that's a real exposure I've chosen. Plaid keys and the bank access token don't. They're in a private file outside the repo, and the tests check that they never appear in the data folder or any API response. I also searched the repo's history for bank access tokens and found none.

On the laptop it's a full dashboard. On my phone, through my private Tailscale network, it's a short list of envelopes and what's left in each. The Mac has to be on and awake, which is the honest price of $0. Bank setup is refused from anywhere but the Mac itself, and the tests send those requests from the tailnet address and check that they're refused.

## The principle

Read the limits of a free tier before you write the code, because they decide your design. Ten slots that never come back meant a reconnect flow on day one, while it was still cheap to build. And when data goes missing, find out whether it's late or never coming before you build around it. Those two problems look identical on the screen, and they need opposite answers.
