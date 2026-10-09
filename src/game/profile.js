/* The player profile's tech trees. Without scripting they are six plain
   lists; with it they become tabs, and the selected tree's tools orbit a hub
   with power lines drawn to each node. */

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * @param {object} options
 * @param {(inspected: number) => void} options.onInspect
 * @param {() => void} options.onSelect
 */
export function setupTechTree({ onInspect, onSelect }) {
  const root = document.getElementById('techtree');
  const stage = root?.querySelector('.techtree__stage');
  const links = root?.querySelector('.techtree__links');
  const trees = [...(root?.querySelectorAll('.tree') ?? [])];
  if (!root || !stage || !links || !trees.length) return;

  const inspected = new Set();
  const tablist = document.createElement('div');
  tablist.className = 'techtree__tabs';
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', 'Tech trees');

  const tabs = trees.map((tree) => {
    const id = tree.dataset.tree;
    const name = tree.querySelector('.tree__name');
    const count = tree.querySelectorAll('.tree__tools li').length;
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.id = `tab-${id}`;
    tab.className = 'techtree__tab';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', tree.id);
    tab.style.setProperty('--hue', tree.dataset.hue);
    const label = document.createElement('span');
    label.textContent = name.textContent;
    const badge = document.createElement('span');
    badge.className = 'techtree__count';
    badge.textContent = String(count);
    const unit = document.createElement('span');
    unit.className = 'visually-hidden';
    unit.textContent = ' tools';
    badge.appendChild(unit);
    tab.append(label, badge);

    tree.setAttribute('role', 'tabpanel');
    tree.setAttribute('aria-labelledby', tab.id);
    tree.tabIndex = 0;
    tree.style.setProperty('--hue', tree.dataset.hue);
    /* The tab names the panel, so the visible heading inside becomes the
       hub label only. */
    name.setAttribute('aria-hidden', 'true');

    const tools = [...tree.querySelectorAll('.tree__tools li')];
    tools.forEach((tool, index) => {
      const angle = -90 + (index * 360) / tools.length;
      const radians = (angle * Math.PI) / 180;
      tool.style.setProperty('--x', `${50 + Math.cos(radians) * 40}%`);
      tool.style.setProperty('--y', `${50 + Math.sin(radians) * 39}%`);
      tool.style.setProperty('--i', String(index));
    });
    return tab;
  });

  tablist.append(...tabs);
  root.querySelector('.techtree__head').after(tablist);
  root.dataset.enhanced = 'true';

  /* Lines are drawn in the stage's real pixel space, so pathLength-based
     dash animation stays exact and strokes keep a uniform width. */
  let current = null;
  function drawLinks(tree) {
    current = tree;
    const { width, height } = stage.getBoundingClientRect();
    links.setAttribute('viewBox', `0 0 ${width || 100} ${height || 100}`);
    const tools = [...tree.querySelectorAll('.tree__tools li')];
    links.replaceChildren(
      ...tools.map((tool, index) => {
        const x = parseFloat(tool.style.getPropertyValue('--x'));
        const y = parseFloat(tool.style.getPropertyValue('--y'));
        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', String(width / 2));
        line.setAttribute('y1', String(height / 2));
        line.setAttribute('x2', String((x / 100) * width));
        line.setAttribute('y2', String((y / 100) * height));
        line.setAttribute('pathLength', '1');
        line.style.setProperty('--i', String(index));
        return line;
      })
    );
    links.style.setProperty('--hue', tree.dataset.hue);
  }

  if ('ResizeObserver' in window) {
    new ResizeObserver(() => current && drawLinks(current)).observe(stage);
  }

  function select(index, { focus = false, user = false } = {}) {
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      trees[i].hidden = !active;
    });
    drawLinks(trees[index]);
    if (focus) tabs[index].focus();
    inspected.add(index);
    onInspect(inspected.size);
    if (user) onSelect();
  }

  tablist.addEventListener('click', (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (tab) select(tabs.indexOf(tab), { user: true });
  });

  /* Arrow keys, Home and End, as in the ARIA tabs pattern. */
  tablist.addEventListener('keydown', (event) => {
    const current = tabs.indexOf(document.activeElement);
    if (current === -1) return;
    const last = tabs.length - 1;
    const next = {
      ArrowRight: current === last ? 0 : current + 1,
      ArrowDown: current === last ? 0 : current + 1,
      ArrowLeft: current === 0 ? last : current - 1,
      ArrowUp: current === 0 ? last : current - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(next, { focus: true, user: true });
  });

  select(0);
}

/** The save-file bar fills when the CV download starts. */
export function setupSaveFile() {
  document.querySelectorAll('.savefile__btn').forEach((button) => {
    button.addEventListener('click', () => {
      const panel = button.closest('.savefile');
      if (!panel) return;
      delete panel.dataset.saving;
      // Restart the fill animation on repeated downloads.
      void panel.offsetWidth;
      panel.dataset.saving = 'true';
    });
  });
}
