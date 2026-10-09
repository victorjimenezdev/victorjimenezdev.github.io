/* The galaxy map turns the 11 professional sectors into planets. Scanning a
   planet logs its projects; the totals stay exactly the documented ones. The
   map is an enhancement: the same facts are in the mission cards below and in
   the noscript fallback. */

/* Three orbit rings. Angles are spread so labels on neighbouring planets do
   not collide at desktop sizes. */
const RINGS = [
  { rx: 21, ry: 19, angles: [210, 330, 90] },
  { rx: 33, ry: 31, angles: [270, 30, 150, 75] },
  { rx: 43, ry: 41, angles: [0, 190, 250, 120] },
];

export const HUES = [285, 195, 330, 160, 25, 220, 300, 95, 45, 250, 180];

/**
 * @param {object} options
 * @param {Array<{id: string, title: string, description: string, projectCount: number}>} options.sectors
 * @param {number} options.total
 * @param {(sectorId: string) => void} options.onScan
 * @param {(scanned: number) => void} options.onProgress
 */
export function setupGalaxy({ sectors, total, onScan, onProgress }) {
  const root = document.getElementById('galaxy');
  const list = document.getElementById('galaxy-planets');
  const body = document.getElementById('galaxy-scan-body');
  const found = document.getElementById('galaxy-found');
  const meter = document.getElementById('galaxy-meter');
  const live = document.getElementById('galaxy-live');
  if (!root || !list || !body) return;

  const scanned = new Set();
  const slots = RINGS.flatMap((ring) =>
    ring.angles.map((angle) => ({ ...ring, angle }))
  );
  const maxCount = Math.max(...sectors.map((s) => s.projectCount));

  const buttons = sectors.map((sector, index) => {
    const slot = slots[index % slots.length];
    const radians = (slot.angle * Math.PI) / 180;
    const li = document.createElement('li');
    li.className = 'planet-slot';
    li.style.setProperty('--x', `${50 + Math.cos(radians) * slot.rx}%`);
    li.style.setProperty('--y', `${50 + Math.sin(radians) * slot.ry}%`);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'planet';
    button.dataset.sector = sector.id;
    button.setAttribute('aria-pressed', 'false');
    button.style.setProperty('--hue', String(HUES[index % HUES.length]));
    button.style.setProperty(
      '--size',
      String(0.55 + 0.45 * Math.sqrt(sector.projectCount / maxCount))
    );
    li.style.setProperty('--delay', `${index * -0.7}s`);

    const orb = document.createElement('span');
    orb.className = 'planet__orb';
    orb.setAttribute('aria-hidden', 'true');
    if (sector.projectCount >= 8) orb.classList.add('planet__orb--ringed');

    const label = document.createElement('span');
    label.className = 'planet__label';
    label.textContent = sector.title;

    const count = document.createElement('span');
    count.className = 'planet__count';
    count.textContent = String(sector.projectCount);
    const unit = document.createElement('span');
    unit.className = 'visually-hidden';
    unit.textContent = ` projects`;
    count.appendChild(unit);

    button.append(orb, label, count);
    li.appendChild(button);
    list.appendChild(li);
    return button;
  });

  function renderScan(sector, hue) {
    const fragment = document.createDocumentFragment();
    const title = document.createElement('p');
    title.className = 'galaxy__scan-title';
    title.textContent = sector.title;
    const stat = document.createElement('p');
    stat.className = 'galaxy__scan-stat';
    const number = document.createElement('span');
    number.textContent = String(sector.projectCount);
    stat.append(number, ' projects delivered with project teams');
    const desc = document.createElement('p');
    desc.className = 'galaxy__scan-desc';
    desc.textContent = sector.description;
    fragment.append(title, stat, desc);
    body.style.setProperty('--hue', String(hue));
    body.replaceChildren(fragment);
  }

  function scan(button) {
    const sector = sectors.find((s) => s.id === button.dataset.sector);
    if (!sector) return;
    const hue = button.style.getPropertyValue('--hue');

    /* Applied synchronously, not inside a view transition: the transition
       overlay would swallow rapid clicks on the next planets. The readout
       animates in with CSS instead. */
    buttons.forEach((b) =>
      b.setAttribute('aria-pressed', String(b === button))
    );
    button.dataset.scanned = 'true';
    renderScan(sector, hue);

    const isNew = !scanned.has(sector.id);
    scanned.add(sector.id);
    const logged = sectors
      .filter((s) => scanned.has(s.id))
      .reduce((sum, s) => sum + s.projectCount, 0);
    found.textContent = `${logged} / ${total} projects`;
    meter.style.setProperty('--progress', String(logged / total));
    live.textContent = `Scanned ${sector.title}: ${sector.projectCount} projects. ${logged} of ${total} projects discovered.`;
    onScan(sector.id, isNew);
    onProgress(scanned.size, logged);
  }

  list.addEventListener('click', (event) => {
    const button = event.target.closest('.planet');
    if (button) scan(button);
  });

  /* Arrow keys move between planets, like a level-select screen. */
  list.addEventListener('keydown', (event) => {
    const index = buttons.indexOf(document.activeElement);
    if (index === -1) return;
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[
      event.key
    ];
    if (!step) return;
    event.preventDefault();
    buttons[(index + step + buttons.length) % buttons.length].focus();
  });

  root.hidden = false;
}
