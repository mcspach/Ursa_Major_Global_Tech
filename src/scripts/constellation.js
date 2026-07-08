/**
 * Hero star-field with the Ursa Major (Big Dipper) asterism.
 *
 * A drift of faint background stars twinkles slowly; the seven dipper stars
 * sit brighter with connecting lines, and the whole field shifts subtly with
 * the cursor. Static single render under reduced motion.
 */

// Big Dipper in normalized coordinates (x, y in 0..1 within its bounding box).
const DIPPER = [
  { x: 0.02, y: 0.78, r: 2.6 }, // Alkaid
  { x: 0.22, y: 0.58, r: 2.1 }, // Mizar
  { x: 0.38, y: 0.46, r: 2.3 }, // Alioth
  { x: 0.55, y: 0.38, r: 2.0 }, // Megrez
  { x: 0.61, y: 0.7, r: 2.3 }, // Phecda
  { x: 0.88, y: 0.75, r: 2.4 }, // Merak
  { x: 0.93, y: 0.32, r: 2.8 }, // Dubhe
];

// Segments: handle then bowl, closing back to Megrez.
const SEGMENTS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 3],
];

const STAR_COUNT = 130;

export const initConstellation = (canvas, { animate = true } = {}) => {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  let width = 0;
  let height = 0;
  let dpr = 1;
  let stars = [];
  let rafId = 0;
  let running = false;
  let time = Math.random() * 1000;

  const pointer = { x: 0.5, y: 0.5 };
  const eased = { x: 0.5, y: 0.5 };

  const seedStars = () => {
    stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.4 + Math.random() * 1.1,
      depth: 0.25 + Math.random() * 0.75,
      phase: Math.random() * Math.PI * 2,
      speed: 0.35 + Math.random() * 0.65,
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

  // The dipper occupies the upper-right area of the canvas.
  const dipperPoint = (point, parallax) => {
    const boxW = Math.min(width * 0.42, 520);
    const boxH = boxW * 0.52;
    const originX = width * 0.58 + parallax.x * 18;
    const originY = height * 0.16 + parallax.y * 12;

    return {
      x: originX + point.x * boxW,
      y: originY + point.y * boxH,
    };
  };

  const draw = () => {
    context.clearRect(0, 0, width, height);

    eased.x += (pointer.x - eased.x) * 0.04;
    eased.y += (pointer.y - eased.y) * 0.04;

    const parallax = { x: (eased.x - 0.5) * 2, y: (eased.y - 0.5) * 2 };

    // Background drift
    for (const star of stars) {
      const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * star.speed + star.phase));
      const px = star.x * width + parallax.x * 26 * star.depth;
      const py = star.y * height + parallax.y * 18 * star.depth;

      context.beginPath();
      context.arc(px, py, star.r, 0, Math.PI * 2);
      context.fillStyle = `rgba(210, 218, 246, ${0.14 + twinkle * 0.4 * star.depth})`;
      context.fill();
    }

    // Dipper lines
    context.strokeStyle = "rgba(165, 175, 251, 0.22)";
    context.lineWidth = 1;
    context.beginPath();
    for (const [from, to] of SEGMENTS) {
      const a = dipperPoint(DIPPER[from], parallax);
      const b = dipperPoint(DIPPER[to], parallax);
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
    }
    context.stroke();

    // Dipper stars with a soft glow
    for (const [index, star] of DIPPER.entries()) {
      const point = dipperPoint(star, parallax);
      const pulse = 0.75 + 0.25 * Math.sin(time * 0.8 + index * 1.3);

      const gradient = context.createRadialGradient(
        point.x,
        point.y,
        0,
        point.x,
        point.y,
        star.r * 6,
      );
      gradient.addColorStop(0, `rgba(214, 222, 255, ${0.5 * pulse})`);
      gradient.addColorStop(1, "rgba(214, 222, 255, 0)");
      context.beginPath();
      context.arc(point.x, point.y, star.r * 6, 0, Math.PI * 2);
      context.fillStyle = gradient;
      context.fill();

      context.beginPath();
      context.arc(point.x, point.y, star.r, 0, Math.PI * 2);
      context.fillStyle = `rgba(242, 245, 253, ${0.85 * pulse + 0.15})`;
      context.fill();
    }
  };

  const tick = () => {
    time += 0.016;
    draw();
    rafId = window.requestAnimationFrame(tick);
  };

  const start = () => {
    if (!running && animate) {
      running = true;
      rafId = window.requestAnimationFrame(tick);
    }
  };

  const stop = () => {
    running = false;
    window.cancelAnimationFrame(rafId);
  };

  const onPointerMove = (event) => {
    pointer.x = event.clientX / window.innerWidth;
    pointer.y = event.clientY / window.innerHeight;
  };

  seedStars();
  resize();
  draw();

  if (!animate) {
    return;
  }

  window.addEventListener("resize", () => {
    resize();
    draw();
  });

  window.addEventListener("pointermove", onPointerMove, { passive: true });

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
