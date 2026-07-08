import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DIST_DIR = path.resolve("dist");
const HTML_EXT = ".html";
const CSS_EXT = ".css";
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

const getCssFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await getCssFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(CSS_EXT)) {
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

const relativizeCss = (css, prefix) =>
  css.replace(/url\((['"]?)(\/[^)'"\s]+)\1\)/g, (match, quote, value) => {
    const rewrittenValue = rewriteUrl(value, prefix);

    return `url(${quote}${rewrittenValue}${quote})`;
  });

const main = async () => {
  const htmlFiles = await getHtmlFiles(DIST_DIR);
  const cssFiles = await getCssFiles(DIST_DIR);

  await Promise.all(
    htmlFiles.map(async (filePath) => {
      const prefix = getRelativePrefix(filePath);
      const originalHtml = await readFile(filePath, "utf8");
      // Rewrite URL attributes, then any url(/…) inside inline <style> blocks
      // or style attributes (Astro inlines small component styles).
      const rewrittenHtml = relativizeCss(relativizeHtml(originalHtml, prefix), prefix);

      if (rewrittenHtml !== originalHtml) {
        await writeFile(filePath, rewrittenHtml);
      }
    }),
  );

  await Promise.all(
    cssFiles.map(async (filePath) => {
      const prefix = getRelativePrefix(filePath);
      const originalCss = await readFile(filePath, "utf8");
      const rewrittenCss = relativizeCss(originalCss, prefix);

      if (rewrittenCss !== originalCss) {
        await writeFile(filePath, rewrittenCss);
      }
    }),
  );
};

await main();
