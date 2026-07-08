import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

const site = process.env.SITE_URL || "https://www.ursamajorglobaltech.com";

export default defineConfig({
  site,
  output: "static",
  integrations: [mdx(), sitemap()],
});
