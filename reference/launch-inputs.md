# Launch Inputs: Running Checklist

Things only you can supply. Each notes what it blocks, so we can build around
whatever isn't ready yet. Nothing here is secret — these are the four buy-now
prices the site publishes anyway — so this file is committed. The pricing
strategy and positioning specs beside it are not.

Status key: ☐ needed · ◐ partial · ☑ done

---

## 1. Stripe Payment Links

Create in the Stripe dashboard, paste the `https://buy.stripe.com/...` URL.
Only the four **buy-now** tiers need links on the site. The starting-at tiers
get a payment link generated per client *after* the scoping call, so those never
live in the repo.

| ☐ | Offer | Price | Blocks |
|---|---|---|---|
| ☐ | AI Opportunity Audit | $2,500 | Homepage §2 band, `/advisory`, Custom page, the highest-priority page in the build |
| ☐ | Business Brain T1 | $2,500 | Card 2 page (first card being built) |
| ☐ | AI Sales Engine T1 | $2,500 | Card 3 page |
| ☐ | Claude Workspace Setup T1 | $750 | Card 1 page |

**Set each Payment Link's success redirect** to that offer's intake form (§3), so
payment and intake stay chained without a backend.

---

## 2. Booking links

| ☐ | Slot | Used by |
|---|---|---|
| ☐ | 15-minute call | Optional path on the $2,500 fixed tiers |
| ☐ | 20-minute scoping call | All starting-at tiers (Cards 1–3, T2 and T3) |
| ☐ | Longer exec call | Fractional AI Lead, Strategy Engagement, retainers |

Note: the Audit's working-session and readout calendar holds are fired by the
post-purchase automation (n8n/Stripe webhook), not the website.

---

## 3. Hosted intake forms

Tally, Fillout, or similar. Required field on every published offer, since the schema
will reject a published offer without one.

| ☐ | Form | Notes |
|---|---|---|
| ☐ | Audit intake | 19 questions, fully specced in `audit-spec.md` §Intake form. Target 12 min. This form *is* the product's scoping call, so it matters most |
| ☐ | Strategy intake | 15 questions, specced in `strategy-engagement-spec.md`. Q4 ("what decision does this inform") is the qualifier |
| ☐ | Claude Workspace Setup | T1 is fully async, so the form is the only input |
| ☐ | Business Brain | Sources, permissions, corpus size |
| ☐ | AI Sales Engine | Current stack, CRM, volumes |

---

## 4. Content and decisions

| ☐ | Item | Blocks |
|---|---|---|
| ☐ | **Card 3 subject:** AI Sales Engine vs a back-office engine | Whole card's content set. Your doc leaves this open, so decide on what you actually build most often. Worth settling before Card 3 is written |
| ☐ | **One referenceable outcome** (named logo + number, or anonymized sector + scale) | Homepage proof section AND the Strategy Engagement's public price. The single highest-leverage unlock here |
| ☐ | **Audit lead time**, the date for "Next audit slot: ___" | Audit page. Needs updating as the queue moves, so it lives in one config value |
| ☐ | Founder bio + photo | About page (currently marked placeholder) |
| ☐ | Real product screenshots, 4:3 | Product card thumbnails (currently CSS mockups) |
| ☐ | Homepage stat numbers | Stats strip figures are currently invented |

---

## 5. Carried over from the initial build

| ☐ | Item | Notes |
|---|---|---|
| ☑ | Contact form endpoint | Native form → Google Forms `formResponse`; Sheet is the inbox |
| ☐ | `public/CNAME` | Custom domain for GitHub Pages |

---

## Not blocking: for reference

These exist in the specs but are operations, not website work:

- Purchase automation (payment → confirmation email, form, doc request, two
  calendar holds), via n8n or Make listening to a Stripe webhook
- Template repos, opportunity library, transcript synthesis pipeline
- Hour tracking and conversion tracking sheets

The site's responsibility ends at the Payment Link and the intake form URL.
