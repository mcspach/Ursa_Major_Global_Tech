const EXTERNAL_URL_PATTERN = /^(?:[a-z]+:)?\/\//i;

const normalizeBase = (baseUrl: string) => {
  if (!baseUrl || baseUrl === "/") {
    return "";
  }

  const trimmed = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

const BASE_PATH = normalizeBase(import.meta.env.BASE_URL || "/");

export const withBase = (path = "/") => {
  if (!path) {
    return BASE_PATH || "/";
  }

  if (
    EXTERNAL_URL_PATTERN.test(path) ||
    path.startsWith("mailto:") ||
    path.startsWith("tel:") ||
    path.startsWith("#")
  ) {
    return path;
  }

  if (BASE_PATH && (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`))) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${normalizedPath}` || normalizedPath;
};

export const toAbsoluteUrl = (path: string, site: URL | string) =>
  new URL(withBase(path), site).toString();
