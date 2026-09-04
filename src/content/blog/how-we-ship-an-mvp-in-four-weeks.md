---
title: How We Ship a Production MVP in 4 Weeks (The Actual Playbook)
description: No magic and no 80-hour weeks, just a repeatable four-week structure we run on every MVP build, from discovery sprint to production handoff.
category: Process
pubDate: 2026-03-25
---

When we tell founders their MVP will be in production in four to six weeks,
the reaction is usually polite disbelief. That's fair; the industry average for
"simple app" is two quarters and a follow-up invoice. So here's the actual
playbook, week by week.

## Week 0: The Discovery Sprint

Before any code, one intense week of scoping. Three artifacts come out of it:

1. **The user flow map.** Every screen in the core loop, sketched and agreed
2. **The data model.** Entities, relationships, and permissions on one page
3. **The cut line.** A written list of what we are explicitly *not* building

That third one does the heavy lifting. Every blown timeline we've ever
inherited traces back to a missing cut line. Scope doesn't creep when the
scope is a signed document.

## Week 1: Skeleton with organs

We don't build screens first. We build the spine: auth, database schema with
row-level security, payments plumbing, deploy pipeline. By Friday there's a
deployed application with real signup and a working Stripe checkout, even if
it only does one thing.

This inverts the usual demo-driven order, and it's why the last week isn't a
death march. The risky integrations are done first, while there's still time
to react.

## Weeks 2–3: The core loop, demo every Friday

With the spine in place, features go fast. This is where AI-assisted
development pays compound interest, because the patterns are established and
the tooling can follow them. We ship the one workflow that makes the product
worth paying for, then widen.

Every Friday: a demo on the production URL. Not a staging link, not a video.
Clients click things themselves. Feedback lands while it's still cheap to act
on.

## Week 4: Hardening and handoff

The unglamorous week that separates products from prototypes: error states,
empty states, mobile passes, monitoring, backups, load sanity-checks. Then
handoff: docs, credentials, a recorded architecture walkthrough, and source
code ownership transferred completely.

## Why this works

The honest answer isn't the AI tooling, though it helps enormously. It's the
constraint stack: a fixed timeline forces a real cut line, the spine-first
order forces the risk to the front, and Friday demos force the truth out
weekly.

Speed isn't the goal. It's the evidence that the decisions were made.
