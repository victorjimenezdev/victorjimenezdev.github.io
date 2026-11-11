/* The player profile's tech trees. Without scripting they are six plain
   lists; with it they become tabs, and the selected tree becomes a circuit
   board: a hub node feeds a bus line, each row of tool chips hangs off the
   bus, and selecting a chip reads out where that tool shows up in the CV. */

import { toolEvidence } from '../data/tools.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * @param {object} options
 * @param {(inspected: number) => void} options.onInspect
 * @param {() => void} options.onSelect
 * @returns {{open: (treeId: string, tool?: string) => void} | null}
 */
export function setupTechTree({ onInspect, onSelect }) {
  const root = document.getElementById('techtree');
  const stage = root?.querySelector('.techtree__stage');
  const links = root?.querySelector('.techtree__links');
  const trees = [...(root?.querySelectorAll('.tree') ?? [])];
  if (!root || !stage || !links || !trees.length) return null;

  const inspected = new Set();
  const tablist = document.createElement('div');
  tablist.className = 'techtree__tabs';
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', 'Tech trees');

  const progress = document.createElement('p');
  progress.className = 'techtree__progress';
  progress.setAttribute('aria-live', 'polite');

  const readout = document.createElement('div');
  readout.className = 'techtree__readout';
  readout.id = 'techtree-readout';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-atomic', 'true');
  const readoutTool = document.createElement('p');
  readoutTool.className = 'techtree__readout-tool';
  const readoutText = document.createElement('p');
  readoutText.className = 'techtree__readout-text';
  const readoutFrom = document.createElement('p');
  readoutFrom.className = 'techtree__readout-from';
  readout.append(readoutTool, readoutText, readoutFrom);

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
    tree.style.setProperty('--hue', tree.dataset.hue);
    /* The tab names the panel, so the visible heading inside becomes the
       hub label only. */
    name.setAttribute('aria-hidden', 'true');

    /* Each chip becomes a button; the list item keeps the same text. */
    [...tree.querySelectorAll('.tree__tools li')].forEach((tool, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tree__tool';
      button.dataset.tool = tool.textContent.trim();
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-controls', readout.id);
      button.textContent = tool.textContent.trim();
      tool.replaceChildren(button);
      tool.style.setProperty('--i', String(index));
    });
    return tab;
  });

  tablist.append(...tabs);
  root.querySelector('.techtree__head').append(progress);
  root.querySelector('.techtree__head').after(tablist);
  stage.after(readout);
  root.dataset.enhanced = 'true';

  /* Traces are drawn in the stage's real pixel space from measured chip
     boxes, so they follow any wrap the layout settles on. */
  let current = null;
  function drawLinks(tree) {
    current = tree;
    const box = stage.getBoundingClientRect();
    links.setAttribute(
      'viewBox',
      `0 0 ${Math.max(box.width, 1)} ${Math.max(box.height, 1)}`
    );
    links.style.setProperty('--hue', tree.dataset.hue);
    const hub = tree.querySelector('.tree__name').getBoundingClientRect();
    const chips = [...tree.querySelectorAll('.tree__tool')].map((chip) =>
      chip.getBoundingClientRect()
    );
    /* Stacked (mobile) layouts have no room for traces. */
    if (!chips.length || hub.right > chips[0].left || box.width === 0) {
      links.replaceChildren();
      return;
    }

    const rows = [];
    chips.forEach((rect) => {
      const row = rows.find((r) => Math.abs(r.top - rect.top) < 4);
      if (row) row.items.push(rect);
      else rows.push({ top: rect.top, items: [rect] });
    });

    const x = (value) => (value - box.left).toFixed(1);
    const y = (value) => (value - box.top).toFixed(1);
    const busX = Math.min(...chips.map((r) => r.left)) - 14;
    const hubY = hub.top + hub.height / 2;
    const rowYs = rows.map((row) => row.items[0].top + row.items[0].height / 2);
    const paths = [];

    paths.push(
      `M${x(hub.right)} ${y(hubY)} H${x(busX)}`,
      `M${x(busX)} ${y(Math.min(hubY, ...rowYs))} V${y(Math.max(hubY, ...rowYs))}`
    );
    rows.forEach((row, index) => {
      const rowY = rowYs[index];
      row.items.sort((a, b) => a.left - b.left);
      paths.push(`M${x(busX)} ${y(rowY)} H${x(row.items[0].left)}`);
      row.items.slice(1).forEach((rect, i) => {
        paths.push(`M${x(row.items[i].right)} ${y(rowY)} H${x(rect.left)}`);
      });
    });

    const nodes = paths.map((d, index) => {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('pathLength', '1');
      path.style.setProperty('--i', String(index));
      return path;
    });
    rowYs.forEach((rowY) => {
      const dot = document.createElementNS(SVG_NS, 'circle');
      dot.setAttribute('cx', x(busX));
      dot.setAttribute('cy', y(rowY));
      dot.setAttribute('r', '3');
      nodes.push(dot);
    });
    links.replaceChildren(...nodes);
  }

  if ('ResizeObserver' in window) {
    new ResizeObserver(() => current && drawLinks(current)).observe(stage);
  }

  function renderProgress() {
    progress.textContent = `${inspected.size} of ${tabs.length} trees inspected`;
    tabs.forEach((tab, i) => {
      tab.dataset.inspected = String(inspected.has(i));
    });
  }

  function showTool(button) {
    const tree = button.closest('.tree');
    tree.querySelectorAll('.tree__tool').forEach((chip) => {
      chip.setAttribute('aria-pressed', String(chip === button));
    });
    const evidence = toolEvidence(tree.dataset.tree, button.dataset.tool);
    readoutTool.textContent = button.dataset.tool;
    readoutText.textContent = evidence.text;
    readoutFrom.textContent = evidence.from;
    readout.dataset.filled = 'true';
  }

  function resetReadout(index) {
    const name = trees[index].querySelector('.tree__name').textContent;
    const count = trees[index].querySelectorAll('.tree__tool').length;
    readoutTool.textContent = name;
    readoutText.textContent = `${count} tools. Select a tool to see where it appears in my CV.`;
    readoutFrom.textContent = '';
    readout.dataset.filled = 'false';
  }

  function select(index, { focus = false, user = false } = {}) {
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      trees[i].hidden = !active;
    });
    trees[index]
      .querySelectorAll('.tree__tool')
      .forEach((chip) => chip.setAttribute('aria-pressed', 'false'));
    drawLinks(trees[index]);
    resetReadout(index);
    if (focus) tabs[index].focus();
    inspected.add(index);
    renderProgress();
    onInspect(inspected.size);
    if (user) onSelect();
  }

  tablist.addEventListener('click', (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (tab) select(tabs.indexOf(tab), { user: true });
  });

  stage.addEventListener('click', (event) => {
    const chip = event.target.closest('.tree__tool');
    if (!chip) return;
    showTool(chip);
    onSelect();
  });

  /* Arrow keys, Home and End, as in the ARIA tabs pattern. */
  tablist.addEventListener('keydown', (event) => {
    const active = tabs.indexOf(document.activeElement);
    if (active === -1) return;
    const last = tabs.length - 1;
    const next = {
      ArrowRight: active === last ? 0 : active + 1,
      ArrowDown: active === last ? 0 : active + 1,
      ArrowLeft: active === 0 ? last : active - 1,
      ArrowUp: active === 0 ? last : active - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(next, { focus: true, user: true });
  });

  select(0);

  return {
    /** Selects a tree (and optionally one tool) from elsewhere on the page. */
    open(treeId, tool) {
      const index = trees.findIndex((tree) => tree.dataset.tree === treeId);
      if (index === -1) return;
      if (tabs[index].getAttribute('aria-selected') !== 'true') {
        select(index, { user: true });
      }
      const chip = tool
        ? [...trees[index].querySelectorAll('.tree__tool')].find(
            (node) => node.dataset.tool === tool
          )
        : null;
      const reduce = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      root.scrollIntoView({
        behavior: reduce ? 'auto' : 'smooth',
        block: 'center',
      });
      const target = chip || tabs[index];
      if (chip) {
        showTool(chip);
        chip.dataset.pulse = 'true';
        setTimeout(() => delete chip.dataset.pulse, 1400);
      }
      target.focus({ preventScroll: true });
    },
  };
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
