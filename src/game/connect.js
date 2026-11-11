/* Connective interactions: small widgets that link one section to another
   (stack chips to tech trees, experience lenses, the launch stepper, copy
   email, quick jump). Each one is an enhancement over content that is
   already complete and readable without scripting. */

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const EMAIL = 'victorcamilo.jimenezv@gmail.com';

/** Marks the primary navigation link for the section in view. */
export function createActiveNav() {
  const links = [
    ...document.querySelectorAll('.nav-links a, #nav-panel a'),
  ].filter((link) => link.getAttribute('href')?.startsWith('#'));
  let active = undefined;
  return (id) => {
    /* The launch sequence has no link of its own; it belongs to AI. */
    const target = id === 'process' ? 'agent' : id;
    if (target === active) return;
    active = target;
    links.forEach((link) => {
      if (target && link.getAttribute('href') === `#${target}`) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };
}

/**
 * Tool chips elsewhere on the page (stack marquee, core stack tags, ability
 * cards) open the matching tech tree. Delegated, so marquee clones work for
 * pointer users too.
 */
export function setupTreeJumps(techTree) {
  if (!techTree) return;
  document.querySelectorAll('[data-tree-jump]').forEach((node) => {
    node.hidden = false;
  });
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-tree-jump]');
    if (!trigger) return;
    techTree.open(trigger.dataset.treeJump, trigger.dataset.tool);
  });
}

/** Upgrades static stack tags to buttons that open their tech tree. */
export function upgradeToolTags(selector) {
  document.querySelectorAll(selector).forEach((tag) => {
    if (!tag.dataset.treeJump) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `${tag.className} tag--button`;
    button.textContent = tag.textContent.trim();
    button.dataset.treeJump = tag.dataset.treeJump;
    if (tag.dataset.tool) button.dataset.tool = tag.dataset.tool;
    button.setAttribute(
      'aria-label',
      `${button.textContent}: show in tech trees`
    );
    if (tag.tagName === 'LI') {
      tag.className = 'tag-slot';
      delete tag.dataset.treeJump;
      delete tag.dataset.tool;
      tag.replaceChildren(button);
    } else {
      /* Marquee items keep their icon. */
      button.replaceChildren(...tag.childNodes);
      tag.replaceWith(button);
    }
  });
}

/**
 * Domain lens over the current role's highlights. Every bullet stays in the
 * DOM and visible; a lens only dims the ones outside the chosen domain.
 */
export function setupExperienceLens() {
  const list = document.querySelector('[data-lens-list]');
  const bar = document.getElementById('experience-lens');
  if (!list || !bar) return;
  const items = [...list.querySelectorAll('li[data-lens]')];
  const status = document.getElementById('experience-lens-status');
  const lenses = [
    { id: 'all', label: 'All' },
    { id: 'platforms', label: 'Platforms & media' },
    { id: 'frontend', label: 'Frontend & APIs' },
    { id: 'delivery', label: 'Delivery, SEO & security' },
  ];
  const matches = (item, id) =>
    id === 'all' || item.dataset.lens.split(' ').includes(id);

  const buttons = lenses.map((lens) => {
    const count = items.filter((item) => matches(item, lens.id)).length;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lens-chip';
    button.dataset.lens = lens.id;
    button.setAttribute('aria-pressed', String(lens.id === 'all'));
    const name = document.createElement('span');
    name.textContent = lens.label;
    const badge = document.createElement('span');
    badge.className = 'lens-chip__count';
    badge.textContent = String(count);
    const unit = document.createElement('span');
    unit.className = 'visually-hidden';
    unit.textContent = ' highlights';
    badge.appendChild(unit);
    button.append(name, badge);
    return button;
  });
  bar.querySelector('.lens__chips').append(...buttons);
  bar.hidden = false;

  const apply = (id) => {
    let shown = 0;
    items.forEach((item) => {
      const match = matches(item, id);
      item.dataset.dim = String(!match);
      if (match) shown += 1;
    });
    buttons.forEach((button) =>
      button.setAttribute('aria-pressed', String(button.dataset.lens === id))
    );
    list.dataset.lensActive = String(id !== 'all');
    if (status) {
      const lens = lenses.find((l) => l.id === id);
      status.textContent =
        id === 'all'
          ? `Showing all ${items.length} highlights.`
          : `${lens.label}: ${shown} of ${items.length} highlights emphasised. The others stay listed.`;
    }
  };

  bar.addEventListener('click', (event) => {
    const button = event.target.closest('.lens-chip');
    if (button) apply(button.dataset.lens);
  });

  return { apply };
}

/**
 * The launch sequence: each step's title is a button. Stepping through
 * fills the fuel line, plays a tone, and the last step fires a spark burst.
 * All four cards stay visible the whole time.
 */
export function setupLaunchSequence({ sound, particles, onLiftoff }) {
  const list = document.querySelector('.process');
  const status = document.getElementById('process-status');
  const controls = document.getElementById('process-controls');
  const next = document.getElementById('process-next');
  if (!list || !controls || !next) return;
  const items = [...list.querySelectorAll('.process__item')];
  let reached = -1;

  items.forEach((item, index) => {
    const title = item.querySelector('.process__title');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'process__trigger';
    button.dataset.step = String(index);
    button.textContent = title.textContent.trim();
    title.replaceChildren(button);
  });

  const render = () => {
    items.forEach((item, index) => {
      item.dataset.state =
        index < reached ? 'done' : index === reached ? 'active' : 'idle';
      item
        .querySelector('.process__trigger')
        .setAttribute('aria-current', index === reached ? 'step' : 'false');
    });
    list.dataset.interactive = 'true';
    /* The fuel line runs from the first stage dot to the last, so the fill
       stops exactly on the active stage's dot. */
    list.style.setProperty(
      '--fuel',
      String(Math.max(reached, 0) / (items.length - 1))
    );
    const label = items[reached]?.querySelector('.process__count');
    const title = items[reached]?.querySelector('.process__trigger');
    if (status && label && title) {
      status.textContent =
        reached === items.length - 1
          ? `${label.textContent} reached: ${title.textContent}. All four stages complete.`
          : `${label.textContent}: ${title.textContent}. Stage ${reached + 1} of ${items.length}.`;
    }
    next.textContent =
      reached === -1
        ? 'Start the countdown'
        : reached >= items.length - 1
          ? 'Run it again'
          : 'Next stage';
  };

  const go = (index) => {
    reached = index;
    render();
    if (index === items.length - 1) {
      sound('liftoff');
      particles?.burstFrom(items[index], { count: 80, power: 10 });
      onLiftoff?.();
    } else {
      sound('step');
    }
  };

  list.addEventListener('click', (event) => {
    const trigger = event.target.closest('.process__trigger');
    if (trigger) go(Number(trigger.dataset.step));
  });
  next.addEventListener('click', () => {
    go(reached >= items.length - 1 ? 0 : reached + 1);
  });

  controls.hidden = false;
  render();
  delete list.dataset.interactive;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* Clipboard blocked (permissions or insecure context); the caller
       shows the address instead. */
    return false;
  }
}

/** Copies the contact email, with a toast and a small spark burst. */
export function createEmailCopier({ toast, particles }) {
  return async (origin) => {
    const copied = await copyText(EMAIL);
    if (copied) {
      toast('Email copied', EMAIL, 'info');
      if (origin) particles?.burstFrom(origin, { count: 24, power: 5 });
    } else {
      toast('Copy unavailable', `Write to ${EMAIL}`, 'info');
    }
    return copied;
  };
}

export function setupCopyEmail(copyEmail) {
  const button = document.getElementById('copy-email');
  if (!button) return;
  button.hidden = false;
  const label = button.querySelector('.copy-email__label');
  button.addEventListener('click', async () => {
    const copied = await copyEmail(button);
    if (!copied || !label) return;
    label.textContent = 'Copied';
    setTimeout(() => {
      label.textContent = 'Copy email';
    }, 1800);
  });
}

/** Featured-project pills point at the page sections that back them. */
export function setupFocusPills({ lens }) {
  document.querySelectorAll('[data-pill-target]').forEach((pill) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pill pill--button';
    button.textContent = pill.textContent.trim();
    button.dataset.pillTarget = pill.dataset.pillTarget;
    if (pill.dataset.pillLens) button.dataset.pillLens = pill.dataset.pillLens;
    pill.className = 'pill-slot';
    pill.replaceChildren(button);
  });

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-pill-target]');
    if (!button || button.tagName !== 'BUTTON') return;
    const target = document.querySelector(button.dataset.pillTarget);
    if (!target) return;
    if (button.dataset.pillLens) lens?.apply(button.dataset.pillLens);
    target.scrollIntoView({
      behavior: reducedMotion() ? 'auto' : 'smooth',
      block: 'center',
    });
    target.dataset.spotlight = 'true';
    setTimeout(() => delete target.dataset.spotlight, 1600);
    if (!target.matches('a, button, [tabindex]')) {
      target.setAttribute('tabindex', '-1');
    }
    target.focus({ preventScroll: true });
  });
}

/**
 * Quick jump: Cmd/Ctrl+K or "?" opens a small command list for sections and
 * page actions. Typing filters it; Enter runs the first visible entry.
 */
export function setupQuickJump({ actions }) {
  const dialog = document.getElementById('quickjump');
  const toggle = document.getElementById('quickjump-toggle');
  const input = document.getElementById('quickjump-filter');
  const list = document.getElementById('quickjump-list');
  const empty = document.getElementById('quickjump-empty');
  if (!dialog?.showModal || !input || !list) return;

  const entries = () => [...list.querySelectorAll('[data-qj]')];

  const open = () => {
    if (dialog.open) return;
    input.value = '';
    filter();
    dialog.showModal();
    input.focus();
  };
  const close = () => dialog.open && dialog.close();

  const filter = () => {
    const query = input.value.trim().toLowerCase();
    let shown = 0;
    entries().forEach((entry) => {
      const match =
        !query ||
        entry.textContent.toLowerCase().includes(query) ||
        (entry.dataset.keywords || '').includes(query);
      entry.closest('li').hidden = !match;
      if (match) shown += 1;
    });
    if (empty) empty.hidden = shown > 0;
  };

  input.addEventListener('input', filter);
  input.addEventListener('keydown', (event) => {
    const visible = entries().filter((entry) => !entry.closest('li').hidden);
    if (event.key === 'Enter' && visible[0]) {
      event.preventDefault();
      visible[0].click();
    } else if (event.key === 'ArrowDown' && visible[0]) {
      event.preventDefault();
      visible[0].focus();
    }
  });

  list.addEventListener('keydown', (event) => {
    const visible = entries().filter((entry) => !entry.closest('li').hidden);
    const index = visible.indexOf(document.activeElement);
    if (index === -1) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      visible[(index + 1) % visible.length].focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (index === 0) input.focus();
      else visible[index - 1].focus();
    }
  });

  list.addEventListener('click', (event) => {
    const entry = event.target.closest('[data-qj]');
    if (!entry) return;
    close();
    const action = entry.dataset.qjAction;
    if (action && actions[action]) {
      event.preventDefault();
      /* Without the Popover API, popovers close on any document click; this
         click must not reach that handler after it opens the quest log. */
      event.stopPropagation();
      actions[action](entry);
    }
    /* Section entries are ordinary in-page links and navigate natively. */
  });

  /* Clicking the backdrop closes the dialog. */
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) close();
  });

  toggle?.addEventListener('click', open);
  if (toggle) toggle.hidden = false;

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (dialog.open) close();
      else open();
      return;
    }
    if (event.key !== '?' || event.metaKey || event.ctrlKey || event.altKey)
      return;
    if (
      event.target.closest?.(
        'input, textarea, select, [contenteditable], dialog'
      )
    )
      return;
    event.preventDefault();
    open();
  });
}
