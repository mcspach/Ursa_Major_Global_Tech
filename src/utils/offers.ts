import { getCollection } from "astro:content";

/**
 * The advisory ladder in step order.
 *
 * Four surfaces render this same list: the homepage Ascent section, the
 * /advisory/ ladder, the Decision Desk, and the OfferCatalog structured data.
 * so the filter lives here rather than being retyped in each one. Anything
 * draft or unlisted is excluded: draft builds no page at all, unlisted keeps
 * its page but drops out of indexes.
 */
export const getAdvisorySteps = async () =>
  (await getCollection("offers"))
    .filter(
      (offer) =>
        offer.data.family === "advisory" &&
        !offer.data.draft &&
        !offer.data.unlisted,
    )
    .sort((a, b) => (a.data.step ?? 99) - (b.data.step ?? 99));
