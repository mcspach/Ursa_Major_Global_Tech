/**
 * Hero star-field.
 *
 * A drift of faint background stars twinkles slowly, and the whole field
 * shifts subtly with the cursor. Static single render under reduced motion.
 */

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
