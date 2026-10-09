/* Heads-up display: current stage, scroll XP bar, toasts, pointer tilt and
   the Konami code. Every effect here is decorative and degrades to the plain
   page when scripting, motion or a fine pointer is unavailable. */

const KONAMI = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
];

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Shows the section the visitor is in as a game stage. */
export function setupStageTracker(onEnter) {
  const hud = document.getElementById('hud-stage');
  const index = hud?.querySelector('.hud-stage__index');
  const name = hud?.querySelector('.hud-stage__name');
  const sections = [...document.querySelectorAll('[data-stage]')];
  const hero = document.getElementById('top');
  if (!hud || !index || !name || !('IntersectionObserver' in window)) return;

  const visible = new Map();
  const render = () => {
    const current = [...visible.entries()]
      .filter(([, ratio]) => ratio > 0)
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!current || current === hero) {
      index.textContent = '00';
      name.textContent = 'Title screen';
      return;
    }
    index.textContent = current.dataset.stage;
    name.textContent = current.dataset.stageName;
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        visible.set(entry.target, entry.intersectionRatio);
        if (entry.isIntersecting && entry.intersectionRatio >= 0.25) {
          onEnter(entry.target.id);
        }
      });
      render();
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: '-20% 0px -30% 0px' }
  );
  [hero, ...sections].filter(Boolean).forEach((el) => observer.observe(el));
}

/** Scroll progress bar; CSS drives it natively where scroll timelines exist. */
export function setupXpBar() {
  if (CSS.supports('animation-timeline: scroll()')) return;
  const bar = document.querySelector('.hud-xp');
  if (!bar) return;
  let queued = false;
  const update = () => {
    queued = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--xp', String(max > 0 ? scrollY / max : 0));
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
  update();
}

/** Toast notifications, announced politely through the region's status role. */
export function createToaster() {
  const region = document.getElementById('toasts');
  return (title, detail, tone = 'info') => {
    if (!region) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.dataset.tone = tone;
    const heading = document.createElement('p');
    heading.className = 'toast__title';
    heading.textContent = title;
    const body = document.createElement('p');
    body.className = 'toast__detail';
    body.textContent = detail;
    toast.append(heading, body);
    region.appendChild(toast);
    while (region.children.length > 3) region.firstElementChild.remove();
    setTimeout(() => {
      toast.dataset.leaving = 'true';
      setTimeout(() => toast.remove(), reducedMotion() ? 0 : 400);
    }, 4200);
  };
}

/** 3D tilt and a moving glare highlight for cards under a fine pointer. */
export function setupTilt() {
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (!fine.matches) return;

  document.addEventListener(
    'pointermove',
    (event) => {
      if (reducedMotion()) return;
      const card = event.target.closest?.('[data-tilt]');
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      card.style.setProperty('--rx', `${((0.5 - y) * 7).toFixed(2)}deg`);
      card.style.setProperty('--ry', `${((x - 0.5) * 9).toFixed(2)}deg`);
      card.dataset.tilting = 'true';
    },
    { passive: true }
  );

  document.addEventListener(
    'pointerout',
    (event) => {
      const card = event.target.closest?.('[data-tilt]');
      if (!card || card.contains(event.relatedTarget)) return;
      card.dataset.tilting = 'false';
      card.style.removeProperty('--rx');
      card.style.removeProperty('--ry');
    },
    { passive: true }
  );
}

/** Up, up, down, down, left, right, left, right, B, A. */
export function setupKonami(onToggle) {
  let position = 0;
  document.addEventListener('keydown', (event) => {
    const target = event.target;
    if (target.closest?.('input, textarea, select, [contenteditable]')) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    position =
      key === KONAMI[position] ? position + 1 : key === KONAMI[0] ? 1 : 0;
    if (position === KONAMI.length) {
      position = 0;
      const root = document.documentElement;
      const on = root.dataset.mode !== 'phosphor';
      if (on) root.dataset.mode = 'phosphor';
      else delete root.dataset.mode;
      onToggle(on);
    }
  });
}

/**
 * Popover with a scripted fallback for engines without the Popover API,
 * mirroring the navigation panel's behaviour.
 */
export function setupPopover(toggle, panel) {
  if (!toggle || !panel) return;
  const supportsPopover = Object.prototype.hasOwnProperty.call(
    HTMLElement.prototype,
    'showPopover'
  );

  if (supportsPopover) {
    panel.addEventListener('toggle', (event) => {
      toggle.setAttribute('aria-expanded', String(event.newState === 'open'));
    });
    return;
  }

  toggle.removeAttribute('popovertarget');
  const close = (restoreFocus) => {
    panel.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus) toggle.focus();
  };
  toggle.addEventListener('click', () => {
    const open = panel.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel.classList.contains('is-open')) {
      close(true);
    }
  });
  document.addEventListener('click', (event) => {
    if (!panel.classList.contains('is-open')) return;
    if (panel.contains(event.target) || toggle.contains(event.target)) return;
    close(false);
  });
}
