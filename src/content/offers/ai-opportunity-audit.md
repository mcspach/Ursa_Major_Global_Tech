---
title: AI Opportunity Audit
family: advisory
step: 1
kicker: Advisory step 1
summary: Five business days, one working session, and a ranked list of what to automate — every opportunity scored, sequenced, and priced before you commit to building anything.
forWho: Operators and owners at 10–150 people who can name the pain without prompting, have a few systems with real APIs, and have budget for a follow-on build.
question: What should we automate first, and what is each one worth?
situation: We know what's broken. We don't know what to fix first.
# Answers the question first, then names the product and the number. This field
# feeds the FAQPage schema, so it is the text an assistant quotes back.
answer: "Start with your highest-volume process that has a real API and doesn't change every week — usually document handling, lead routing, or reporting. The AI Opportunity Audit scores 8–15 candidates on impact and feasibility, prices the top five against your own volumes, and hands you the order to build them in. $2,500, five business days."
order: 1
featured: true
timeline: 5 business days

# Not published: needs a Stripe Payment Link and a hosted intake form first.
# See reference/launch-inputs.md.
published: false

pricing:
  amount: 2500
  display: fixed
buying:
  mode: buy-now
  ctaLabel: Buy the Audit
  # checkoutUrl: TODO — Stripe Payment Link
  # intakeUrl: TODO — hosted intake form (19 questions)

revisionCap: 1 round, consolidated, within 10 days of delivery
creditMechanic: Credited in full toward any engagement over $10,000. Expires 90 days after delivery.
exitArtifact: A priced menu of next steps — every opportunity carries a price before you ask for one.

scope:
  - label: Working session
    value: 1, 45 minutes, recorded
  - label: Readout
    value: 1, 30 minutes
  - label: Departments in scope
    value: 1–2
  - label: Documents reviewed
    value: Up to 15
  - label: Systems reviewed
    value: Up to 8
  - label: Opportunities scored
    value: 8–15, with the top 5 detailed
  - label: Revision rounds
    value: 1
  - label: Engagement expiry
    value: 15 calendar days from intake

deliverables:
  - Audit document, 10–18 pages, including the full scored opportunity register
  - Current-state process map for the departments in scope, plus a systems inventory
  - Top 5 opportunities detailed — current cost, what changes, effort class, price, dependencies, risks
  - Recommended build sequence, with the reasoning and the dependencies stated
  - A "not recommended" section covering what we looked at and rejected, and why
  - Priced menu — a standalone one-pager you can circulate without the full report
  - Recorded walkthrough, 10–12 minutes, so the deliverable survives people who missed the readout

notFor:
  - Not an implementation of anything
  - Not a technology or vendor selection process
  - Not an org design, hiring, or governance exercise
  - Not a data quality or security assessment
  - Not a company-wide strategy — that is the AI Strategy Engagement
  - Not a custom-built financial model

exclusions:
  - No implementation, builds, integrations, or configuration
  - No access to production systems required or requested
  - No security, compliance, or data-quality audit
  - No vendor selection or contract review
  - No org design, hiring plan, or governance policy
  - No custom financial modeling beyond the included sizing
  - No more than 2 departments, 15 documents, or 8 systems
  - No additional sessions beyond the working session and the readout
  - No written implementation specs — available as an add-on

addOns:
  - label: Additional department in scope
    amount: 1200
  - label: Additional working session (45 min)
    amount: 500
  - label: Live team walkthrough instead of recorded (45 min)
    amount: 750
  - label: Written implementation spec for one opportunity
    amount: 1500

process:
  - step: Day 1 — Review
    detail: We read your intake form, documents, and systems, then draft the working-session agenda as eight to ten hypotheses framed as questions. You get it the evening before.
  - step: Day 2 — Working session
    detail: 45 minutes, recorded. We confirm or kill each hypothesis, walk your two highest-volume processes step by step, and get the volume and time numbers in the room.
  - step: Day 3 — Analysis
    detail: Every opportunity identified, scored on impact and feasibility, classified by effort, and sequenced. The top five get sized against real baselines.
  - step: Day 4 — Assembly
    detail: Document, priced menu, and recorded walkthrough built and delivered — before the readout, not at it, so you arrive having read it.
  - step: Day 5 — Readout
    detail: 30 minutes on the three findings, the recommended first move, and the priced menu. The next-step proposal follows within two hours.
---

## What you're actually buying

Most AI conversations stall in the same place: everyone agrees something should
be automated, nobody can agree what goes first, and no one has put a number on
any of it. The Audit ends that argument with evidence.

It works bottom-up, at the process level. The question it answers is **what
should we automate, in what order, and what will it cost** — not the broader
question of where AI changes how the business operates. That one is the
[AI Strategy Engagement](/advisory/ai-strategy-engagement/), and it's a
different product, not a bigger version of this one.

## Why it isn't free

Free audits are sales presentations. You get a slide deck with generic
recommendations because nobody does forty hours of research for free.

This is a paid engagement with a deliverable you own. If you go on to build with
us it costs you nothing, because it credits in full. If you don't, you keep a
document you can hand to anyone — including whoever you hire instead.

## How opportunities get ranked

Every opportunity is scored on the same fixed rubric, and the rubric is printed
in the document so you can check our work.

**Impact** (1–5) runs from under two hours a month recovered up to forty-plus
hours, a direct revenue effect, or a removed compliance risk. **Feasibility**
(1–5) runs from *no API and a process that changes constantly* up to *documented
APIs everywhere, stable process, clean data, no judgment calls*. **Effort** maps
to the build classes — A, B, or C — which is what sets the price.

Priority score is `(Impact × Feasibility) ÷ Effort`, ranked descending. Three
overrides then apply, and we state them where we use them:

1. **Dependencies win.** If one item unlocks two others, it moves up regardless
   of score.
2. **The first build has to be a visible win.** Whether a company gets a second
   automation is decided by whether they saw the first one work. A fast, visible
   class-A item beats a higher-scoring class-C one.
3. **Anything scoring 1 or 2 on feasibility drops out**, regardless of impact,
   into the "not recommended" section with the reason stated. That's where
   fixed-price work goes to lose money.

## How the numbers are built

Every figure in the document is defensible or it isn't in the document.

Baselines come from your own volumes: frequency per month × people involved ×
minutes per instance × loaded hourly rate. We use your loaded rate if you have
one and 1.4× salary if you don't, and we say which. Anything over twenty hours a
month gets confirmed with you before it goes in.

Projected effect is **always a range, never a single number**, with a confidence
rating and its basis on every line. A point estimate invites one question nobody
can answer, and the credibility of the whole document goes with it. We also model
the residual — automation reduces a process, it rarely eliminates one.
