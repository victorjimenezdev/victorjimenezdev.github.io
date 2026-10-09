/* The final sequence. A modal dialog (native focus trap and Escape) runs a
   short particle animation: sparks fly in from the edges and assemble the
   VJ emblem, the sky warps, and the "game complete" card resolves. Reduced
   motion skips straight to the finished card. */

const HUES = [290, 200, 330, 45, 160];

function sampleEmblem(width, height) {
  const size = Math.min(width, height) * 0.42;
  const off = document.createElement('canvas');
  off.width = Math.round(size * 1.6);
  off.height = Math.round(size);
  const ctx = off.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(size * 0.82)}px "Space Grotesk Variable", system-ui, sans-serif`;
  ctx.fillText('VJ', off.width / 2, off.height / 2);
  const { data } = ctx.getImageData(0, 0, off.width, off.height);
  const step = Math.max(4, Math.round(size / 52));
  const points = [];
  for (let y = 0; y < off.height; y += step) {
    for (let x = 0; x < off.width; x += step) {
      if (data[(y * off.width + x) * 4 + 3] > 128) {
        points.push({
          x: x + (width - off.width) / 2,
          y: y + (height - off.height) / 2 - height * 0.18,
        });
      }
    }
  }
  return points;
}

/**
 * @param {object} options
 * @param {HTMLButtonElement} options.launch
 * @param {{ warp: () => void } | null} options.sky
 * @param {(name: string) => void} options.sound
 * @param {() => void} options.onComplete
 */
export function setupBoss({ launch, sky, sound, onComplete }) {
  const dialog = document.getElementById('boss');
  const canvas = document.getElementById('boss-canvas');
  const card = document.getElementById('boss-card');
  const skip = document.getElementById('boss-skip');
  if (!launch || !dialog?.showModal || !canvas || !card) return;

  const ctx = canvas.getContext('2d');
  let frameId = 0;

  function stop() {
    cancelAnimationFrame(frameId);
    frameId = 0;
  }

  function reveal() {
    dialog.dataset.phase = 'complete';
    onComplete();
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      card.animate(
        [
          {
            transform: 'translateY(2rem) scale(0.92)',
            clipPath: 'inset(40% 0 40% 0 round 1.5rem)',
          },
          { transform: 'none', clipPath: 'inset(0 0 0 0 round 1.5rem)' },
        ],
        { duration: 700, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
      );
    }
    card.querySelector('.boss__title').focus({ preventScroll: true });
  }

  function run() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = innerWidth;
    const height = innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const targets = sampleEmblem(width, height);
    const particles = targets.map((target, index) => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.hypot(width, height) * (0.55 + Math.random() * 0.3);
      return {
        sx: width / 2 + Math.cos(angle) * radius,
        sy: height / 2 + Math.sin(angle) * radius,
        tx: target.x,
        ty: target.y,
        delay: Math.random() * 500,
        hue: HUES[index % HUES.length],
        seed: Math.random() * Math.PI * 2,
      };
    });

    const start = performance.now();
    let warped = false;
    let revealed = false;
    const ease = (t) => 1 - Math.pow(1 - t, 4);

    const frame = (now) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of particles) {
        const t = Math.min(Math.max((elapsed - p.delay) / 1300, 0), 1);
        const k = ease(t);
        const wobble = t === 1 ? Math.sin(now / 400 + p.seed) * 1.2 : 0;
        const x = p.sx + (p.tx - p.sx) * k + wobble;
        const y = p.sy + (p.ty - p.sy) * k + wobble;
        ctx.fillStyle = `hsl(${p.hue} 95% ${55 + 25 * k}% / ${0.35 + 0.65 * k})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.2 + k * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      // A shockwave ring when the emblem locks in.
      if (elapsed > 1700 && elapsed < 2600) {
        const r = (elapsed - 1700) * 1.6;
        ctx.strokeStyle = `hsl(200 95% 70% / ${1 - (elapsed - 1700) / 900})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(width / 2, height * 0.32, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      if (!warped && elapsed > 1700) {
        warped = true;
        sky?.warp();
        sound('unlock');
      }
      if (!revealed && elapsed > 2000) {
        revealed = true;
        reveal();
      }
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);
  }

  launch.hidden = false;
  launch.addEventListener('click', () => {
    dialog.dataset.phase = 'running';
    dialog.showModal();
    sound('start');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      reveal();
    } else {
      run();
    }
  });

  skip.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target.closest('[data-boss-close]')) dialog.close();
  });
  dialog.addEventListener('close', () => {
    stop();
    // Skipping still counts: the visitor reached the final screen.
    if (dialog.dataset.phase === 'running') onComplete();
    delete dialog.dataset.phase;
    launch.focus({ preventScroll: true });
  });
}
