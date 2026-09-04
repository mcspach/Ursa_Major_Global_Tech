/**
 * JSON-LD builders.
 *
 * One rule governs everything here: the structured data may only state what the
 * page states. A `priceGate`d offer renders "Pricing on request" on every
 * surface, so its Offer node ships with no price at all, never a placeholder,
 * never the real figure smuggled into the markup where a crawler can read what
 * a visitor can't. `scripts/check-schema.mjs` makes that a build failure rather
 * than a convention.
 *
 * Every node carries a stable `@id`, so pages reference the Organization and
 * WebSite rather than restating them. BaseLayout assembles one `@graph` per page
 * from the sitewide nodes plus whatever the page passes in.
 *
 * URLs are always absolute, built with `toAbsoluteUrl`. `relativize-dist.mjs`
 * rewrites URL *attributes* only, so a root-relative path inside a script body
 * would ship broken.
 */
import { toAbsoluteUrl } from "./paths";

export const SITE_NAME = "Ursa Major Global Tech";
const CONTACT_EMAIL = "hello@ursamajorglobaltech.com";
const LANGUAGE = "en-US";

const ORG_DESCRIPTION =
  "An AI-accelerated software studio building production-ready applications, AI automation systems, and white-label products.";

type Site = URL | string;

const anchor = (path: string, site: Site, hash: string) =>
  `${toAbsoluteUrl(path, site)}#${hash}`;

/* ------------------------------------------------------------------
   Sitewide identities. Everything else points at these by @id.
   ------------------------------------------------------------------ */

export const orgId = (site: Site) => anchor("/", site, "organization");
export const siteId = (site: Site) => anchor("/", site, "website");
export const pageId = (path: string, site: Site) =>
  anchor(path, site, "webpage");
export const breadcrumbId = (path: string, site: Site) =>
  anchor(path, site, "breadcrumb");

const ref = (id: string) => ({ "@id": id });

/**
 * `Organization`, not `ProfessionalService`. The LocalBusiness family expects a
 * postal address, and we don't publish one, so claiming that type would assert
 * something the site doesn't say.
 *
 * `logo` and `sameAs` are deliberately absent until there is a square raster
 * mark and confirmed profile URLs. See reference/punchlist.md.
 */
export const organization = (site: Site) => ({
  "@type": "Organization",
  "@id": orgId(site),
  name: SITE_NAME,
  url: toAbsoluteUrl("/", site),
  description: ORG_DESCRIPTION,
  email: CONTACT_EMAIL,
});

export const website = (site: Site) => ({
  "@type": "WebSite",
  "@id": siteId(site),
  url: toAbsoluteUrl("/", site),
  name: SITE_NAME,
  description: ORG_DESCRIPTION,
  inLanguage: LANGUAGE,
  publisher: ref(orgId(site)),
});

/* ------------------------------------------------------------------
   Per-page frame: WebPage + BreadcrumbList, both derived from the
   canonical path BaseLayout already receives, so they can't drift from
   the canonical URL.
   ------------------------------------------------------------------ */

/** Human labels for the path segments that aren't content slugs. */
const SEGMENT_LABELS: Record<string, string> = {
  about: "About",
  advisory: "Advisory",
  blog: "Blog",
  contact: "Contact",
  products: "Products",
  services: "Services",
};

const segments = (path: string) =>
  path.split("/").filter((segment) => segment.length > 0);

/**
 * Home > Section > Page, built from the URL.
 *
 * Returns null for the homepage: a single-item trail describes nothing, and
 * Google asks for breadcrumbs to be omitted rather than stubbed.
 */
export const breadcrumbs = (path: string, site: Site, leafName: string) => {
  const parts = segments(path);

  if (parts.length === 0) {
    return null;
  }

  const items = [{ name: "Home", path: "/" }];

  parts.forEach((segment, index) => {
    const isLeaf = index === parts.length - 1;
    const label = isLeaf
      ? leafName
      : (SEGMENT_LABELS[segment] ?? SEGMENT_LABELS[segment.toLowerCase()]);

    // A middle segment we have no label for would produce a crumb naming a
    // slug at the reader. Skip the whole trail rather than guess.
    if (!label) {
      return;
    }

    items.push({
      name: label,
      path: `/${parts.slice(0, index + 1).join("/")}/`,
    });
  });

  if (items.length !== parts.length + 1) {
    return null;
  }

  return {
    "@type": "BreadcrumbList",
    "@id": breadcrumbId(path, site),
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: toAbsoluteUrl(item.path, site),
    })),
  };
};

interface WebPageInput {
  path: string;
  site: Site;
  name: string;
  description: string;
  /** AboutPage, ContactPage, CollectionPage, WebPage… */
  type?: string;
  hasBreadcrumb?: boolean;
  /** The primary entity this page is about, by @id. */
  about?: string;
}

export const webPage = ({
  path,
  site,
  name,
  description,
  type = "WebPage",
  hasBreadcrumb = true,
  about,
}: WebPageInput) => ({
  "@type": type,
  "@id": pageId(path, site),
  url: toAbsoluteUrl(path, site),
  name,
  description,
  inLanguage: LANGUAGE,
  isPartOf: ref(siteId(site)),
  ...(about ? { about: ref(about) } : {}),
  ...(hasBreadcrumb ? { breadcrumb: ref(breadcrumbId(path, site)) } : {}),
});

/* ------------------------------------------------------------------
   Offers and pricing.
   ------------------------------------------------------------------ */

interface Pricing {
  amount?: number;
  display?: "fixed" | "from" | "monthly" | "inquire";
  note?: string;
}

/** The subset of an offer's frontmatter the builders below read. */
export interface OfferLike {
  id: string;
  data: {
    title: string;
    summary: string;
    step?: number;
    timeline?: string;
    pricing?: Pricing;
    priceGate: boolean;
    category?: string;
    question?: string;
    answer?: string;
    deliverables?: string[];
    forWho?: string;
  };
}

/**
 * Mirrors PriceTag's withholding logic: if the component won't print the
 * figure, the schema doesn't either.
 */
const priceSpecification = (pricing: Pricing | undefined, gated: boolean) => {
  if (gated || !pricing?.amount || pricing.display === "inquire") {
    return undefined;
  }

  const base = { priceCurrency: "USD" };

  if (pricing.display === "monthly") {
    return {
      "@type": "UnitPriceSpecification",
      ...base,
      price: pricing.amount,
      unitText: "MONTH",
      billingIncrement: 1,
    };
  }

  if (pricing.display === "from") {
    return {
      "@type": "PriceSpecification",
      ...base,
      minPrice: pricing.amount,
    };
  }

  return {
    "@type": "PriceSpecification",
    ...base,
    price: pricing.amount,
  };
};

const offerService = (offer: OfferLike, url: string, site: Site) => ({
  "@type": "Service",
  name: offer.data.title,
  // Our product names carry no search volume of their own. The generic
  // category rides alongside as an alternateName so an assistant learns that
  // "AI Opportunity Audit" and "AI readiness assessment" name the same thing.
  ...(offer.data.category ? { alternateName: offer.data.category } : {}),
  description: offer.data.summary,
  serviceType: offer.data.category ?? "AI advisory",
  url,
  provider: ref(orgId(site)),
});

/**
 * The four advisory steps as an OfferCatalog. Rendered on any page that shows
 * the ladder, since the nodes describe exactly what those pages display.
 */
export const advisoryCatalog = (offers: OfferLike[], site: Site) => ({
  "@type": "OfferCatalog",
  "@id": anchor("/advisory/", site, "catalog"),
  name: "AI Advisory",
  description:
    "Four ways to decide what AI is worth before you build it: an opportunity audit, a strategy engagement, fractional AI leadership, and an advisory retainer. Every price is published, and what you spend deciding credits toward what you build.",
  provider: ref(orgId(site)),
  itemListElement: offers.map((offer, index) => {
    const url = toAbsoluteUrl(`/advisory/${offer.id}/`, site);
    const spec = priceSpecification(offer.data.pricing, offer.data.priceGate);

    return {
      "@type": "Offer",
      position: offer.data.step ?? index + 1,
      url,
      ...(spec ? { priceSpecification: spec } : {}),
      itemOffered: offerService(offer, url, site),
    };
  }),
});

/**
 * A single advisory step's own page: the Service, and an Offer for it when
 * there is a price the page actually prints.
 */
export const advisoryOffer = (offer: OfferLike, site: Site) => {
  const path = `/advisory/${offer.id}/`;
  const url = toAbsoluteUrl(path, site);
  const spec = priceSpecification(offer.data.pricing, offer.data.priceGate);

  return {
    "@type": "Service",
    "@id": anchor(path, site, "service"),
    ...offerService(offer, url, site),
    ...(offer.data.forWho ? { audience: { "@type": "Audience", audienceType: offer.data.forWho } } : {}),
    ...(offer.data.deliverables?.length
      ? { serviceOutput: offer.data.deliverables.map((item) => ({ "@type": "Thing", name: item })) }
      : {}),
    ...(spec
      ? {
          offers: {
            "@type": "Offer",
            url,
            priceSpecification: spec,
            availability: "https://schema.org/InStock",
            seller: ref(orgId(site)),
          },
        }
      : {}),
  };
};

/* ------------------------------------------------------------------
   Services (the older `services` collection).
   ------------------------------------------------------------------ */

export interface ServiceLike {
  id: string;
  data: {
    title: string;
    summary: string;
    timeline: string;
    priceLabel?: string;
    forWho?: string;
    deliverables?: string[];
  };
}

export const serviceNode = (service: ServiceLike, site: Site) => {
  const path = `/services/${service.id}/`;
  const url = toAbsoluteUrl(path, site);

  return {
    "@type": "Service",
    "@id": anchor(path, site, "service"),
    name: service.data.title,
    description: service.data.summary,
    serviceType: service.data.title,
    url,
    provider: ref(orgId(site)),
    ...(service.data.forWho
      ? { audience: { "@type": "Audience", audienceType: service.data.forWho } }
      : {}),
    ...(service.data.deliverables?.length
      ? {
          serviceOutput: service.data.deliverables.map((item) => ({
            "@type": "Thing",
            name: item,
          })),
        }
      : {}),
    // `priceLabel` is display text ("From $12,000"), not a figure we can
    // assert as a number, so it stays out. When these migrate to `offers`
    // they inherit the structured pricing above.
  };
};

/* ------------------------------------------------------------------
   Products (in-house software).
   ------------------------------------------------------------------ */

export interface ProductLike {
  id: string;
  data: {
    title: string;
    tagline: string;
    summary: string;
    status: "live" | "beta" | "coming-soon";
    url?: string;
    placeholder?: boolean;
  };
}

/**
 * No `offers` node: product pages publish no prices, so there is no figure to
 * state. No `aggregateRating` either, for the same reason.
 */
export const softwareApplication = (product: ProductLike, site: Site) => {
  const path = `/products/${product.id}/`;

  return {
    "@type": "SoftwareApplication",
    "@id": anchor(path, site, "app"),
    name: product.data.title,
    alternateName: product.data.tagline,
    description: product.data.summary,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: toAbsoluteUrl(path, site),
    ...(product.data.url ? { sameAs: product.data.url } : {}),
    publisher: ref(orgId(site)),
  };
};

/* ------------------------------------------------------------------
   Blog.
   ------------------------------------------------------------------ */

export interface PostLike {
  id: string;
  data: {
    title: string;
    description: string;
    category: string;
    pubDate: Date;
    updatedDate?: Date;
    author?: string;
  };
}

interface BlogPostingInput {
  post: PostLike;
  site: Site;
  wordCount: number;
  readingMinutes: number;
}

export const blogPosting = ({
  post,
  site,
  wordCount,
  readingMinutes,
}: BlogPostingInput) => {
  const path = `/blog/${post.id}/`;

  return {
    "@type": "BlogPosting",
    "@id": anchor(path, site, "article"),
    headline: post.data.title,
    description: post.data.description,
    url: toAbsoluteUrl(path, site),
    datePublished: post.data.pubDate.toISOString(),
    ...(post.data.updatedDate
      ? { dateModified: post.data.updatedDate.toISOString() }
      : {}),
    articleSection: post.data.category,
    wordCount,
    timeRequired: `PT${readingMinutes}M`,
    inLanguage: LANGUAGE,
    author: post.data.author ? { "@type": "Organization", name: post.data.author } : ref(orgId(site)),
    publisher: ref(orgId(site)),
    mainEntityOfPage: ref(pageId(path, site)),
    isPartOf: ref(anchor("/blog/", site, "blog")),
  };
};

export const blogNode = (site: Site) => ({
  "@type": "Blog",
  "@id": anchor("/blog/", site, "blog"),
  name: `${SITE_NAME} Blog`,
  description:
    "Practical writing on AI-assisted development, architecture decisions, automation, and shipping software fast.",
  url: toAbsoluteUrl("/blog/", site),
  publisher: ref(orgId(site)),
  inLanguage: LANGUAGE,
});

/* ------------------------------------------------------------------
   Generic collections and Q&A.
   ------------------------------------------------------------------ */

interface ListEntry {
  path: string;
  name: string;
}

export const itemList = (
  entries: ListEntry[],
  site: Site,
  { id, name }: { id: string; name: string },
) => ({
  "@type": "ItemList",
  "@id": id,
  name,
  numberOfItems: entries.length,
  itemListElement: entries.map((entry, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: entry.name,
    url: toAbsoluteUrl(entry.path, site),
  })),
});

/** `itemList` keyed to a page, for the collection indexes. */
export const pageItemList = (
  path: string,
  entries: ListEntry[],
  site: Site,
  name: string,
) => itemList(entries, site, { id: anchor(path, site, "list"), name });

/**
 * Question/answer pairs as a FAQPage.
 *
 * Google restricted FAQ rich results to authoritative health and government
 * sites, so this earns no SERP widget. It exists because it is the cleanest
 * machine-readable form of these answers for assistants that cite sources.
 */
export const faqPage = (
  pairs: { question: string; answer: string }[],
  site: Site,
  path: string,
) => {
  if (pairs.length === 0) {
    return null;
  }

  return {
    "@type": "FAQPage",
    "@id": anchor(path, site, "faq"),
    mainEntity: pairs.map((pair) => ({
      "@type": "Question",
      name: pair.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: pair.answer,
      },
    })),
  };
};

/** The advisory ladder's question→answer pairs. */
export const advisoryFaq = (offers: OfferLike[], site: Site, path: string) =>
  faqPage(
    offers
      .filter((offer) => offer.data.question)
      .map((offer) => ({
        question: offer.data.question as string,
        answer: offer.data.answer ?? offer.data.summary,
      })),
    site,
    path,
  );

/* ------------------------------------------------------------------
   Contact.
   ------------------------------------------------------------------ */

export const contactPoint = (site: Site) => ({
  "@type": "ContactPoint",
  "@id": anchor("/contact/", site, "contact-point"),
  contactType: "Sales and new projects",
  email: CONTACT_EMAIL,
  availableLanguage: "English",
});
