/**
 * Motion core: Lenis smooth scroll synced to GSAP ScrollTrigger, plus the
 * shared animation primitives used across every page:
 *
 *   [data-animate="fade-up" | "fade"]   single-element scroll reveal
 *   [data-animate-delay="0.15"]         optional stagger offset (seconds)
 *   [data-animate-children]             staggered reveal of direct children
 *   [data-split="lines"]                masked line-by-line headline reveal
 *   [data-marquee]                      infinite marquee (slows on hover)
 *   [data-counter data-target="24"]     count-up stat on enter
 *   [data-parallax data-parallax-speed] scrubbed parallax drift
 *
 * Everything here is progressive enhancement: without JS (or with reduced
 * motion) the html.um-js class is absent and all content is fully visible.
 */

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import SplitType from "split-type";
import { initConstellation } from "./constellation.js";

const prefersReducedMotion =
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

const overlayRevealed = () => window.__umOverlayRevealed === true;

const onOverlayReveal = (callback) => {
  if (overlayRevealed()) {
    callback();
    return;
  }

  document.addEventListener("um:overlay-reveal", callback, { once: true });
};

const initLenis = () => {
  const lenis = new Lenis({
    lerp: 0.11,
    smoothWheel: true,
  });

  lenis.on("scroll", ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);

  // Route same-page anchor clicks through Lenis for a smooth glide.
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      const id = anchor.getAttribute("href");
      const target = id && id.length > 1 ? document.querySelector(id) : null;

      if (target) {
        event.preventDefault();
        lenis.scrollTo(target, { offset: -80 });
      }
    });
  });

  return lenis;
};

/* ------------------------------------------------------------------
   Scroll reveals
   ------------------------------------------------------------------ */
const initReveals = () => {
  document.querySelectorAll("[data-animate]").forEach((element) => {
    const type = element.dataset.animate;
    const delaySeconds = Number.parseFloat(element.dataset.animateDelay || "0");

    gsap.fromTo(
      element,
      {
        opacity: 0,
        y: type === "fade-up" ? 40 : 0,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.9,
        delay: delaySeconds,
        ease: "power3.out",
        scrollTrigger: {
          trigger: element,
          start: "top 88%",
          once: true,
        },
      },
    );
  });

  document.querySelectorAll("[data-animate-children]").forEach((parent) => {
    gsap.fromTo(
      parent.children,
      { opacity: 0, y: 32 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.09,
        ease: "power3.out",
        scrollTrigger: {
          trigger: parent,
          start: "top 86%",
          once: true,
        },
      },
    );
  });
};

/* ------------------------------------------------------------------
   Masked line reveals for display headlines
   ------------------------------------------------------------------ */
const initSplitHeadlines = () => {
  document.querySelectorAll('[data-split="lines"]').forEach((element) => {
    const split = new SplitType(element, {
      types: "lines",
      tagName: "span",
    });

    if (!split.lines || split.lines.length === 0) {
      gsap.set(element, { opacity: 1 });
      return;
    }

    // Wrap each line in an overflow-hidden mask so lines rise into view.
    split.lines.forEach((line) => {
      const mask = document.createElement("span");
      mask.className = "line-mask";
      mask.style.display = "block";
      mask.style.overflow = "hidden";
      line.parentNode?.insertBefore(mask, line);
      mask.appendChild(line);
    });

    // Lets CSS hand effects like gradient text off from the element to its
    // lines, because Chrome paints a static ghost if a background-clip: text parent
    // keeps its background while the lines transform underneath it.
    element.classList.add("is-split");

    gsap.set(element, { opacity: 1 });
    gsap.set(split.lines, { yPercent: 115 });

    const play = () => {
      gsap.to(split.lines, {
        yPercent: 0,
        duration: 1.1,
        stagger: 0.09,
        ease: "power4.out",
        delay: Number.parseFloat(element.dataset.splitDelay || "0"),
      });
    };

    if (element.dataset.splitOnScroll === "true") {
      ScrollTrigger.create({
        trigger: element,
        start: "top 88%",
        once: true,
        onEnter: play,
      });
    } else {
      onOverlayReveal(play);
    }
  });
};

/* ------------------------------------------------------------------
   Marquee
   ------------------------------------------------------------------ */
const initMarquees = () => {
  document.querySelectorAll("[data-marquee]").forEach((marquee) => {
    const track = marquee.querySelector("[data-marquee-track]");
    if (!track) {
      return;
    }

    const duration = Number.parseFloat(marquee.dataset.marqueeDuration || "28");

    const tween = gsap.to(track, {
      xPercent: -50,
      duration,
      ease: "none",
      repeat: -1,
    });

    marquee.addEventListener("mouseenter", () => {
      gsap.to(tween, { timeScale: 0.25, duration: 0.6 });
    });

    marquee.addEventListener("mouseleave", () => {
      gsap.to(tween, { timeScale: 1, duration: 0.6 });
    });
  });
};

/* ------------------------------------------------------------------
   Stat counters
   ------------------------------------------------------------------ */
const initCounters = () => {
  document.querySelectorAll("[data-counter]").forEach((element) => {
    const target = Number.parseFloat(element.dataset.target || "0");
    const decimals = Number.parseInt(element.dataset.decimals || "0", 10);
    const state = { value: 0 };

    ScrollTrigger.create({
      trigger: element,
      start: "top 90%",
      once: true,
      onEnter: () => {
        gsap.to(state, {
          value: target,
          duration: 1.6,
          ease: "power2.out",
          onUpdate: () => {
            element.textContent = state.value.toFixed(decimals);
          },
        });
      },
    });
  });
};

/* ------------------------------------------------------------------
   Parallax drift
   ------------------------------------------------------------------ */
const initParallax = () => {
  document.querySelectorAll("[data-parallax]").forEach((element) => {
    const speed = Number.parseFloat(element.dataset.parallaxSpeed || "0.15");

    gsap.to(element, {
      yPercent: speed * -100,
      ease: "none",
      scrollTrigger: {
        trigger: element.parentElement ?? element,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });
  });
};

/* ------------------------------------------------------------------
   Boot
   ------------------------------------------------------------------ */
const boot = () => {
  const constellationCanvas = document.querySelector("[data-constellation]");
  if (constellationCanvas instanceof HTMLCanvasElement) {
    initConstellation(constellationCanvas, { animate: !prefersReducedMotion });
  }

  if (prefersReducedMotion) {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  initLenis();

  // Fonts change line metrics; split headlines only after they settle.
  const fontsReady =
    "fonts" in document ? document.fonts.ready.catch(() => undefined) : Promise.resolve();

  fontsReady.then(() => {
    initSplitHeadlines();
    ScrollTrigger.refresh();
  });

  initReveals();
  initMarquees();
  initCounters();
  initParallax();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
