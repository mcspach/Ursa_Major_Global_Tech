# Ursa Major Global Tech — Website

Marketing site for [ursamajorglobaltech.com](https://www.ursamajorglobaltech.com).
Static Astro build, dark-only art direction, GSAP + Lenis motion system.

## Stack

- **Astro 6** (static output) + SCSS design tokens — no Tailwind, no UI frameworks
- **GSAP + ScrollTrigger** scroll reveals, **Lenis** smooth scroll, **SplitType** headline masks
- Content in **Astro content collections** (`src/content/{products,services,blog}`)
- Self-hosted fonts: Clash Display (display), Satoshi (body), JetBrains Mono (labels)
- Deployed to **GitHub Pages** via `.github/workflows/deploy.yml` (`master` push);
  `npm run build` relativizes all URLs so the site works at any base path

## Develop

Requires Node ≥ 22.12 (`nvm use` picks it up from `.nvmrc`).

```sh
npm install
npm run dev      # localhost:4321
npm run build    # dist/ + relativized paths
```

## Architecture notes

- `src/scripts/transitions.js` — intro loader + curtain page transitions
  (sessionStorage keys `um:hasSeenIntro`, `um:navCover`)
- `src/scripts/motion.js` — Lenis/GSAP boot + `data-animate`, `data-split`,
  `data-marquee`, `data-counter`, `data-magnetic`, `data-parallax` primitives
- `src/scripts/constellation.js` — hero star-field canvas (Big Dipper asterism)
- All animation is progressive enhancement: no JS / reduced motion → fully
  visible static site

## Content conventions

Frontmatter flags that change how an entry is surfaced, rather than what it says.

**`unlisted: true`** (services) — the entry keeps its page, so existing links and
anything already sent out still resolve, but it disappears from the services
index and the homepage grid. Use this to retire an offer without creating a dead
URL. Filtering happens at the two grid queries; `[slug].astro` deliberately does
*not* filter, which is what keeps the page reachable.

**`placeholder: true`** (products) — marks invented filler content that must be
reviewed or removed before launch.

**`priceGate: true`** (offers — lands with the offering rework) — a feature flag
for pricing. The real figure stays in the content file, but every surface that
renders a price checks this flag first and prints "Pricing on request" instead.

The point is that one offer's price appears in several places — an index table, a
detail page, a comparison table, structured data. Without a single switch,
publishing a held-back price means editing each of them and hoping none is
missed, and a half-published price is worse than none at all. With the flag, you
change `true` to `false`, rebuild, and the number appears everywhere at once.

## Regenerating the OG image

`public/og_image.png` is a real screenshot of the hero. After changing the hero,
rebuild + serve, then re-capture (reduced-motion skips the intro curtain):

```sh
npm run build && npm run preview &   # serves dist on :4321
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
  --force-prefers-reduced-motion --force-device-scale-factor=2 \
  --window-size=1200,630 --hide-scrollbars --virtual-time-budget=8000 \
  --screenshot=og_raw.png "http://localhost:4321/"
sips -z 630 1200 og_raw.png --out public/og_image.png && rm og_raw.png
```

## Placeholders to swap before launch

- [ ] **Contact form** — `src/pages/contact.astro` posts to a Formspree
      placeholder (`YOUR_FORM_ID`); create the form and swap the ID
- [ ] **Booking link** — `BOOKING_URL` in `contact.astro` points to a
      placeholder Cal.com URL
- [ ] **Founder bio + photo** — `src/pages/about.astro` (marked in-page)
- [ ] **Stats** — `src/components/sections/StatsStrip.astro` numbers are invented
- [ ] **Placeholder products** — Northstar Metrics + StackAudit
      (`placeholder: true` in frontmatter); keep, edit, or delete
- [ ] **Blog posts** — all six are ghost-written; review before indexing
- [ ] **CNAME** — add `public/CNAME` with the custom domain when wiring
      GitHub Pages to it
