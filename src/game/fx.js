/* Decorative effects: particle bursts, text decoding, a pointer light and
   magnetic buttons. Each one is a no-op under reduced motion, and none of
   them changes text that assistive technology reads. */

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = () =>
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+/<>';

/** Canvas 2D particle bursts. The frame loop only runs while sparks live. */
export function createParticles(canvas) {
  const ctx = canvas?.getContext('2d');
  const sparks = [];
  let running = false;
  let dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
  }

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = sparks.length - 1; i >= 0; i -= 1) {
      const s = sparks[i];
      s.life -= 1;
      if (s.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }
      s.vx *= 0.96;
      s.vy = s.vy * 0.96 + 0.12;
      s.x += s.vx;
      s.y += s.vy;
      const alpha = s.life / s.max;
      ctx.fillStyle = `hsl(${s.hue} 95% 68% / ${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x * dpr, s.y * dpr, s.size * dpr * alpha + 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (sparks.length) {
      requestAnimationFrame(frame);
    } else {
      running = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  if (ctx) {
    resize();
    window.addEventListener('resize', resize);
  }

  return {
    burst(x, y, { count = 46, hues = [290, 200, 330, 45], power = 7 } = {}) {
      if (!ctx || reducedMotion()) return;
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = power * (0.35 + Math.random() * 0.75);
        const max = 40 + Math.random() * 40;
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          size: 1.5 + Math.random() * 2.5,
          hue: hues[i % hues.length],
          life: max,
          max,
        });
      }
      if (!running) {
        running = true;
        requestAnimationFrame(frame);
      }
    },

    burstFrom(element, options) {
      const rect = element?.getBoundingClientRect();
      if (!rect || !rect.width) return;
      this.burst(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        options
      );
    },
  };
}

/** Decodes an aria-hidden text node from random glyphs to its final text. */
export function scramble(element, text, duration = 650) {
  if (!element) return;
  if (reducedMotion()) {
    element.textContent = text;
    return;
  }
  const start = performance.now();
  element.dataset.scrambling = 'true';
  const token = Symbol('scramble');
  element.scrambleToken = token;
  const tick = (now) => {
    if (element.scrambleToken !== token) return;
    const t = Math.min((now - start) / duration, 1);
    const settled = Math.floor(text.length * t);
    let out = text.slice(0, settled);
    for (let i = settled; i < text.length; i += 1) {
      out +=
        text[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    element.textContent = out;
    if (t < 1) requestAnimationFrame(tick);
    else delete element.dataset.scrambling;
  };
  requestAnimationFrame(tick);
}

/** Stage tags decode the first time their section scrolls into view. */
export function setupStageTags() {
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        const node = [...entry.target.childNodes].find(
          (child) =>
            child.nodeType === Node.TEXT_NODE && child.textContent.trim()
        );
        if (!node) return;
        const label = document.createElement('b');
        label.className = 'stage-tag__label';
        const text = node.textContent.trim();
        node.replaceWith(' ', label);
        scramble(label, text, 800);
      });
    },
    { threshold: 0.6 }
  );
  document
    .querySelectorAll('.section .stage-tag')
    .forEach((tag) => observer.observe(tag));
}

/** A soft light that follows the pointer behind the glass panels. */
export function setupSpotlight() {
  if (!finePointer()) return;
  const light = document.createElement('div');
  light.className = 'spotlight';
  light.setAttribute('aria-hidden', 'true');
  document.getElementById('sky')?.after(light);
  let queued = false;
  let x = 0;
  let y = 0;
  window.addEventListener(
    'pointermove',
    (event) => {
      x = event.clientX;
      y = event.clientY;
      if (queued || reducedMotion()) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        light.style.setProperty('--px', `${x}px`);
        light.style.setProperty('--py', `${y}px`);
        light.dataset.active = 'true';
      });
    },
    { passive: true }
  );
}

/** Primary buttons lean toward a nearby pointer. */
export function setupMagnetic(selector = '.btn--primary') {
  if (!finePointer()) return;
  document.addEventListener(
    'pointermove',
    (event) => {
      if (reducedMotion()) return;
      const button = event.target.closest?.(selector);
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      button.style.setProperty('--tx', `${(dx * 0.18).toFixed(1)}px`);
      button.style.setProperty('--ty', `${(dy * 0.28).toFixed(1)}px`);
    },
    { passive: true }
  );
  document.addEventListener(
    'pointerout',
    (event) => {
      const button = event.target.closest?.(selector);
      if (!button || button.contains(event.relatedTarget)) return;
      button.style.removeProperty('--tx');
      button.style.removeProperty('--ty');
    },
    { passive: true }
  );
}
