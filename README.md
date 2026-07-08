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
