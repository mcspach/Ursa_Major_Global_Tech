/**
 * Page-transition + intro orchestrator.
 *
 * First visit: the curtain covers the page (um-intro-boot set pre-paint),
 * the constellation draws in, then the curtain lifts.
 *
 * Internal navigation: the curtain drops over the outgoing page, a
 * sessionStorage flag tells the destination to boot covered (um-nav-boot),
 * and the curtain lifts once the new page has settled.
 */

const TRANSITION_CLASS = "is-transitioning";
const INITIAL_LOADING_CLASS = "is-initial-loading";
const INITIAL_LOADING_EXIT_CLASS = "is-initial-loading-exit";
const INTRO_BOOT_CLASS = "um-intro-boot";
const NAV_BOOT_CLASS = "um-nav-boot";
const SESSION_KEY_HAS_SEEN_INTRO = "um:hasSeenIntro";
const SESSION_KEY_NAV_COVER = "um:navCover";
const OVERLAY_REVEAL_EVENT = "um:overlay-reveal";

const FALLBACK_TIMINGS = {
  transitionDuration: 450,
  transitionOutDuration: 600,
  navHold: 450,
  navMaxWait: 1500,
  introMinHold: 1400,
  introMaxWait: 2600,
};

let navigationInProgress = false;
let bootSequenceActive = false;

const delay = (ms) =>
  new Promise((resolve) => window.setTimeout(resolve, Math.max(0, ms)));

const parseCssTimeToMs = (value, fallback) => {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  const asNumber = Number.parseFloat(normalized);
  if (Number.isNaN(asNumber)) {
    return fallback;
  }

  if (normalized.endsWith("ms")) {
    return asNumber;
  }

  if (normalized.endsWith("s")) {
    return asNumber * 1000;
  }

  return asNumber;
};

const getTimingMs = (cssVariable, fallback) => {
  const styles = window.getComputedStyle(document.documentElement);
  return parseCssTimeToMs(styles.getPropertyValue(cssVariable), fallback);
};

const getTimings = () => ({
  transitionDuration: getTimingMs(
    "--page-transition-duration",
    FALLBACK_TIMINGS.transitionDuration,
  ),
  transitionOutDuration: getTimingMs(
    "--page-transition-out-duration",
    FALLBACK_TIMINGS.transitionOutDuration,
  ),
  navHold: getTimingMs("--page-nav-hold", FALLBACK_TIMINGS.navHold),
  navMaxWait: getTimingMs("--page-nav-max-wait", FALLBACK_TIMINGS.navMaxWait),
  introMinHold: getTimingMs(
    "--page-intro-min-hold",
    FALLBACK_TIMINGS.introMinHold,
  ),
  introMaxWait: getTimingMs(
    "--page-intro-max-wait",
    FALLBACK_TIMINGS.introMaxWait,
  ),
});

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

const waitForPageLoad = () => {
  if (document.readyState === "complete") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    window.addEventListener("load", resolve, { once: true });
  });
};

const waitForFontsReady = () => {
  if (!("fonts" in document) || typeof document.fonts.ready === "undefined") {
    return Promise.resolve();
  }

  return document.fonts.ready.catch(() => undefined);
};

const waitForTransitionEnd = (element, maxWaitMs, propertyName) => {
  if (!(element instanceof HTMLElement)) {
    return delay(maxWaitMs);
  }

  return new Promise((resolve) => {
    let resolved = false;

    const done = () => {
      if (resolved) {
        return;
      }

      resolved = true;
      element.removeEventListener("transitionend", onEnd);
      resolve();
    };

    const onEnd = (event) => {
      if (event.target !== element) {
        return;
      }

      if (propertyName && event.propertyName !== propertyName) {
        return;
      }

      done();
    };

    element.addEventListener("transitionend", onEnd);
    window.setTimeout(done, Math.max(0, maxWaitMs));
  });
};

const nextFrames = () =>
  new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve);
    });
  });

// Lets motion.js hold hero reveals until the curtain lifts. The flag covers
// the case where the reveal fires before motion.js subscribes.
const announceOverlayReveal = () => {
  window.__umOverlayRevealed = true;
  document.dispatchEvent(new CustomEvent(OVERLAY_REVEAL_EVENT));
};

const shouldRunInitialIntro = () => {
  try {
    if (sessionStorage.getItem(SESSION_KEY_HAS_SEEN_INTRO) === "true") {
      return false;
    }

    sessionStorage.setItem(SESSION_KEY_HAS_SEEN_INTRO, "true");
    return true;
  } catch {
    return true;
  }
};

const clearIntroClasses = () => {
  document.documentElement.classList.remove(INTRO_BOOT_CLASS);
  document.documentElement.classList.remove(NAV_BOOT_CLASS);
  document.body.classList.remove(INITIAL_LOADING_EXIT_CLASS);
  document.body.classList.remove(INITIAL_LOADING_CLASS);
};

const runInitialIntro = async () => {
  if (!shouldRunInitialIntro() || prefersReducedMotion()) {
    clearIntroClasses();
    announceOverlayReveal();
    return;
  }

  bootSequenceActive = true;

  try {
    const timings = getTimings();
    const overlay = document.querySelector("[data-site-transition]");

    document.body.classList.add(INITIAL_LOADING_CLASS);

    await Promise.race([
      Promise.all([
        delay(timings.introMinHold),
        waitForPageLoad(),
        waitForFontsReady(),
      ]),
      delay(timings.introMaxWait),
    ]);

    if (navigationInProgress) {
      return;
    }

    document.body.classList.add(INITIAL_LOADING_EXIT_CLASS);
    announceOverlayReveal();
    await waitForTransitionEnd(
      overlay,
      timings.transitionOutDuration + 120,
      "transform",
    );

    if (navigationInProgress) {
      return;
    }

    clearIntroClasses();
  } finally {
    bootSequenceActive = false;
  }
};

// Arrival half of a navigation: the page booted covered by the curtain
// (um-nav-boot was added pre-paint), so lift it up and out.
const runNavReveal = async () => {
  try {
    sessionStorage.removeItem(SESSION_KEY_NAV_COVER);
  } catch {
    // Ignore storage failures; the reveal still runs.
  }

  if (prefersReducedMotion()) {
    clearIntroClasses();
    announceOverlayReveal();
    return;
  }

  bootSequenceActive = true;

  try {
    const timings = getTimings();
    const overlay = document.querySelector("[data-site-transition]");

    document.body.classList.add(INITIAL_LOADING_CLASS);

    // Hold the cover long enough to register, and give the page
    // frames/fonts to settle underneath it.
    await Promise.race([
      Promise.all([delay(timings.navHold), nextFrames(), waitForFontsReady()]),
      delay(timings.navMaxWait),
    ]);

    if (navigationInProgress) {
      return;
    }

    document.body.classList.add(INITIAL_LOADING_EXIT_CLASS);
    announceOverlayReveal();
    await waitForTransitionEnd(
      overlay,
      timings.transitionOutDuration + 120,
      "transform",
    );

    if (navigationInProgress) {
      return;
    }

    clearIntroClasses();
  } finally {
    bootSequenceActive = false;
  }
};

const isModifiedClick = (event) =>
  event.metaKey ||
  event.ctrlKey ||
  event.shiftKey ||
  event.altKey ||
  event.button !== 0;

const isSamePageHashLink = (url) => {
  if (!url.hash) {
    return false;
  }

  return (
    url.pathname === window.location.pathname &&
    url.search === window.location.search
  );
};

const isInternalLink = (url) => url.origin === window.location.origin;

const shouldIgnoreLink = (anchor, event) => {
  if (!(anchor instanceof HTMLAnchorElement)) {
    return true;
  }

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) {
    return true;
  }

  if (
    anchor.hasAttribute("download") ||
    anchor.target === "_blank" ||
    anchor.dataset.noTransition === "true"
  ) {
    return true;
  }

  if (isModifiedClick(event)) {
    return true;
  }

  const url = new URL(anchor.href, window.location.href);

  if (!isInternalLink(url)) {
    return true;
  }

  if (isSamePageHashLink(url)) {
    return true;
  }

  if (url.protocol === "mailto:" || url.protocol === "tel:") {
    return true;
  }

  if (url.href === window.location.href) {
    return true;
  }

  return false;
};

const startPageTransition = (href) => {
  if (navigationInProgress) {
    return;
  }

  navigationInProgress = true;

  if (prefersReducedMotion()) {
    window.location.assign(href);
    return;
  }

  // Tell the destination page to boot covered so the curtain can lift there.
  try {
    sessionStorage.setItem(SESSION_KEY_NAV_COVER, "true");
  } catch {
    // Without storage the destination simply loads uncovered.
  }

  document.body.classList.add(TRANSITION_CLASS);
  clearIntroClasses();

  const { transitionDuration } = getTimings();
  const overlay = document.querySelector("[data-site-transition]");

  waitForTransitionEnd(overlay, transitionDuration + 120, "transform").then(
    () => {
      window.location.assign(href);
    },
  );
};

const onDocumentClick = (event) => {
  const anchor =
    event.target instanceof Element ? event.target.closest("a[href]") : null;

  if (!anchor || shouldIgnoreLink(anchor, event)) {
    return;
  }

  event.preventDefault();
  startPageTransition(anchor.href);
};

const clearTransitionState = (force) => {
  // Don't wipe the overlay classes out from under a running intro/reveal.
  if (bootSequenceActive && !force) {
    return;
  }

  navigationInProgress = false;
  document.body.classList.remove(TRANSITION_CLASS);
  clearIntroClasses();
};

document.addEventListener("click", onDocumentClick);

window.addEventListener("pageshow", (event) => {
  clearTransitionState(event.persisted);
});

window.addEventListener(
  "load",
  () => {
    if (navigationInProgress) {
      return;
    }

    clearTransitionState(false);
  },
  { once: true },
);

const bootSequence = document.documentElement.classList.contains(NAV_BOOT_CLASS)
  ? runNavReveal()
  : runInitialIntro();

bootSequence.catch(() => {
  clearIntroClasses();
  announceOverlayReveal();
});
