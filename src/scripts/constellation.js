/**
 * Hero "sparkle field": a warped grid of dots over a drifting starfield.
 *
 * A full-bleed grid of purple dots rides a shallow dome: dots near the centre
 * bulge toward the viewer while the edges fall away, and slow diagonal waves
 * ripple through the field in depth, morphing each dot from a circle into a
 * four-point sparkle at the crest. Behind it, a randomised starfield twinkles
 * and drifts to seat the grid in space. The pointer parallaxes both layers, with
 * nearer dots tracking the cursor more than far ones, and the whole field also
 * scrolls up a touch slower than the hero content. Static single render under
 * reduced motion.
 */

// Colours.
const COL_NEAR = [188, 196, 255]; // grid gradient, left edge (periwinkle)
const COL_FAR = [96, 80, 220]; // grid gradient, right edge (violet)
const STAR_WHITE = [236, 240, 253];
const STAR_PERI = [165, 175, 251];

// Grid + wave.
const SPACING = 46; // px between grid dots
const DOT_SIZE = 2.0; // base dot radius in px
const SHARPNESS = 3.6; // sparkle arm sharpness (circle → 4-point star)
const WAVE_SPEED = 0.3; // wave advance, radians/sec-ish
const WAVE_SCALE = 0.006; // spatial frequency of the waves
const WAVE_DEPTH = 0.45; // how far crests ripple toward the viewer (0–1)

// 3D warp / projection.
const WARP = 0.55; // dome bulge amount (0–1)
const FOCAL = 720; // camera focal length
const WARP_MAX = 270; // max dome depth in world units at WARP = 1
const WAVE_MAX = 150; // max wave depth in world units at WAVE_DEPTH = 1
const Z_CAP = FOCAL - 120; // clamp so projection never blows up

// Starfield.
const SCATTER_AREA = 13000; // one scatter star per this many px²
const SCATTER_SPREAD = 1.5; // world extent relative to the viewport

// Pointer + scroll parallax.
const POINTER_PARALLAX = 0.6; // strength of the mouse-driven depth
const POINTER_EASE = 0.05; // pointer follow smoothing per frame
const PAR_K = 60; // pointer offset scale in px
const DOME_FOLLOW = 0.18; // how far the dome peak drifts toward the cursor
const PARALLAX = 0.18; // fraction of scroll the background lags behind by

// Shared brightness ceiling for both layers (accessibility cap).
const BRIGHTNESS = 0.78;

const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, m) => a + (b - a) * m;
const wrap = (v, max) => ((v % max) + max) % max;
// Sign-preserving power, which drives the circle→sparkle morph.
const spow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
const mixColor = (c1, c2, m) =>
  `rgb(${Math.round(lerp(c1[0], c2[0], m))}, ${Math.round(
    lerp(c1[1], c2[1], m),
  )}, ${Math.round(lerp(c1[2], c2[2], m))})`;

export const initConstellation = (canvas, { animate = true } = {}) => {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  let width = 0;
  let height = 0;
  let dpr = 1;
  let scatter = [];
  let rafId = 0;
  let running = false;
  let lastTime = 0;
  let elapsed = 0;

  // Eased pointer, in [-0.5, 0.5] from the viewport centre.
  let pointerX = 0;
  let pointerY = 0;
  let targetX = 0;
  let targetY = 0;

  const seedScatter = () => {
    const count = Math.round((width * height) / SCATTER_AREA);
    const rx = width * SCATTER_SPREAD;
    const ry = height * SCATTER_SPREAD;
    scatter = Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * rx,
      y: (Math.random() - 0.5) * ry,
      z: rand(-190, 40),
      r: rand(0.5, 1.9),
      a: rand(0.1, 0.42),
      tint: Math.random(),
      phase: Math.random() * Math.PI * 2,
      twinkle: rand(0.4, 1.3),
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() * 0.4 + 0.1) * 4,
    }));
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const applyParallax = () => {
    const offset = (window.scrollY || 0) * PARALLAX;
    canvas.style.transform = `translate3d(0, ${offset}px, 0)`;
  };

  // Project a world point (X, Y, Z) to the screen. Nearer points (higher Z)
  // scale up and take a larger share of the pointer parallax.
  const project = (x, y, z) => {
    const zc = z > Z_CAP ? Z_CAP : z;
    const s = FOCAL / (FOCAL - zc);
    return {
      sx: width / 2 + x * s + pointerX * POINTER_PARALLAX * s * PAR_K,
      sy: height / 2 + y * s + pointerY * POINTER_PARALLAX * s * PAR_K,
      s,
    };
  };

  // Trace one dot: a circle at m = 0 morphing to a 4-point sparkle at m = 1.
  const traceDot = (cx, cy, radius, m) => {
    const segments = 32;
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

  const renderScene = (time) => {
    context.clearRect(0, 0, width, height);

    // Starfield behind the grid.
    const rx = width * SCATTER_SPREAD;
    const ry = height * SCATTER_SPREAD;
    for (const star of scatter) {
      const wx = wrap(star.x + star.vx * time + rx / 2, rx) - rx / 2;
      const wy = wrap(star.y + star.vy * time + ry / 2, ry) - ry / 2;
      const { sx, sy, s } = project(wx, wy, star.z);
      if (sx < -30 || sx > width + 30 || sy < -30 || sy > height + 30) {
        continue;
      }
      const twinkle = 0.6 + 0.4 * Math.sin(time * star.twinkle + star.phase);
      context.globalAlpha = clamp(
        star.a * twinkle * BRIGHTNESS * clamp(s * 0.8, 0.35, 1.3),
        0,
        1,
      );
      context.fillStyle = mixColor(STAR_WHITE, STAR_PERI, star.tint * 0.7);
      context.beginPath();
      context.arc(sx, sy, Math.max(0.3, star.r * s), 0, Math.PI * 2);
      context.fill();
    }

    // Warped sparkle grid in front.
    const cols = Math.ceil(width / SPACING);
    const rows = Math.ceil(height / SPACING);
    const margin = 3;
    const maxR = Math.hypot(width / 2, height / 2);
    const domeCx = pointerX * width * DOME_FOLLOW;
    const domeCy = pointerY * height * DOME_FOLLOW;

    for (let gx = -margin; gx <= cols + margin; gx += 1) {
      const worldX = gx * SPACING - width / 2;
      const nx = clamp(worldX / width + 0.5, 0, 1);
      const color = mixColor(COL_NEAR, COL_FAR, nx);
      for (let gy = -margin; gy <= rows + margin; gy += 1) {
        const worldY = gy * SPACING - height / 2;

        const nR = Math.hypot(worldX - domeCx, worldY - domeCy) / maxR;
        const zDome = WARP * WARP_MAX * (1 - nR * nR);

        const phase = (worldX * 0.9 + worldY * 1.5) * WAVE_SCALE;
        const w =
          Math.sin(time * WAVE_SPEED - phase) * 0.55 +
          Math.sin(time * WAVE_SPEED * 0.48 - phase * 0.6) * 0.45;
        let m = Math.max(0, w);
        m *= m; // mostly dots; sparkle on the crest

        const z = zDome + w * WAVE_DEPTH * WAVE_MAX;
        const { sx, sy, s } = project(worldX, worldY, z);
        if (sx < -40 || sx > width + 40 || sy < -40 || sy > height + 40) {
          continue;
        }

        const radius = DOT_SIZE * (1 + m * 0.7) * s;
        const nearBoost = clamp(0.5 + (s - 1) * 0.5, 0.35, 1.25);
        context.fillStyle = color;

        // Soft bloom on the crest so sparkles glow rather than just pop.
        if (m > 0.35) {
          context.globalAlpha = clamp((m - 0.35) * 0.5 * BRIGHTNESS, 0, 1);
          traceDot(sx, sy, radius * 2.1, m);
          context.fill();
        }

        context.globalAlpha = clamp(
          (0.26 + m * 0.5) * BRIGHTNESS * nearBoost,
          0,
          1,
        );
        traceDot(sx, sy, radius, m);
        context.fill();
      }
    }

    context.globalAlpha = 1;
  };

  // Fixed-phase, pointer-centred frame for initial paint and reduced motion.
  const drawStatic = () => {
    const px = pointerX;
    const py = pointerY;
    pointerX = 0;
    pointerY = 0;
    renderScene(0);
    pointerX = px;
    pointerY = py;
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
  seedScatter();
  drawStatic();

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
    seedScatter();
    if (!running) {
      drawStatic();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
    } else {
      start();
    }
  });

  // Only animate while the canvas is on screen.
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
