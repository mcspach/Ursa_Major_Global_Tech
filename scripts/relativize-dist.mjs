import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DIST_DIR = path.resolve("dist");
const HTML_EXT = ".html";
const URL_ATTRIBUTES = new Set(["href", "src", "poster", "content", "srcset"]);

const toPosixPath = (value) => value.split(path.sep).join("/");

const getHtmlFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await getHtmlFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(HTML_EXT)) {
      files.push(fullPath);
    }
  }

  return files;
};

const getRelativePrefix = (filePath) => {
  const fileDir = path.dirname(filePath);
  const relativeToRoot = path.relative(fileDir, DIST_DIR);

  if (!relativeToRoot) {
    return "./";
  }

  return `${toPosixPath(relativeToRoot)}/`;
};

const rewriteUrl = (value, prefix) => {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return value;
  }

  return `${prefix}${value.slice(1)}`;
};

const rewriteSrcset = (value, prefix) =>
  value
    .split(",")
    .map((entry) => {
      const trimmed = entry.trim();

      if (!trimmed) {
        return trimmed;
      }

      const [url, ...descriptorParts] = trimmed.split(/\s+/);
      const descriptor = descriptorParts.join(" ");
      const rewrittenUrl = rewriteUrl(url, prefix);

      return descriptor ? `${rewrittenUrl} ${descriptor}` : rewrittenUrl;
    })
    .join(", ");

const relativizeHtml = (html, prefix) =>
  html.replace(/\b(href|src|poster|content|srcset)=(["'])(.*?)\2/g, (match, attr, quote, value) => {
    if (!URL_ATTRIBUTES.has(attr)) {
      return match;
    }

    const rewrittenValue =
      attr === "srcset" ? rewriteSrcset(value, prefix) : rewriteUrl(value, prefix);

    return `${attr}=${quote}${rewrittenValue}${quote}`;
  });

const main = async () => {
  const htmlFiles = await getHtmlFiles(DIST_DIR);

  await Promise.all(
    htmlFiles.map(async (filePath) => {
      const prefix = getRelativePrefix(filePath);
      const originalHtml = await readFile(filePath, "utf8");
      const rewrittenHtml = relativizeHtml(originalHtml, prefix);

      if (rewrittenHtml !== originalHtml) {
        await writeFile(filePath, rewrittenHtml);
      }
    }),
  );
};

await main();
