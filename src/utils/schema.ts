/**
 * JSON-LD builders for the advisory ladder.
 *
 * One rule governs everything here: the structured data may only state what the
 * page states. A `priceGate`d offer renders "Pricing on request" on every
 * surface, so its Offer node ships with no price at all — never a placeholder,
 * never the real figure smuggled into the markup where a crawler can read what
 * a visitor can't.
 */
import { toAbsoluteUrl } from "./paths";

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
    question?: string;
    answer?: string;
  };
}

const PROVIDER = {
  "@type": "Organization",
  name: "Ursa Major Global Tech",
} as const;

/**
 * Mirrors PriceTag's withholding logic — if the component won't print the
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

/**
 * The four advisory steps as an OfferCatalog. Rendered on any page that shows
 * the ladder, since the nodes describe exactly what those pages display.
 */
export const advisoryCatalog = (offers: OfferLike[], site: URL | string) => ({
  "@context": "https://schema.org",
  "@type": "OfferCatalog",
  name: "AI Advisory",
  description:
    "A four-step advisory ladder: opportunity audit, strategy engagement, fractional AI leadership, and executive advisory. Each step has a fixed scope and credits toward the work it recommends.",
  provider: PROVIDER,
  itemListElement: offers.map((offer, index) => {
    const url = toAbsoluteUrl(`/advisory/${offer.id}/`, site);
    const spec = priceSpecification(offer.data.pricing, offer.data.priceGate);

    return {
      "@type": "Offer",
      position: offer.data.step ?? index + 1,
      url,
      ...(spec ? { priceSpecification: spec } : {}),
      itemOffered: {
        "@type": "Service",
        name: offer.data.title,
        description: offer.data.summary,
        serviceType: "AI advisory",
        url,
        provider: PROVIDER,
      },
    };
  }),
});

/**
 * The Decision Desk's question→answer pairs as a FAQPage.
 *
 * Google restricted FAQ rich results to authoritative health and government
 * sites, so this earns no SERP widget — it exists because it is the cleanest
 * machine-readable form of the four answers for assistants that cite sources.
 */
export const advisoryFaq = (offers: OfferLike[]) => {
  const pairs = offers.filter((offer) => offer.data.question);

  if (pairs.length === 0) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pairs.map((offer) => ({
      "@type": "Question",
      name: offer.data.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: offer.data.answer ?? offer.data.summary,
      },
    })),
  };
};
