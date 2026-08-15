import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const products = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/products" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      tagline: z.string(),
      summary: z.string(),
      status: z.enum(["live", "beta", "coming-soon"]),
      acquire: z.boolean().default(false),
      url: z.string().url().optional(),
      order: z.number().default(99),
      placeholder: z.boolean().default(false),
      // Card thumbnail; when set it replaces the generated browser mock.
      thumbnail: image().optional(),
      heroStats: z
        .array(z.object({ value: z.string(), label: z.string() }))
        .default([]),
      techStack: z
        .array(z.object({ label: z.string(), value: z.string() }))
        .default([]),
      features: z
        .array(z.object({ title: z.string(), points: z.array(z.string()) }))
        .default([]),
    }),
});

const services = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/services" }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    priceLabel: z.string().optional(),
    timeline: z.string(),
    order: z.number().default(99),
    // Unlisted offers keep their page (so existing links and proposals still
    // resolve) but are hidden from the services index and homepage grid.
    unlisted: z.boolean().default(false),
    deliverables: z.array(z.string()).default([]),
    process: z
      .array(z.object({ step: z.string(), detail: z.string() }))
      .default([]),
    forWho: z.string().optional(),
  }),
});

/* ------------------------------------------------------------------
   Offers — the productized service set.
   Replaces `services` as offers are migrated over. Cards, advisory steps,
   and retainers share one shape: a price, a purchase path, a fixed scope,
   stated exclusions, and a named next purchase.
   ------------------------------------------------------------------ */

const money = z.object({
  amount: z.number().optional(),
  // fixed → "$2,500" · from → "Starting at $18,000" · monthly → "$12,000/mo"
  display: z.enum(["fixed", "from", "monthly", "inquire"]).default("fixed"),
  // Qualifier shown beneath the figure, e.g. "3-month minimum".
  note: z.string().optional(),
});

// Purchase paths, keyed to price band (offering doc §2.9).
const buying = z.object({
  mode: z.enum([
    "buy-now", // under $2,500 and $2,500 fixed tiers — Stripe Payment Link
    "call-then-link", // starting-at tiers — 20-min call, then a link
    "call-then-proposal", // over $12,000 — call, proposal, deposit link
    "inquire", // sold in conversation
  ]),
  checkoutUrl: z.string().url().optional(),
  callUrl: z.string().url().optional(),
  intakeUrl: z.string().url().optional(),
  ctaLabel: z.string().optional(),
});

const tier = z.object({
  name: z.string(),
  pricing: money,
  buying,
  timeline: z.string(),
  capacity: z.string().optional(),
  includes: z.array(z.string()).default([]),
  support: z.string().optional(),
  revisionCap: z.string().optional(),
  exitArtifact: z.string().optional(),
});

const offers = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/offers" }),
  schema: z
    .object({
      title: z.string(),
      family: z.enum(["cards", "advisory", "ongoing"]),
      kicker: z.string().optional(),
      summary: z.string(),
      forWho: z.string().optional(),
      order: z.number().default(99),
      step: z.number().optional(), // advisory ladder position
      timeline: z.string().optional(),

      /* --------------------------------------------------------------
         Buyer-language fields. These exist so the homepage Ascent
         section and the /advisory/ Decision Desk carry no hardcoded
         copy, and so the same sentences feed the FAQPage structured
         data. Keep them in the buyer's words, not ours.
         -------------------------------------------------------------- */
      // The generic category this offer belongs to, in the words a buyer
      // would search. Our product names are proprietary and have no search
      // volume of their own — this sits beside them so the page can rank for
      // the category while keeping the name.
      category: z.string().optional(),
      // The question this step answers, phrased the way it gets typed
      // into a search box or an assistant.
      question: z.string().optional(),
      // The same problem in the buyer's own first-person words. Used as
      // the Decision Desk chip: "pick the sentence you'd say out loud".
      situation: z.string().optional(),
      // A self-contained 40–60 word answer that survives being quoted
      // without the page around it. Falls back to `summary`.
      answer: z.string().optional(),

      // draft: the only flag that controls whether an offer reaches the site.
      // A draft builds no page at all, so it can't be linked, crawled, or land
      // in the sitemap. Default false — an offer is live unless it says
      // otherwise. Set `draft: true` to pull one back.
      draft: z.boolean().default(false),
      // published: completeness, NOT visibility. Flipping this on turns the
      // guardrails below into build errors — see superRefine. Leave it false
      // while an offer is still missing its checkout and intake URLs.
      published: z.boolean().default(false),
      // unlisted: keeps its page, drops out of indexes.
      unlisted: z.boolean().default(false),
      // priceGate: hold the price back. The real figure stays in the file;
      // every price surface renders "Pricing on request" until this is false.
      priceGate: z.boolean().default(false),
      featured: z.boolean().default(false),

      // Single-price offers use `pricing`/`buying`; tiered cards use `tiers`.
      pricing: money.optional(),
      buying: buying.optional(),
      tiers: z.array(tier).default([]),

      addOns: z
        .array(
          z.object({
            label: z.string(),
            amount: z.number(),
            note: z.string().optional(),
          }),
        )
        .default([]),
      // Scope values are display text, but YAML parses a bare `1` as a number,
      // so accept either and normalize.
      scope: z
        .array(
          z.object({
            label: z.string(),
            value: z.union([z.string(), z.number()]).transform(String),
          }),
        )
        .default([]),
      deliverables: z.array(z.string()).default([]),
      notFor: z.array(z.string()).default([]),
      exclusions: z.array(z.string()).default([]),
      process: z
        .array(z.object({ step: z.string(), detail: z.string() }))
        .default([]),
      revisionCap: z.string().optional(),
      exitArtifact: z.string().optional(),
      creditMechanic: z.string().optional(),
    })
    .superRefine((offer, ctx) => {
      // Draft offers may be incomplete. A published one may not: the operating
      // rule is that nothing goes live without a fixed deliverable list,
      // exclusions, a revision cap, and an intake form. Enforced here so a
      // half-specified offer fails the build instead of shipping quietly.
      if (!offer.published) return;

      const fail = (message: string) =>
        ctx.addIssue({ code: z.ZodIssueCode.custom, message });

      if (!offer.pricing && offer.tiers.length === 0) {
        fail("published offer needs `pricing` or at least one tier");
      }
      if (offer.deliverables.length === 0) {
        fail("published offer needs a `deliverables` list");
      }
      if (offer.exclusions.length === 0) {
        fail("published offer needs an `exclusions` list");
      }

      const paths = offer.tiers.length
        ? offer.tiers.map((t) => ({ buying: t.buying, label: t.name }))
        : [{ buying: offer.buying, label: offer.title }];

      for (const { buying: path, label } of paths) {
        if (!path) {
          fail(`published offer "${label}" needs a \`buying\` block`);
          continue;
        }
        if (!path.intakeUrl) {
          fail(`published offer "${label}" needs \`buying.intakeUrl\``);
        }
        if (path.mode === "buy-now" && !path.checkoutUrl) {
          fail(
            `published offer "${label}" is buy-now but has no \`buying.checkoutUrl\` — it would render a dead button`,
          );
        }
      }

      const hasRevisionCap =
        offer.revisionCap || offer.tiers.every((t) => t.revisionCap);
      if (!hasRevisionCap) {
        fail("published offer needs a `revisionCap`");
      }
    }),
});

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    pubDate: z.coerce.date(),
    // Derived from the body by `readingTime()` unless set explicitly here.
    readTime: z.string().optional(),
    // A draft still builds its page so it can be previewed at its real URL,
    // but it stays out of the blog index and the homepage list and renders
    // noindex. Flip to false to publish.
    draft: z.boolean().default(false),
  }),
});

export const collections = { products, services, offers, blog };
