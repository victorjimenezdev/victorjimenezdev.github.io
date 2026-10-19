/* A single full-viewport fragment shader paints the whole backdrop: warm wash,
   three parallax star layers, warp streaks and the ringed hero planet. One
   draw call per frame, no textures, no dependencies. The planet's position
   and size come from a DOM placeholder, so CSS owns the layout and the shader
   only follows it. */

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;

uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;
uniform vec3 uPlanet;
uniform float uScroll;
uniform float uLight;
uniform float uWarp;
uniform float uPhosphor;

// Palette source colours (sRGB): cream paper, navy ink, deep navy, orange.
const vec3 CREAM = vec3(0.965, 0.949, 0.906);
const vec3 NAVY = vec3(0.106, 0.188, 0.294);
const vec3 NAVY_DEEP = vec3(0.051, 0.102, 0.176);
const vec3 ORANGE = vec3(0.910, 0.482, 0.157);

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

vec3 stars(vec2 uv, float density, float size, float seed) {
  vec2 cell = floor(uv * density);
  vec2 local = fract(uv * density) - 0.5;
  float h = hash(cell + seed);
  if (h < 0.86) return vec3(0.0);
  vec2 offset = vec2(hash(cell + seed + 1.3), hash(cell + seed + 7.1)) - 0.5;
  vec2 d = local - offset * 0.7;
  // Warp stretches each star along the travel axis.
  d.y /= 1.0 + uWarp * 14.0;
  float distance = length(d);
  if (distance >= size) return vec3(0.0);
  float twinkle = 0.65 + 0.35 * sin(uTime * (1.0 + h * 3.0) + h * 40.0);
  float glow = (1.0 - smoothstep(0.0, size, distance)) * twinkle;
  vec3 tint = mix(CREAM, mix(CREAM, ORANGE, 0.4), hash(cell + seed + 3.7));
  return tint * glow * (h - 0.86) * 7.0;
}

vec3 burntShadow(vec3 c) {
  return mix(c, NAVY_DEEP, 0.45);
}

vec3 planetSurface(vec3 n, float t) {
  // Spin around the planet's tilted axis.
  float lon = atan(n.x, n.z) + t * 0.06;
  float lat = n.y;
  vec2 q = vec2(lon * 1.6, lat * 3.2);
  float bands = fbm(vec2(lat * 7.0, lon * 0.4) + fbm(q * 1.5) * 1.6);
  float storms = smoothstep(0.62, 0.8, fbm(q * 3.0 + 4.0));
  // Warm poster planet: burnt orange belts, orange body, cream cloud bands,
  // and a few navy storms as the only cool accent.
  vec3 burnt = mix(ORANGE, NAVY_DEEP, 0.32);
  vec3 col = mix(burnt, ORANGE, smoothstep(0.25, 0.55, bands));
  col = mix(col, CREAM, smoothstep(0.58, 0.82, bands) * 0.8);
  col = mix(col, NAVY, storms * 0.55);
  return col;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / uRes.y;
  float t = uTime;

  // Backdrop gradient for each theme: flat cream paper, or warm navy.
  vec3 darkTop = NAVY;
  vec3 darkBottom = mix(NAVY, NAVY_DEEP, 0.6);
  float vy = frag.y / uRes.y;
  vec3 col = mix(mix(darkBottom, darkTop, vy), CREAM, uLight);

  // A broad apricot wash keeps the paper warm without full-screen noise.
  vec2 wash = frag / uRes - vec2(0.75, 0.65) - uPointer * 0.015;
  float warmth = max(0.0, 1.0 - dot(wash, wash) * 2.0);
  col = mix(col, mix(CREAM, ORANGE, 0.12), warmth * 0.16 * uLight);
  col = mix(col, mix(NAVY, ORANGE, 0.12), warmth * 0.22 * (1.0 - uLight));

  // Three star layers, nearer ones move more with scroll and pointer.
  if (uLight < 0.999) {
    vec2 drift = vec2(0.0, uScroll / uRes.y);
    vec3 s = vec3(0.0);
    s += stars(uv + drift * 0.08 + uPointer * 0.004, 34.0, 0.09, 1.0);
    s += stars(uv + drift * 0.18 + uPointer * 0.01, 18.0, 0.11, 17.0) * 1.2;
    s += stars(uv + drift * 0.34 + uPointer * 0.02, 9.0, 0.13, 43.0) * 1.5;
    col += s * (1.0 - uLight);
  }

  // Planet. uPlanet.xy is the centre in canvas pixels, uPlanet.z the radius.
  // Every edge below uses analytic coverage over one canvas pixel, so the rim
  // and ring borders stay crisp without stair steps at any size.
  vec2 d = frag - uPlanet.xy;
  float r = uPlanet.z;
  if (r > 1.0) {
    float tilt = 0.32;
    float ca = cos(-0.42);
    float sa = sin(-0.42);
    vec2 rd = vec2(ca * d.x - sa * d.y, sa * d.x + ca * d.y);
    float ringR = length(vec2(rd.x, rd.y / tilt)) / r;
    // Size of one pixel in ringR units (analytic gradient of the ellipse).
    float pw = length(vec2(rd.x, rd.y / (tilt * tilt))) / (r * r * max(ringR, 1e-3));
    float ringBand = smoothstep(1.40 - pw, 1.40 + pw, ringR)
      * (1.0 - smoothstep(2.18 - pw, 2.18 + pw, ringR));
    // Fade fine grooves where they would be thinner than a pixel.
    float fine = 1.0 - smoothstep(0.02, 0.07, pw);
    float grooves = 0.5 + 0.5 * sin(ringR * 42.0) * sin(ringR * 13.0 + 1.0);
    float ringTex = mix(0.78, 0.45 + 0.55 * grooves, fine);
    float gapW = max(0.022, pw);
    float gap = 1.0 - smoothstep(gapW - pw, gapW + pw, abs(ringR - 1.78));
    // Deliberate colour bands: cream inner ring, orange body, navy outer lip
    // and a navy Cassini gap.
    vec3 apricot = mix(CREAM, ORANGE, 0.3);
    vec3 ringCol = mix(apricot, ORANGE, smoothstep(1.5, 1.95, ringR));
    ringCol = mix(ringCol, NAVY, smoothstep(2.04, 2.16, ringR) * 0.5);
    // Shade toward burnt orange, never toward grey.
    float shade = smoothstep(-0.3, 0.7, rd.x / r);
    ringCol = mix(mix(ringCol, mix(ORANGE, NAVY_DEEP, 0.35), 0.4), ringCol, shade);
    vec3 ringLit = mix(ringCol, NAVY, gap * 0.85);
    float ring = ringBand * ringTex * (0.86 + 0.14 * uLight);

    float dist = length(d) / r;
    float px = 1.0 / r;
    // Planet coverage and the front half of the ring, both pixel-smooth.
    float disc = clamp((1.0 - dist) / px + 0.5, 0.0, 1.0);
    float front = smoothstep(-0.75, 0.75, -rd.y);

    // Ring segment behind the planet first.
    col = mix(col, ringLit, ring * (1.0 - front));

    // Atmosphere halo, a soft warm breath outside the rim.
    float halo = exp(-max(dist - 1.0, 0.0) * 10.0) * (1.0 - disc);
    vec3 haloCol = mix(ORANGE, mix(ORANGE, CREAM, 0.4), uLight);
    col = mix(col, haloCol, halo * (0.38 - uLight * 0.14));

    if (disc > 0.0) {
      float dd = min(dist, 1.0);
      vec3 n = vec3(d / max(length(d), 1e-4) * dd, sqrt(max(1.0 - dd * dd, 0.0)));
      vec3 lightDir = normalize(vec3(-0.55 + uPointer.x * 0.7, 0.45 + uPointer.y * 0.5, 0.75));
      float diffuse = clamp(dot(n, lightDir), 0.0, 1.0);
      vec3 surface = planetSurface(n, t);
      // Shadows fall to navy, not to black.
      vec3 night = mix(NAVY, burntShadow(surface), 0.5);
      vec3 lit = mix(night, surface * 1.04, smoothstep(0.0, 0.75, diffuse));
      float rim = pow(1.0 - n.z, 3.0);
      lit = mix(lit, CREAM, rim * 0.35);
      float spec = pow(clamp(dot(reflect(-lightDir, n), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 24.0);
      lit += CREAM * spec * 0.18;
      // Ring shadow band across the disc.
      float shadow = smoothstep(0.05, 0.0, abs(rd.y / r + 0.08 * rd.x / r)) * 0.3;
      lit = mix(lit, NAVY, shadow);
      col = mix(col, lit, disc);
    }

    col = mix(col, ringLit, ring * front);
  }

  // Vignette in the dark theme only; on paper it would read as grime.
  vec2 vc = frag / uRes - 0.5;
  col *= 1.0 - dot(vc, vc) * 0.45 * (1.0 - uLight);

  if (uPhosphor > 0.5) {
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = ORANGE * lum * 1.3;
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile failed: ${log}`);
  }
  return shader;
}

function createProgram(gl) {
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Shader link failed: ${gl.getProgramInfoLog(program)}`);
  }
  return program;
}

/**
 * Starts the sky renderer.
 * @param {object} options
 * @param {HTMLCanvasElement} options.canvas
 * @param {HTMLElement | null} options.planet Placeholder the planet tracks.
 * @param {() => boolean} options.isLight
 * @param {() => boolean} options.isPhosphor
 * @param {() => boolean} options.reducedMotion
 * @returns {{ warp: () => void, refresh: () => void } | null}
 */
export function startSky({
  canvas,
  planet,
  isLight,
  isPhosphor,
  reducedMotion,
}) {
  const gl = canvas.getContext('webgl', {
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
    preserveDrawingBuffer: false,
  });
  if (!gl) return null;

  let program;
  try {
    program = createProgram(gl);
  } catch (error) {
    console.warn('Sky shader unavailable', error);
    return null;
  }

  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW
  );
  const aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uniform = (name) => gl.getUniformLocation(program, name);
  const u = {
    res: uniform('uRes'),
    time: uniform('uTime'),
    pointer: uniform('uPointer'),
    planet: uniform('uPlanet'),
    scroll: uniform('uScroll'),
    light: uniform('uLight'),
    warp: uniform('uWarp'),
    phosphor: uniform('uPhosphor'),
  };

  const state = {
    scale: 1,
    pointer: [0, 0],
    pointerTarget: [0, 0],
    light: isLight() ? 1 : 0,
    warp: 0,
    warpTarget: 0,
    dirty: true,
    heroVisible: true,
    lastFrame: 0,
    start: performance.now(),
    frozenTime: 12,
  };

  /* Render at device resolution so the planet rim and rings stay sharp, but
     never below CSS resolution and never above a fixed pixel budget, which
     bounds fill cost on large dense screens. */
  const MAX_PIXELS = 5_200_000;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const css = Math.max(1, innerWidth * innerHeight);
    state.scale = Math.max(1, Math.min(dpr, Math.sqrt(MAX_PIXELS / css)));
    canvas.width = Math.max(1, Math.round(innerWidth * state.scale));
    canvas.height = Math.max(1, Math.round(innerHeight * state.scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    state.dirty = true;
  }

  function planetUniform() {
    if (!planet) return [0, 0, 0];
    const rect = planet.getBoundingClientRect();
    if (rect.bottom < -rect.height || rect.width === 0) return [0, 0, 0];
    const cx = (rect.left + rect.width / 2) * state.scale;
    const cy = (innerHeight - (rect.top + rect.height / 2)) * state.scale;
    return [cx, cy, (rect.width / 2) * 0.62 * state.scale];
  }

  function draw(now) {
    const motion = !reducedMotion();
    const time = motion ? (now - state.start) / 1000 : state.frozenTime;
    const ease = motion ? 0.06 : 1;
    state.pointer[0] += (state.pointerTarget[0] - state.pointer[0]) * ease;
    state.pointer[1] += (state.pointerTarget[1] - state.pointer[1]) * ease;
    state.light += ((isLight() ? 1 : 0) - state.light) * (motion ? 0.08 : 1);
    state.warp += (state.warpTarget - state.warp) * 0.12;
    state.warpTarget *= 0.92;

    gl.uniform2f(u.res, canvas.width, canvas.height);
    gl.uniform1f(u.time, time);
    // Pointer parallax is motion too, so reduced motion keeps the scene still.
    gl.uniform2f(
      u.pointer,
      motion ? state.pointer[0] : 0,
      motion ? state.pointer[1] : 0
    );
    gl.uniform3f(u.planet, ...planetUniform());
    gl.uniform1f(u.scroll, scrollY * state.scale);
    gl.uniform1f(u.light, state.light);
    gl.uniform1f(u.warp, motion ? state.warp : 0);
    gl.uniform1f(u.phosphor, isPhosphor() ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    state.dirty = false;
  }

  /* Full frame rate while the hero is on screen, a gentle 20 fps twinkle
     further down, and only on demand under reduced motion or a hidden tab. */
  function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    const motion = !reducedMotion();
    const interval = state.heroVisible ? 0 : 50;
    if (!motion && !state.dirty) return;
    if (motion && now - state.lastFrame < interval && !state.dirty) return;
    state.lastFrame = now;
    draw(now);
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener(
    'scroll',
    () => {
      state.dirty = true;
    },
    { passive: true }
  );
  window.addEventListener(
    'pointermove',
    (event) => {
      state.pointerTarget = [
        (event.clientX / innerWidth) * 2 - 1,
        1 - (event.clientY / innerHeight) * 2,
      ];
      state.dirty = true;
    },
    { passive: true }
  );

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    canvas.dataset.lost = 'true';
  });

  if (planet && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      state.heroVisible = entry.isIntersecting;
    }).observe(planet);
  }

  requestAnimationFrame(loop);
  canvas.dataset.ready = 'true';

  return {
    warp() {
      if (!reducedMotion()) state.warpTarget = 1;
    },
    refresh() {
      state.dirty = true;
    },
  };
}
