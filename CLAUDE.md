# CLAUDE.md

## Project Overview

Marketing site for [ursamajorglobaltech.com](https://www.ursamajorglobaltech.com) —
Ursa Major Global Tech, an AI-accelerated software studio.

Static Astro 6 build, dark-only art direction, GSAP + Lenis motion system,
content in Astro content collections. Built as a fresh Astro project following
the conventions of the `mcspach/Redtail_Website` repo. Deployed to GitHub Pages.

The site is pre-launch: several surfaces are deliberately placeholders. See
**Placeholders** below before treating any number, price, or endpoint as real.

## Primary Goals

- Keep the site static-compatible. `output: "static"`, no adapter, no SSR.
- Keep it deployable at any base path (GitHub Pages project pages, custom domain,
  local `preview`). This is why `npm run build` runs `relativize-dist.mjs`.
- Keep the codebase clean, component-driven, and token-driven.
- Avoid unnecessary dependencies. The five runtime deps are load-bearing;
  adding a sixth needs a reason.
- Content stays in files. Content collections are the CMS; do not add a hosted one.

## Tech Stack

Use:

- **Astro 6** (static output), `.astro` components, MDX where a content file
  needs components
- **SCSS** with the design tokens in [src/styles/_tokens.scss](src/styles/_tokens.scss)
- **GSAP + ScrollTrigger** for scroll reveals, **Lenis** for smooth scroll,
  **SplitType** for headline masks — always through the primitives in
  [src/scripts/motion.js](src/scripts/motion.js)
- **Astro content collections** with Zod schemas in [src/content.config.ts](src/content.config.ts)
- **Self-hosted fonts** in [public/fonts/](public/fonts/): Clash Display (display),
  Satoshi (body), JetBrains Mono (labels/eyebrows)
- **GitHub Pages** for deployment

Do not use:

- Bootstrap, Tailwind, or any third-party UI kit
- React, Vue, Svelte, or any framework integration
- Contentful or any hosted CMS
- Server-side rendering, adapters, or API routes
- Webfont CDNs (fonts are self-hosted on purpose — no third-party render blocking)

## Project Structure

```text
public/
  fonts/            self-hosted woff2
  favicon.svg  og_image.png  robots.txt

src/
  assets/           images that go through Astro's image pipeline
  components/
    ui/             cards, buttons, marks — small and reusable
    sections/       full-width page sections, header, footer
  content/
    products/  services/  offers/  blog/
  layouts/          BaseLayout.astro — head, schema graph, header/footer
  pages/
  scripts/          motion.js, transitions.js, constellation.js
  styles/           _tokens, _base, _utilities, global
  utils/            paths, schema, offers, reading

scripts/            build-time Node scripts (not shipped to the browser)
reference/          punchlist.md + launch-inputs.md are committed;
                    the offering/strategy specs beside them are gitignored
```

Two things about this tree that are easy to get wrong:

- **`src/assets/` vs `public/`.** Anything referenced by Astro's `<Image>` or a
  collection's `image()` schema field lives in `src/assets/` so it gets hashed and
  converted to webp. `public/` is for files that must keep their exact path
  (fonts, robots.txt, the OG image, a future `CNAME`).
- **`reference/` is opt-in, and the repo is public.** `.gitignore` ignores
  `reference/*` and negates the two working checklists (`punchlist.md`,
  `launch-inputs.md`), so those are committed and safe to link. The offering and
  strategy specs beside them stay local — they carry gated pricing and
  positioning that must not reach a public repo. A new doc dropped in
  `reference/` is ignored by default; that is deliberate. Read the local specs
  for context, but never assume CI or a fresh clone can see them, and never
  quote gated prices out of them into anything committed.

## Build Pipeline

`npm run build` is three steps, and the two after `astro build` matter:

1. `astro build` → `dist/`
2. `node ./scripts/check-schema.mjs` → validates the JSON-LD in the built HTML.
   The check that earns its keep: a `priceGate`d offer must not leak its real
   price into structured data, where a crawler would read a figure the visitor
   can't see. This is a build failure by design.
3. `node ./scripts/relativize-dist.mjs` → rewrites URL *attributes* in `dist`
   HTML/CSS to relative paths, so the build works at any base path.

Consequences for anything you write:

- A root-relative path inside a `<script>` body or a JS string will **not** be
  relativized and will ship broken. Build links with `withBase()` from
  [src/utils/paths.ts](src/utils/paths.ts).
- Never hand-edit `dist/`. It is gitignored and regenerated.
- If you add a JSON-LD node, expect `check-schema.mjs` to have an opinion:
  every node needs a type, every internal `@id` reference must resolve, and
  no page may be missing its baseline nodes.

## Local Development

```sh
nvm use          # reads .nvmrc
npm install
npm run dev      # localhost:4321
npm run build    # dist/ + schema check + relativized paths
npm run preview  # serve dist
```

**Node quirk on this machine:** the default node is v20, but Astro 6 needs
≥ 22.12. v22.23.1 is installed at `~/.nvm/versions/node/v22.23.1/bin`, and
[.claude/launch.json](.claude/launch.json) invokes that binary directly because
`npm` from a bare PATH will fail. If a build or dev server dies with an engine
error, check `node -v` first.

## Architecture Notes

- **[src/layouts/BaseLayout.astro](src/layouts/BaseLayout.astro)** owns the head:
  canonical URL, OG tags, and one JSON-LD `@graph` per page. Pages pass only the
  nodes specific to them; Organization, WebSite, WebPage, and BreadcrumbList are
  added here so the breadcrumb trail can't drift from the canonical path. A
  `noindex` page emits no graph at all.
- **[src/utils/schema.ts](src/utils/schema.ts)** holds every JSON-LD builder under
  one rule: *the structured data may only state what the page states.* Read the
  file header before adding a node.
- **[src/scripts/motion.js](src/scripts/motion.js)** boots Lenis + ScrollTrigger and
  implements the `data-animate`, `data-animate-children`, `data-split`,
  `data-marquee`, `data-counter`, `data-parallax`, `data-magnetic` primitives.
  New animation goes through these attributes, not a one-off GSAP call in a
  component.
- **[src/scripts/transitions.js](src/scripts/transitions.js)** is the intro loader
  and curtain page transitions, coordinated through sessionStorage
  (`um:hasSeenIntro`, `um:navCover`) and the `html.um-intro-boot` /
  `html.um-nav-boot` pre-paint classes. It is the most timing-sensitive file in
  the repo; change it with the dev server open.
- **All motion is progressive enhancement.** No JS, or `prefers-reduced-motion`,
  means `html.um-js` is absent and every element is fully visible. Never let a
  reveal animation be the only thing that makes content readable.

## Content Conventions

Frontmatter flags change how an entry is *surfaced*, not what it says. The
schemas in [src/content.config.ts](src/content.config.ts) are commented; the flags
that trip people up:

- **`draft: true`** (blog, offers) — for blog, the page still builds at its real
  URL for preview but renders `noindex` and drops out of indexes. For offers, no
  page is built at all, so it can't be linked, crawled, or land in the sitemap.
  Same word, different blast radius.
- **`unlisted: true`** (services, offers) — keeps the page, drops it from the
  index and homepage grids. Retires an offer without creating a dead URL.
  Filtering happens at the grid queries; `[slug].astro` deliberately does *not*
  filter, which is what keeps the page reachable.
- **`priceGate: true`** (offers) — a feature flag for pricing. The real figure
  stays in the content file, but every surface that renders a price checks the
  flag and prints "Pricing on request" instead. One offer's price appears in an
  index, a detail page, a comparison table, and structured data; without a single
  switch, publishing means editing each and hoping none is missed, and a
  half-published price is worse than none.
- **`published: true`** (offers) — completeness, *not* visibility. Flipping it on
  turns the `superRefine` guardrails into build errors: deliverables, exclusions,
  a revision cap, an intake URL, and a checkout URL for `buy-now` modes. A
  half-specified offer fails the build instead of shipping a dead button.
- **`placeholder: true`** (products) — invented filler content that must be
  reviewed or removed before launch.

The `services` and `offers` collections overlap: `offers` is the newer
productized set that is progressively replacing `services`. Check which one a
page reads before editing content.

## Placeholders

Tracked in the [README](README.md) checklist and [reference/punchlist.md](reference/punchlist.md).
The ones that will bite an agent:

- **Contact form** — [src/pages/contact.astro](src/pages/contact.astro) posts to
  `https://formspree.io/f/YOUR_FORM_ID`. It is not a working form.
- **Booking link** — `BOOKING_URL` in the same file is a placeholder Cal.com URL.
  Neither it nor the form endpoint is in structured data yet, on purpose.
- **Stats** — [StatsStrip.astro](src/components/sections/StatsStrip.astro) numbers are invented.
- **Blog** — all seven posts are ghost-written and unreviewed.
- **Products** — Northstar Metrics and StackAudit are `placeholder: true`.
- **Founder bio + photo** — marked in-page in [about.astro](src/pages/about.astro).

Do not present placeholder figures as facts in new copy, and do not add them to
JSON-LD.

## Regenerating the OG Image

`public/og_image.png` is a real screenshot of the hero, so it goes stale when the
hero changes. The headless-Chrome recipe is in the [README](README.md) — reduced
motion is what skips the intro curtain.

## Helpful Skills

Reach for these before improvising. The first two are personal installs in
`~/.claude/skills/` — they are not committed to this repo, so another machine or
a CI run may not have them.

### Installed locally

- **`impeccable`** — frontend design and UX work: visual hierarchy, spacing,
  typography, color, motion, accessibility, responsive behavior, UX copy, empty
  and error states. This is a brand-led marketing site where the design *is* the
  product, so use it for section layout and polish rather than eyeballing CSS.
  It respects existing design tokens — point it at [src/styles/](src/styles/) so
  it extends the system instead of inventing a parallel one.

- **`google-form-native`** — not currently wired up, but it is the cheapest
  answer to the open contact-form placeholder. The site is static with no
  backend, so a hand-built form POSTing to a Google Form's `formResponse`
  endpoint (Sheets as the inbox) is a free alternative to the Formspree ID that
  still needs creating. It ships an `entry.*` extractor and, more importantly,
  documents the silent-failure traps: the hidden sink iframe's `load` event fires
  whether Google accepted the POST or rejected it, so a field required in Google
  Forms but optional in the HTML shows the visitor a success message and writes
  nothing. Read its `references/gotchas.md` before wiring any field names.

### Built in

- **`run`** — launch the dev server and actually look at a change. Prefer this
  over declaring visual or animation work done from the source alone. The intro
  curtain, GSAP scroll timings, and Lenis behavior in
  [transitions.js](src/scripts/transitions.js) cannot be verified by reading code.

- **`code-review`** — bug-hunting pass over the current diff. Worth running
  before any commit touching [src/scripts/](src/scripts/) or an inline `<script>`
  block, since Astro type-checks those at build time and DOM null-guards are easy
  to miss in progressive-enhancement code.

- **`simplify`** — quality-only pass for reuse and duplication. Useful against
  [_utilities.scss](src/styles/_utilities.scss) (395 lines and growing, where new
  rules often duplicate existing ones) and [schema.ts](src/utils/schema.ts).

- **`security-review`** — narrow value here: the site is static, has no backend,
  and takes no user input beyond a form that posts to a third party. Reach for it
  only if a change adds a genuinely new surface.

Skip `dataviz` (no charts on this site) and the `artifact-*` skills (those are for
publishing shareable pages, not for site work).

## Conventions

- Commit to a branch and PR into `master`; `master` pushes deploy to production.
- Comments explain *why*, not *what*. The existing file headers in `schema.ts`,
  `motion.js`, and `check-schema.mjs` are the house style: state the rule and the
  failure it prevents.
- Match the surrounding code. Tokens over hardcoded values, `withBase()` over
  string-concatenated paths, existing utility classes over new ones.
