/**
 * Hero "signal field" — a living network of drifting nodes.
 *
 * Faint stars wander and knit themselves together with lines when they pass
 * close. On top of that ambient web, every couple of seconds a few links fade
 * out while a few fresh ones reach across to different dots, so the
 * constellation keeps quietly rewiring itself. The whole field scrolls up a
 * touch slower than the hero content for a light parallax. Static single
 * render under reduced motion.
 */

const PERI = [165, 175, 251];
const STAR = [242, 245, 253];

// Distances in CSS pixels.
const LINK_DISTANCE = 150; // ambient links form within this range
const REACH_DISTANCE = 225; // deliberate "reach" links may span up to this
const MAX_SPEED = 26; // px/sec
const NODE_AREA = 16000; // one node per this many px²
const NODE_MIN = 30;
const NODE_MAX = 96;

// Rewire behaviour.
const FADE_SPEED = 2.4; // link opacity units per second
const REWIRE_MIN = 2.5; // seconds between rewire events (low)
const REWIRE_MAX = 5; // seconds between rewire events (high)
const RETIRE_COUNT = 3; // links faded out per event
const SPAWN_COUNT = 3; // reach links formed per event
const COOLDOWN = 1.8; // seconds a retired pair stays disconnected
const REACH_LIFE_MIN = 1.8; // seconds a reach link holds before fading
const REACH_LIFE_MAX = 2.8;

// Fraction of scroll the background lags behind the content by.
const PARALLAX = 0.18;

const rgba = (color, alpha) =>
  `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;

const rand = (min, max) => min + Math.random() * (max - min);

const pairKey = (i, j) => (i < j ? `${i}-${j}` : `${j}-${i}`);

// Pull up to `k` random distinct entries from an array.
const sample = (arr, k) => {
  const pool = arr.slice();
  const out = [];
  while (pool.length && out.length < k) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
};

export const initConstellation = (canvas, { animate = true } = {}) => {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  let width = 0;
  let height = 0;
  let dpr = 1;
  let nodes = [];
  let rafId = 0;
  let running = false;
  let lastTime = 0;

  // Active links, keyed by node-pair. Each: { i, j, alpha, target, reach,
  // life, retiring }. `reach` links may exceed LINK_DISTANCE and self-expire.
  const links = new Map();
  // Pair key -> elapsed time until which it may not reconnect.
  const cooldown = new Map();
  let elapsed = 0;
  let nextRewireAt = 0;

  const seedNodes = () => {
    const target = Math.round((width * height) / NODE_AREA);
    const count = Math.max(NODE_MIN, Math.min(NODE_MAX, target));

    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.5) * 14,
      r: 0.8 + Math.random() * 1.6,
    }));

    // Node indices changed, so any existing links are stale.
    links.clear();
    cooldown.clear();
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

  const distanceBetween = (a, b) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const step = (dt) => {
    for (const node of nodes) {
      node.x += node.vx * dt;
      node.y += node.vy * dt;

      // Bounce off the edges so the field stays populated.
      if (node.x < 0) {
        node.x = 0;
        node.vx *= -1;
      } else if (node.x > width) {
        node.x = width;
        node.vx *= -1;
      }
      if (node.y < 0) {
        node.y = 0;
        node.vy *= -1;
      } else if (node.y > height) {
        node.y = height;
        node.vy *= -1;
      }

      const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      if (speed > MAX_SPEED) {
        node.vx = (node.vx / speed) * MAX_SPEED;
        node.vy = (node.vy / speed) * MAX_SPEED;
      }
    }
  };

  // Fire a rewire: retire a few live links and reach out to form new ones.
  const rewire = (reachCandidates) => {
    const retirable = [];
    for (const link of links.values()) {
      if (!link.reach && !link.retiring && link.alpha > 0.5) {
        retirable.push(link);
      }
    }
    for (const link of sample(retirable, RETIRE_COUNT)) {
      link.retiring = true;
      link.target = 0;
      cooldown.set(pairKey(link.i, link.j), elapsed + COOLDOWN);
    }

    for (const cand of sample(reachCandidates, SPAWN_COUNT)) {
      links.set(cand.key, {
        i: cand.i,
        j: cand.j,
        alpha: 0,
        target: 1,
        reach: true,
        life: rand(REACH_LIFE_MIN, REACH_LIFE_MAX),
        retiring: false,
      });
    }
  };

  const updateLinks = (dt) => {
    elapsed += dt;
    if (nextRewireAt === 0) {
      nextRewireAt = elapsed + rand(REWIRE_MIN, REWIRE_MAX);
    }

    // Scan every pair once: refresh ambient links, gather reach candidates.
    const reachCandidates = [];
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const dist = distanceBetween(nodes[i], nodes[j]);
        const key = pairKey(i, j);
        const existing = links.get(key);

        if (dist < LINK_DISTANCE) {
          if (existing) {
            if (!existing.retiring && !existing.reach) {
              existing.target = 1;
            }
          } else {
            const cooling = cooldown.get(key);
            if (cooling === undefined || elapsed >= cooling) {
              links.set(key, {
                i,
                j,
                alpha: 0,
                target: 1,
                reach: false,
                life: 0,
                retiring: false,
              });
            }
          }
        } else if (dist < REACH_DISTANCE && !existing) {
          const cooling = cooldown.get(key);
          if (cooling === undefined || elapsed >= cooling) {
            reachCandidates.push({ key, i, j });
          }
        }
      }
    }

    if (elapsed >= nextRewireAt) {
      rewire(reachCandidates);
      nextRewireAt = elapsed + rand(REWIRE_MIN, REWIRE_MAX);
    }

    // Advance each link's lifetime and eased opacity; drop the dead ones.
    const ease = Math.min(1, dt * FADE_SPEED);
    for (const [key, link] of links) {
      const dist = distanceBetween(nodes[link.i], nodes[link.j]);

      if (link.reach) {
        link.life -= dt;
        if (link.life <= 0 || dist > REACH_DISTANCE) {
          link.target = 0;
        }
      } else if (dist >= LINK_DISTANCE) {
        link.target = 0; // drifted apart
      }

      link.alpha += (link.target - link.alpha) * ease;

      if (link.target === 0 && link.alpha < 0.02) {
        links.delete(key);
      }
    }

    // Forget expired cooldowns so the map does not grow unbounded.
    for (const [key, until] of cooldown) {
      if (elapsed >= until) {
        cooldown.delete(key);
      }
    }
  };

  const drawLink = (link) => {
    const a = nodes[link.i];
    const b = nodes[link.j];
    const dist = distanceBetween(a, b);
    let opacity;
    if (link.reach) {
      opacity = link.alpha * (1 - 0.5 * (dist / REACH_DISTANCE)) * 0.45;
    } else {
      opacity = link.alpha * Math.max(0, 1 - dist / LINK_DISTANCE) * 0.34;
    }
    if (opacity <= 0.003) {
      return;
    }
    context.strokeStyle = rgba(PERI, opacity);
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.stroke();
  };

  const render = () => {
    context.clearRect(0, 0, width, height);

    context.lineWidth = 1;
    for (const link of links.values()) {
      drawLink(link);
    }

    for (const node of nodes) {
      context.beginPath();
      context.fillStyle = rgba(STAR, 0.55);
      context.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      context.fill();
    }
  };

  // Simple distance-only frame for the initial paint and reduced motion.
  const drawStatic = () => {
    context.clearRect(0, 0, width, height);
    context.lineWidth = 1;
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const dist = distanceBetween(nodes[i], nodes[j]);
        if (dist < LINK_DISTANCE) {
          context.strokeStyle = rgba(PERI, (1 - dist / LINK_DISTANCE) * 0.34);
          context.beginPath();
          context.moveTo(nodes[i].x, nodes[i].y);
          context.lineTo(nodes[j].x, nodes[j].y);
          context.stroke();
        }
      }
    }
    for (const node of nodes) {
      context.beginPath();
      context.fillStyle = rgba(STAR, 0.55);
      context.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      context.fill();
    }
  };

  const tick = (now) => {
    if (!running) {
      return;
    }
    const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0.016;
    lastTime = now;
    step(dt);
    updateLinks(dt);
    render();
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
  seedNodes();
  drawStatic();

  if (!animate) {
    return;
  }

  applyParallax();

  window.addEventListener("resize", () => {
    resize();
    seedNodes();
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
