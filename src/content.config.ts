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
    deliverables: z.array(z.string()).default([]),
    process: z
      .array(z.object({ step: z.string(), detail: z.string() }))
      .default([]),
    forWho: z.string().optional(),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    pubDate: z.coerce.date(),
    readTime: z.string().default("5 min read"),
  }),
});

export const collections = { products, services, blog };
