/* Achievements reward exploring the page. They live only in this browser's
   localStorage, and the page works the same when storage is blocked. */

const STORE_KEY = 'achievements';

export const ACHIEVEMENTS = [
  {
    id: 'start',
    title: 'Press start',
    hint: 'Start the tour from the title screen.',
  },
  {
    id: 'loadout',
    title: 'Full loadout',
    hint: 'Inspect the skill tree.',
  },
  {
    id: 'campaign',
    title: 'Campaign log',
    hint: 'Read both career chapters.',
  },
  {
    id: 'first-contact',
    title: 'First contact',
    hint: 'Scan your first sector on the galaxy map.',
  },
  {
    id: 'cartographer',
    title: 'Cartographer',
    hint: 'Scan all 11 sectors and log 60 projects.',
  },
  {
    id: 'explorer',
    title: 'Explorer',
    hint: 'Reach the multiplayer stage.',
  },
  {
    id: 'shift-change',
    title: 'Shift change',
    hint: 'Switch between day and night.',
  },
  {
    id: 'recruiter',
    title: 'Dossier secured',
    hint: 'Download the CV.',
  },
  {
    id: 'old-school',
    title: 'Old school',
    hint: 'Up, up, down, down, left, right, left, right, B, A.',
  },
];

function readUnlocked() {
  try {
    const value = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    return new Set(
      Array.isArray(value)
        ? value.filter((id) => ACHIEVEMENTS.some((a) => a.id === id))
        : []
    );
  } catch {
    return new Set();
  }
}

function writeUnlocked(unlocked) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify([...unlocked]));
  } catch {
    /* storage blocked; progress lasts for this page view */
  }
}

/**
 * @param {object} options
 * @param {HTMLElement} options.list
 * @param {HTMLElement} options.count
 * @param {HTMLElement} options.score
 * @param {(title: string, detail: string, tone?: string) => void} options.toast
 * @param {(name: string) => void} options.sound
 */
export function createAchievements({ list, count, score, toast, sound }) {
  const unlocked = readUnlocked();

  function render() {
    count.textContent = String(unlocked.size);
    score.textContent = `${unlocked.size} of ${ACHIEVEMENTS.length} unlocked`;
    list.replaceChildren(
      ...ACHIEVEMENTS.map((achievement) => {
        const done = unlocked.has(achievement.id);
        const li = document.createElement('li');
        li.className = 'trophy';
        li.dataset.unlocked = String(done);
        const title = document.createElement('p');
        title.className = 'trophy__title';
        title.textContent = achievement.title;
        const state = document.createElement('span');
        state.className = 'visually-hidden';
        state.textContent = done ? ' (unlocked)' : ' (locked)';
        title.appendChild(state);
        const hint = document.createElement('p');
        hint.className = 'trophy__hint';
        hint.textContent = achievement.hint;
        li.append(title, hint);
        return li;
      })
    );
  }

  render();

  return {
    has: (id) => unlocked.has(id),
    unlock(id) {
      const achievement = ACHIEVEMENTS.find((a) => a.id === id);
      if (!achievement || unlocked.has(id)) return;
      unlocked.add(id);
      writeUnlocked(unlocked);
      render();
      sound('unlock');
      toast(
        `Achievement unlocked: ${achievement.title}`,
        `${unlocked.size} of ${ACHIEVEMENTS.length}`,
        'trophy'
      );
    },
  };
}
