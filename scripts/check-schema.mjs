/**
 * Structured-data checks, run against `dist/` after the build.
 *
 * The rule schema.ts states in prose is enforced here: the structured data may
 * only say what the page says. The gated-price check is the one that actually
 * protects us. A `priceGate`d offer renders "Pricing on request" to a visitor,
 * so if its real figure ever reaches a graph, a crawler reads a number the
 * reader can't see. That is a silent failure in a normal build, so it fails
 * this one instead.
 *
 * Also checked: every graph parses, every node has a type, every internal
 * `@id` reference resolves, and no page is missing its baseline nodes.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const DIST_DIR = path.resolve("dist");
const CONTENT_DIR = path.resolve("src/content");
const LD_PATTERN =
  /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;

const findFiles = async (dir, ext) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findFiles(fullPath, ext)));
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      files.push(fullPath);
    }
  }

  return files;
};

/**
 * Every price held back by a `priceGate`, read straight from the content files
 * rather than from a list kept in sync by hand.
 */
const gatedPrices = async () => {
  const files = await findFiles(path.join(CONTENT_DIR, "offers"), ".md");
  const prices = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    const frontmatter = source.split("---")[1] ?? "";

    if (!/^priceGate:\s*true\s*$/m.test(frontmatter)) {
      continue;
    }

    const amount = frontmatter.match(/^\s+amount:\s*(\d+)\s*$/m);

    if (amount) {
      prices.push({ file: path.basename(file), amount: Number(amount[1]) });
    }
  }

  return prices;
};

/** Walks a node tree, yielding every object in it. */
const walk = (value, visit) => {
  if (Array.isArray(value)) {
    value.forEach((item) => walk(item, visit));
    return;
  }

  if (value && typeof value === "object") {
    visit(value);
    Object.values(value).forEach((item) => walk(item, visit));
  }
};

const main = async () => {
  const htmlFiles = await findFiles(DIST_DIR, ".html");
  const gated = await gatedPrices();
  const errors = [];
  let pagesWithSchema = 0;
  let nodeCount = 0;

  for (const file of htmlFiles) {
    const relativePath = path.relative(DIST_DIR, file);
    const html = await readFile(file, "utf8");
    const blocks = [...html.matchAll(LD_PATTERN)].map((match) => match[1]);

    if (blocks.length === 0) {
      // A noindex page carries no graph on purpose.
      if (!/<meta name="robots" content="noindex/.test(html)) {
        errors.push(`${relativePath}: indexable page has no structured data`);
      }
      continue;
    }

    pagesWithSchema += 1;

    for (const block of blocks) {
      let parsed;

      try {
        parsed = JSON.parse(block);
      } catch (error) {
        errors.push(`${relativePath}: JSON-LD does not parse (${error.message})`);
        continue;
      }

      const graph = parsed["@graph"] ?? [parsed];
      const declaredIds = new Set();
      const referencedIds = new Set();
      const types = new Set();

      if (!parsed["@context"]) {
        errors.push(`${relativePath}: graph is missing @context`);
      }

      graph.forEach((node) => {
        nodeCount += 1;

        if (!node["@type"]) {
          errors.push(`${relativePath}: a top-level node has no @type`);
        } else {
          types.add(node["@type"]);
        }

        if (node["@id"]) {
          if (declaredIds.has(node["@id"])) {
            errors.push(`${relativePath}: duplicate @id ${node["@id"]}`);
          }
          declaredIds.add(node["@id"]);
        }
      });

      // A bare {"@id": …} object is a reference to a node defined elsewhere.
      walk(graph, (node) => {
        const keys = Object.keys(node);

        if (keys.length === 1 && keys[0] === "@id") {
          referencedIds.add(node["@id"]);
        }
      });

      referencedIds.forEach((id) => {
        if (!declaredIds.has(id)) {
          errors.push(`${relativePath}: @id reference ${id} resolves to nothing`);
        }
      });

      for (const required of ["Organization", "WebSite"]) {
        if (!types.has(required)) {
          errors.push(`${relativePath}: graph is missing its ${required} node`);
        }
      }

      // The one that matters: a withheld figure must not be readable here.
      for (const { file: source, amount } of gated) {
        const serialized = JSON.stringify(graph);

        if (
          serialized.includes(`"price":${amount}`) ||
          serialized.includes(`"minPrice":${amount}`)
        ) {
          errors.push(
            `${relativePath}: gated price ${amount} from ${source} appears in structured data`,
          );
        }
      }

      // Absolute URLs only. relativize-dist.mjs rewrites attributes, not
      // script bodies, so a root-relative path here would ship broken.
      walk(graph, (node) => {
        for (const key of ["url", "@id", "item"]) {
          const value = node[key];

          if (typeof value === "string" && value.startsWith("/")) {
            errors.push(`${relativePath}: ${key} "${value}" is not absolute`);
          }
        }
      });
    }
  }

  if (errors.length > 0) {
    console.error(`\nStructured data check failed (${errors.length}):\n`);
    errors.forEach((error) => console.error(`  ${error}`));
    console.error("");
    process.exit(1);
  }

  const gatedNote = gated.length
    ? `, ${gated.length} gated price${gated.length === 1 ? "" : "s"} withheld`
    : "";

  console.log(
    `[schema] ${nodeCount} nodes across ${pagesWithSchema} pages${gatedNote}`,
  );
};

await main();
