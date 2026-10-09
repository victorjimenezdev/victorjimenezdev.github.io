/* Interface tones synthesised with Web Audio: no files to download. Sound is
   off until the visitor turns it on, and the AudioContext is only created
   from that click, so browsers never block or warn about autoplay. */

const SOUND_KEY = 'interface-sound';

const TONES = {
  select: [
    [660, 0, 0.05],
    [990, 0.05, 0.07],
  ],
  scan: [
    [440, 0, 0.06],
    [554, 0.06, 0.06],
    [880, 0.12, 0.1],
  ],
  unlock: [
    [523, 0, 0.08],
    [659, 0.08, 0.08],
    [784, 0.16, 0.08],
    [1047, 0.24, 0.18],
  ],
  start: [
    [392, 0, 0.07],
    [523, 0.07, 0.07],
    [784, 0.14, 0.16],
  ],
};

export function createAudio() {
  let context = null;
  let enabled = false;

  try {
    enabled = localStorage.getItem(SOUND_KEY) === 'on';
  } catch {
    enabled = false;
  }

  function ensureContext() {
    if (context) return context;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    return context;
  }

  return {
    get enabled() {
      return enabled;
    },

    setEnabled(value) {
      enabled = value;
      try {
        localStorage.setItem(SOUND_KEY, value ? 'on' : 'off');
      } catch {
        /* storage blocked; the choice lasts for this page view */
      }
      if (value) ensureContext()?.resume();
    },

    play(name) {
      if (!enabled) return;
      const ctx = ensureContext();
      const notes = TONES[name];
      if (!ctx || !notes) return;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      for (const [frequency, offset, length] of notes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.07, now + offset + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + length);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + length + 0.02);
      }
    },
  };
}
