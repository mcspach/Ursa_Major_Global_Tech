# Site Punchlist

Running checklist of work on the Ursa Major Global Tech site.
Add new items at the bottom. Check items off as they ship.

---

## 1. About page: copy + images with strong AEO signals

**Status:** Not started
**Files:** [src/pages/about.astro](../src/pages/about.astro), [src/layouts/BaseLayout.astro](../src/layouts/BaseLayout.astro), [public/](../public/)

Rewrite About copy so answer engines (ChatGPT, Perplexity, Google AI Overviews, Claude)
can extract and cite it cleanly, and add real imagery, since the page currently has zero
raster images, only the `ConstellationMark` SVG.

### Copy
- [ ] Add a direct, quotable definition sentence near the top ("Ursa Major Global Tech is
      an AI-accelerated software studio based in ___ that builds ___ for ___ in ___ weeks.")
      This is one self-contained sentence an LLM can lift without surrounding context.
- [ ] Convert the studio narrative into extractable chunks: short H2/H3 headings phrased
      as the questions people actually ask ("What does Ursa Major Global Tech do?",
      "How fast do you ship?", "Who do you work with?", "What does it cost?").
- [ ] Lead each section with the answer, then the supporting detail (inverted pyramid).
- [ ] Add concrete, citable specifics: founding year, location/timezone, team size,
      years of experience, number of projects shipped, typical engagement length and price
      range. Answer engines strongly prefer numbers and named entities over adjectives.
- [ ] Add a short FAQ block at the bottom (4–6 Q&As). Highest-yield AEO surface.
- [ ] Name the entity in full ("Ursa Major Global Tech") in first mention of each major
      section rather than relying on "we" throughout.
- [ ] Keep principles + stack sections, but make each stack group a sentence that states
      *why* it's used, not just a keyword list.

### Structured data
Mostly shipped in §3. What's left here needs facts, not code.
- [x] Decide where JSON-LD lives. Settled: a `schema` prop on `BaseLayout.astro`
      assembles one `@graph` per page. See §3.
- [x] `Organization` JSON-LD, sitewide.
- [x] `AboutPage` + `BreadcrumbList`.
- [ ] Add `FAQPage` JSON-LD matching the new FAQ block verbatim, once the FAQ
      block exists. `faqPage()` in `src/utils/schema.ts` already builds it.
- [ ] Fill the Organization gaps listed in §3: logo, sameAs, areaServed,
      foundingDate, founder.

### Images
- [ ] Source or produce real imagery: founder/team photo, workspace or process shot,
      and at least one product/work screenshot.
- [ ] Descriptive, entity-rich `alt` text on every image (alt text is read by crawlers
      and increasingly by multimodal answer engines).
- [ ] Serve modern formats (`.webp`/`.avif`) with explicit `width`/`height` to avoid CLS.
- [ ] Add an About-specific OG image rather than reusing the global `og_image.png`.

### Verify
- [ ] Validate JSON-LD in Google Rich Results Test / Schema.org validator.
- [ ] Re-read the page top-to-bottom asking "could a model answer 'who is Ursa Major
      Global Tech?' using only this page?"

---

## 2. Remove Products from top nav (keep section live + in footer)

**Status:** Not started
**Files:** [src/components/sections/Header.astro](../src/components/sections/Header.astro)

The `/products/` section stays fully live and reachable; it's only being pulled out of
primary navigation.

- [ ] Remove the `{ label: "Products", href: "/products/" }` entry from `NAV_LINKS` in
      [Header.astro:8](../src/components/sections/Header.astro#L8). This drives both the
      desktop nav and the mobile menu, so one edit covers both.
- [ ] Leave `QUICK_LINKS` in [Footer.astro:8](../src/components/sections/Footer.astro#L8)
      unchanged, so Products stays in the footer.
- [ ] Confirm `/products/` and `/products/[slug]/` still build and render.
- [ ] Check the mobile menu numbering (`0{index + 1}`) still reads correctly with one
      fewer item.
- [ ] Sweep for other in-body links to Products (home page, service pages, CTAs) and
      decide which stay, because removing it from nav shouldn't orphan the section.
- [ ] Make sure Products pages remain in the sitemap and are not `noindex`.

---

## 3. Structured data across every page

**Status:** Shipped, with open inputs below.
**Files:** [src/utils/schema.ts](../src/utils/schema.ts),
[src/layouts/BaseLayout.astro](../src/layouts/BaseLayout.astro),
[scripts/check-schema.mjs](../scripts/check-schema.mjs)

All 25 indexable pages now emit one `@graph` each. `/404` emits none on purpose:
structured data exists to be indexed, and that page is `noindex`.

`BaseLayout` injects `Organization`, `WebSite`, `WebPage`, and a
`BreadcrumbList` derived from `canonicalPath`, so breadcrumbs can't drift from
the canonical URL. Pages pass only their own nodes via the `schema` prop.

`npm run build` runs `scripts/check-schema.mjs`, which fails the build on
unparseable JSON-LD, a dangling `@id` reference, a missing baseline node, a
root-relative URL, or **a `priceGate`d figure appearing in any graph**. That
last one is the point of the script: a gated offer prints "Pricing on request"
to a reader, so a crawler must not be able to read the number either.

### Open inputs, all needing a real fact rather than a guess

- [ ] **`sameAs` profiles.** LinkedIn / GitHub / X URLs. Omitted entirely for
      now rather than guessed. Add to `organization()` in `schema.ts`.
- [ ] **`Organization.logo`.** Needs a square raster mark; `og_image.png` is
      1200x630 and wrong for this. Blocked on the logo/iconography set.
- [ ] **`areaServed` / `address`.** Left off, which is also why the node is
      `Organization` and not `ProfessionalService`: the LocalBusiness family
      expects a postal address, and claiming that type without one would assert
      something the site never says. Revisit once the address is settled.
- [ ] **Founder `Person` node.** Held back entirely. The about page shows
      "Ryan" over an explicitly placeholder bio, and the surname needs
      confirming before it goes into structured data (Jocobson or Jacobson?).
      Once the official name, title, bio, and photo land, add a `Person` and
      point `Organization.founder` at it.
- [ ] **`foundingDate`.** Not stated anywhere on the site yet.

### Decisions already made, recorded so they don't get re-litigated

- **Placeholder products get `SoftwareApplication` anyway.** Northstar Metrics
      and StackAudit are `placeholder: true`, and their nodes ship regardless,
      so the schema goes live with the real copy. No `offers` node on any
      product (no page publishes a price) and no `aggregateRating` (invented
      ratings are the one structured-data lie that draws a manual penalty).
- **Unpublished advisory offers get full schema anyway.** All four are
      `published: false`, but their pages build and are crawlable, so the
      structured data goes live the moment the checkout and intake URLs do.
      `priceGate` is the separate lever and still withholds the figure.
- **`BlogPosting.author` defaults to the Organization.** The blog collection
      now takes an optional `author`; set it only for a real personal byline.
- **`updatedDate` is opt-in and currently unset on all seven posts.** It feeds
      `dateModified`. The em-dash copy-edit pass was not a content revision, so
      stamping today's date on every post would have signalled freshness that
      isn't there. Bump it on substantive rewrites.

### Verify before go-live
- [ ] Run `/` , `/advisory/ai-opportunity-audit/`, and one blog post through the
      Google Rich Results Test and the Schema.org validator.
- [ ] Re-check `/advisory/ai-strategy-engagement/` shows **no** price in its
      graph while `priceGate: true`, then re-check it *does* the moment the gate
      comes off.
- [ ] Confirm the reviewed-and-real blog copy is in place before these posts get
      indexed as citable `BlogPosting` nodes. The README launch checklist flags
      all seven as ghost-written and needing review before indexing, and
      structured data makes them *more* quotable, not less.
