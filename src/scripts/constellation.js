/**
 * Hero "clean horizon": a scattered star field over a low ground plane.
 *
 * The field is a grid jittered hard enough to read as scattered stars while
 * keeping a trace of the underlying order, dialled well back in size and
 * brightness so the gradient headline is always the brightest thing in the
 * frame. Below it, a faint perspective grid recedes from a horizon that is
 * measured from the hero's own layout — it sits in the gap between the lead
 * paragraph and the button row, so it tracks the text at every breakpoint
 * instead of landing on a fixed fraction of the frame. A shooting star crosses
 * every few seconds, visible for a fraction of its period so it stays an event
 * rather than an effect. Static single render under reduced motion.
 */

// Colours.
const STAR_WHITE = [236, 240, 253];
const STAR_PERI = [165, 175, 251];
const GRID_PERI = [165, 175, 251];
const GLOW_VIOLET = [109, 92, 245];
const HORIZON_ICE = [174, 184, 244];

// Star field. FIELD_ALPHA is the brightness ceiling for the whole layer: the
// per-star alpha is a fraction of it, never above it.
const SPACING_DIVISOR = 24; // cell size relative to canvas width
const SPACING_MIN = 14;
const SPACING_MAX = 48;
const JITTER = 0.66; // cell-relative scatter; 0 is a lattice, 1 is a full cell
const SPARKLE_SHARE = 0.06; // fraction of stars that open into 4-point sparkles
const FIELD_ALPHA = 0.4;
const MARK_SCALE = 0.78;
const SHARPNESS = 3.6; // sparkle arm sharpness (circle → 4-point star)
const WAVE_SPEED = 0.24;
const WAVE_SCALE = 0.0055;

// Ground plane.
const GRID_ALPHA = 0.14;
const GRID_ROWS = 12;
const GRID_COLS = 11;
const GRID_SPEED = 0.04; // rows drifting toward the viewer
const GRID_FALLOFF = 2.4; // row spacing exponent; higher = faster acceleration
const HORIZON_ALPHA = 0.2;
// Used only when the hero's lead or button row cannot be measured.
const HORIZON_FALLBACK = 0.755;
// The canvas is taller than the hero (see .hero__canvas) so the scroll
// parallax never reveals an edge. This is the share of that overhang sitting
// above the hero's top edge, and it converts hero-local y into canvas-local y.
const CANVAS_OVERHANG_TOP = 0.2;

// Shooting star.
const SHOOT_PERIOD = 6.5; // seconds between streaks
const SHOOT_LIVE = 0.13; // share of the period the streak is on screen
const SHOOT_AMP = 0.46; // brightness, trail width and head size, all at once

// Pointer parallax. Deliberately tiny, and applied to the sky only: the ground
// plane is the frame's anchor, and a horizon that slides with the cursor reads
// as the scene tipping rather than the viewer moving. Per-star depth means the
// field shifts in layers instead of sliding as one sheet.
const POINTER_SHIFT_X = 18; // px of travel at the extremes of the viewport
const POINTER_SHIFT_Y = 12; // less vertical: it is the more noticeable axis
const POINTER_EASE = 0.06; // follow smoothing per frame

const PARALLAX = 0.18; // fraction of scroll the background lags behind by

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const wrap = (v, max) => ((v % max) + max) % max;
// Sign-preserving power, which drives the circle→sparkle morph.
const spow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
const lerp = (a, b, m) => a + (b - a) * m;
const mixColor = (c1, c2, m) =>
  `rgb(${Math.round(lerp(c1[0], c2[0], m))}, ${Math.round(
    lerp(c1[1], c2[1], m),
  )}, ${Math.round(lerp(c1[2], c2[2], m))})`;
const rgba = (c, a) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

// Deterministic PRNG, so a resize reseeds the field the same way every time
// and the layout never shuffles between renders of the same viewport.
const mulberry32 = (seed) => {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * The perspective ground plane: verticals converging on a vanishing point,
 * horizontals accelerating toward the viewer, an atmosphere gradient above the
 * horizon and the horizon itself. Module scope because the hero and the band
 * above the footer draw the same plane and must stay identical — the only
 * difference between them is where the horizon sits.
 */
const drawGroundPlane = (context, width, height, horizonY, time) => {
  const vanishX = width / 2;
  const depth = height - horizonY;

  context.save();
  context.beginPath();
  context.rect(0, horizonY, width, height - horizonY);
  context.clip();
  context.lineWidth = 1;

  // Verticals converging on the vanishing point.
  for (let i = -GRID_COLS; i <= GRID_COLS; i += 1) {
    if (i === 0) {
      continue;
    }
    const fade = 1 - Math.abs(i) / (GRID_COLS + 2);
    context.strokeStyle = rgba(GRID_PERI, GRID_ALPHA * fade);
    context.beginPath();
    context.moveTo(vanishX, horizonY);
    context.lineTo(vanishX + i * (width / (GRID_COLS * 0.55)), height * 1.2);
    context.stroke();
  }

  // Horizontals accelerating toward the viewer.
  const offset = wrap(time * GRID_SPEED, 1 / GRID_ROWS);
  for (let i = 0; i < GRID_ROWS; i += 1) {
    const u = Math.pow(i / GRID_ROWS + offset, GRID_FALLOFF);
    if (u > 1) {
      continue;
    }
    const y = horizonY + depth * u;
    context.strokeStyle = rgba(GRID_PERI, GRID_ALPHA * (0.22 + 0.9 * u));
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
  context.restore();

  // Atmosphere above the horizon, then the horizon itself.
  const glow = context.createLinearGradient(
    0,
    horizonY - height * 0.15,
    0,
    horizonY + height * 0.05,
  );
  glow.addColorStop(0, rgba(GLOW_VIOLET, 0));
  glow.addColorStop(0.74, rgba(GLOW_VIOLET, 0.1));
  glow.addColorStop(1, rgba(GRID_PERI, 0.04));
  context.fillStyle = glow;
  context.fillRect(0, horizonY - height * 0.15, width, height * 0.2);

  context.strokeStyle = rgba(HORIZON_ICE, HORIZON_ALPHA);
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, horizonY);
  context.lineTo(width, horizonY);
  context.stroke();
};


/**
 * Run `start`/`stop` in step with the canvas being on screen and the tab being
 * visible. Both fields use it, so neither burns frames on a plane nobody can
 * see — and since the hero has scrolled away by the time the footer band
 * arrives, only one of them is ever running.
 */
const observeCanvas = (canvas, start, stop) => {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
    } else {
      start();
    }
  });

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          start();
        } else {
          stop();
        }
      }
    },
    { threshold: 0 },
  );

  observer.observe(canvas);
};

export const initConstellation = (canvas, { animate = true } = {}) => {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const hero = canvas.closest(".hero");
  const lead = hero?.querySelector(".hero__lead");
  const actions = hero?.querySelector(".hero__actions");

  let width = 0;
  let height = 0;
  let dpr = 1;
  let field = [];
  let horizonY = 0;
  let rafId = 0;
  let running = false;
  let lastTime = 0;
  let elapsed = 0;

  // Eased pointer, in [-0.5, 0.5] from the viewport centre.
  let pointerX = 0;
  let pointerY = 0;
  let targetX = 0;
  let targetY = 0;

  /**
   * Offset of an element within the hero, walking the offsetParent chain.
   *
   * Deliberately not getBoundingClientRect: the lead and the button row both
   * carry `data-animate="fade-up"`, so GSAP holds a transform on them until
   * their reveal finishes, and a rect measured before then is displaced by the
   * animation. offsetTop is layout-only and ignores transforms, so it reports
   * the resting position even mid-reveal. It also sidesteps the canvas's own
   * parallax transform, which a rect-based measurement would have to subtract.
   */
  const offsetWithinHero = (element) => {
    let y = 0;
    let node = element;
    while (node && node !== hero) {
      y += node.offsetTop;
      node = node.offsetParent;
    }
    return y;
  };

  /**
   * Put the horizon in the gap between the lead paragraph and the buttons.
   * Clamped so an unexpected layout can never park it off-canvas or halfway up
   * the headline.
   */
  const measureHorizon = () => {
    if (!hero || !lead || !actions || !hero.offsetHeight) {
      horizonY = height * HORIZON_FALLBACK;
      return;
    }
    const leadBottom = offsetWithinHero(lead) + lead.offsetHeight;
    const actionsTop = offsetWithinHero(actions);
    if (actionsTop <= leadBottom) {
      horizonY = height * HORIZON_FALLBACK;
      return;
    }
    const heroLocal = (leadBottom + actionsTop) / 2;
    horizonY = clamp(
      heroLocal + hero.offsetHeight * CANVAS_OVERHANG_TOP,
      height * 0.45,
      height * 0.95,
    );
  };

  /**
   * Precompute the field on resize rather than reseeding per frame: only the
   * twinkle and the sparkle crest are time-dependent, so per-frame work stays
   * a transform and a fill.
   */
  const seedField = () => {
    const spacing = clamp(width / SPACING_DIVISOR, SPACING_MIN, SPACING_MAX);
    const random = mulberry32(91);
    field = [];

    for (let y = -spacing; y < height + spacing * 2; y += spacing) {
      for (let x = -spacing; x < width + spacing * 2; x += spacing) {
        const px = x + (random() - 0.5) * spacing * JITTER * 2;
        const py = y + (random() - 0.5) * spacing * JITTER * 2;
        const sparkle = random() < SPARKLE_SHARE;
        field.push({
          x: px,
          y: py,
          sparkle,
          radius: (0.62 + random() * 0.98) * MARK_SCALE * (sparkle ? 1.4 : 1),
          depth: 0.35 + random() * 0.65,
          tint: random() < 0.24 ? 1 : 0,
          phase: random() * Math.PI * 2,
        });
      }
    }
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    measureHorizon();
    seedField();
  };

  const applyParallax = () => {
    const offset = (window.scrollY || 0) * PARALLAX;
    canvas.style.transform = `translate3d(0, ${offset}px, 0)`;
  };

  // A circle at m = 0 morphing to a 4-point sparkle at m = 1.
  const traceMark = (cx, cy, radius, m) => {
    const segments = m > 0 ? 24 : 12;
    context.beginPath();
    for (let i = 0; i <= segments; i += 1) {
      const angle = (i / segments) * Math.PI * 2;
      const ct = Math.cos(angle);
      const st = Math.sin(angle);
      const x = cx + radius * ((1 - m) * ct + m * spow(ct, SHARPNESS));
      const y = cy + radius * ((1 - m) * st + m * spow(st, SHARPNESS));
      if (i === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.closePath();
  };

  const drawField = (time) => {
    for (const star of field) {
      const x = star.x + pointerX * POINTER_SHIFT_X * star.depth;
      const y = star.y + pointerY * POINTER_SHIFT_Y * star.depth;
      if (y > horizonY - 2) {
        continue;
      }
      const crest =
        0.5 +
        0.5 *
          Math.sin((star.x + star.y) * WAVE_SCALE + time * WAVE_SPEED + star.phase);
      const m = star.sparkle ? crest * crest : 0;
      context.globalAlpha = clamp(FIELD_ALPHA * (0.34 + 0.66 * crest), 0, 1);
      context.fillStyle = mixColor(STAR_WHITE, STAR_PERI, star.tint);
      traceMark(x, y, star.radius * (1 + m * 0.9), m);
      context.fill();
    }
    context.globalAlpha = 1;
  };

  /**
   * Deterministic from the clock, so a frozen frame and a live frame agree and
   * no state has to be carried between renders. Alpha follows a sine over the
   * streak's life, so it fades in and out rather than popping.
   */
  const drawShootingStar = (time) => {
    const phase = (time % SHOOT_PERIOD) / SHOOT_PERIOD;
    if (phase > SHOOT_LIVE) {
      return;
    }
    const u = phase / SHOOT_LIVE;
    const random = mulberry32(300 + Math.floor(time / SHOOT_PERIOD) * 7919);
    const startX = width * (0.06 + random() * 0.88);
    const startY = height * (0.02 + random() * 0.34);
    const direction = random() > 0.5 ? 1 : -1;
    const angle = 0.3 + random() * 0.42;
    const vx = direction * Math.cos(angle);
    const vy = Math.sin(angle);
    const travel = Math.min(width, height) * (0.42 + random() * 0.24);

    const driftX = pointerX * POINTER_SHIFT_X * 0.7;
    const driftY = pointerY * POINTER_SHIFT_Y * 0.7;
    const headX = startX + vx * travel * u + driftX;
    const headY = startY + vy * travel * u + driftY;
    if (headY > horizonY) {
      return;
    }
    const tail = Math.min(width, height) * 0.13 * Math.sin(u * Math.PI);
    const tailX = headX - vx * tail;
    const tailY = headY - vy * tail;
    const alpha = Math.sin(u * Math.PI) * 0.62 * SHOOT_AMP;

    const trail = context.createLinearGradient(tailX, tailY, headX, headY);
    trail.addColorStop(0, rgba(STAR_PERI, 0));
    trail.addColorStop(0.7, rgba(HORIZON_ICE, alpha * 0.4));
    trail.addColorStop(1, rgba(STAR_WHITE, alpha));
    context.strokeStyle = trail;
    context.lineWidth = 0.85 + 0.65 * SHOOT_AMP;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(tailX, tailY);
    context.lineTo(headX, headY);
    context.stroke();

    const headRadius = 3.5 + 3.5 * SHOOT_AMP;
    const head = context.createRadialGradient(
      headX,
      headY,
      0,
      headX,
      headY,
      headRadius,
    );
    head.addColorStop(0, rgba(STAR_WHITE, alpha * 0.95));
    head.addColorStop(1, rgba(GLOW_VIOLET, 0));
    context.fillStyle = head;
    context.beginPath();
    context.arc(headX, headY, headRadius, 0, Math.PI * 2);
    context.fill();
  };

  const renderScene = (time) => {
    context.clearRect(0, 0, width, height);
    drawField(time);
    drawShootingStar(time);
    drawGroundPlane(context, width, height, horizonY, time);
  };

  const tick = (now) => {
    if (!running) {
      return;
    }
    const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0.016;
    lastTime = now;
    elapsed += dt;
    pointerX += (targetX - pointerX) * POINTER_EASE;
    pointerY += (targetY - pointerY) * POINTER_EASE;
    renderScene(elapsed);
    applyParallax();
    rafId = window.requestAnimationFrame(tick);
  };

  const start = () => {
    if (!running && animate) {
      running = true;
      lastTime = 0;
      rafId = window.requestAnimationFrame(tick);
    }
  };

  const stop = () => {
    running = false;
    window.cancelAnimationFrame(rafId);
  };

  resize();
  renderScene(0);

  // The real faces change the lead's height, which moves the horizon.
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      measureHorizon();
      if (!running) {
        renderScene(elapsed);
      }
    });
  }

  if (!animate) {
    return;
  }

  applyParallax();

  window.addEventListener("pointermove", (event) => {
    targetX = event.clientX / window.innerWidth - 0.5;
    targetY = event.clientY / window.innerHeight - 0.5;
  });

  window.addEventListener("resize", () => {
    resize();
    if (!running) {
      renderScene(elapsed);
    }
  });

  observeCanvas(canvas, start, stop);
};

/**
 * Horizon band: the hero's ground plane again, in the strip above the footer,
 * behind the CTA card. Grid only — no star field and no shooting star, since
 * the strip is short and mostly covered by the card.
 */
const BAND_HORIZON = 0.16; // horizon as a fraction of the band's height
const FLIP_FADE = 0.86; // share of a flipped band spent fading out toward the top
// Flipped, the vanishing point belongs on the footer line itself rather than
// tucked up behind the card, so it gets its own horizon almost at the edge.
const FLIP_HORIZON = 0.02;

export const initHorizonBand = (canvas, { animate = true, flip = false } = {}) => {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  let width = 0;
  let height = 0;
  let rafId = 0;
  let running = false;
  let lastTime = 0;
  let elapsed = 0;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const render = (time) => {
    context.clearRect(0, 0, width, height);

    if (!flip) {
      drawGroundPlane(context, width, height, height * BAND_HORIZON, time);
      return;
    }

    // Mirrored: the vanishing point sits on the bottom edge and the plane
    // climbs the band.
    context.save();
    context.translate(0, height);
    context.scale(1, -1);
    drawGroundPlane(context, width, height, height * FLIP_HORIZON, time);
    context.restore();

    // The plane brightens away from its horizon, so mirroring puts the
    // brightest rows along the top edge — a hard bright line exactly where the
    // band should be dissolving. Erase upward instead of trying to invert the
    // ramp inside the shared renderer.
    const fade = context.createLinearGradient(0, 0, 0, height * FLIP_FADE);
    fade.addColorStop(0, "rgba(0, 0, 0, 1)");
    fade.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.save();
    context.globalCompositeOperation = "destination-out";
    context.fillStyle = fade;
    context.fillRect(0, 0, width, height * FLIP_FADE);
    context.restore();
  };

  const tick = (now) => {
    if (!running) {
      return;
    }
    const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0.016;
    lastTime = now;
    elapsed += dt;
    render(elapsed);
    rafId = window.requestAnimationFrame(tick);
  };

  const start = () => {
    if (!running && animate) {
      running = true;
      lastTime = 0;
      rafId = window.requestAnimationFrame(tick);
    }
  };

  const stop = () => {
    running = false;
    window.cancelAnimationFrame(rafId);
  };

  resize();
  render(0);

  if (!animate) {
    return;
  }

  window.addEventListener("resize", () => {
    resize();
    if (!running) {
      render(elapsed);
    }
  });

  observeCanvas(canvas, start, stop);
};
