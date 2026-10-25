(() => {
  'use strict';

  // Flue — a column of smoke lifted by the curl of a scalar potential.
  // One fullscreen triangle, one fragment shader. The CPU only lerps the
  // pointer nodes, uploads uniforms and draws; every transformation happens
  // in GLSL. Colours come from the active viyoga theme.

  const canvas = document.getElementById('flue-canvas');
  if (!canvas) return;

  const gl = canvas.getContext('webgl2', {
    alpha: false, antialias: false, depth: false, stencil: false,
    powerPreference: 'high-performance'
  });
  if (!gl) return; // keep the CSS body gradient as the fallback

  const VERT = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

  const FRAG = `#version 300 es
precision highp float;
out vec4 fragColor;

uniform vec2  iResolution;
uniform float iTime;
uniform vec2  iMouse;          // aspect-corrected units, same space as uv — the body node
uniform vec2  iMouseVel;       // lead node minus body node — a velocity proxy
uniform vec2  iMouseWake;      // a third, much slower node — the tail of the trail

uniform vec3  uBgColor, uColorA, uColorB, uColorC, uColorD;
uniform float uScale, uSpeed, uFlow, uRoughness, uLacunarity;
uniform float uSmokeScale, uCurl, uCurlScale, uRise, uSlender;
uniform float uWidth, uSpread, uLean, uDensity;
uniform float uContrast, uMidpoint, uGlow, uSink;
uniform float uCoolFloor;
uniform float uCeiling;
uniform float uGrain, uDither, uVignette;
uniform float uPointerRadius, uDraft, uPointerStrength, uParallax;
#define OCTAVES 3
#define TRAIL_TAPS 6
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

/* A mix-based cell hash rather than the fract(sin()) one. sin() hashing is
   correlated along the diagonal, and a jittered grid seeded from it lays its
   cells out in faint rows the eye finds immediately. */
float hash1(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float snoise(vec2 p) {
  const float K1 = 0.366025404, K2 = 0.211324865;
  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  float m = step(a.y, a.x);
  vec2 o = vec2(m, 1.0 - m);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
  vec3 n = h * h * h * h * vec3(dot(a, hash2(i)), dot(b, hash2(i + o)), dot(c, hash2(i + 1.0)));
  return dot(n, vec3(70.0));
}

float fbm(vec2 p) {
  float v = 0.0, amp = 0.5;
  for (int i = 0; i < OCTAVES; i++) {
    v += amp * snoise(p);
    p *= uLacunarity;
    amp *= uRoughness;
  }
  return v;
}
/* The trail. The shader has no memory, so the tail is reconstructed from three
   pointer nodes: TRAIL_TAPS gaussians strung along the segment between the slow
   wake node and the body node, weighted toward the head. A resting cursor puts
   every tap in the same place and the result is one clean gaussian; a moving one
   stretches them into a tapered ribbon that melts away from the back as the wake
   catches up. No branch, no jump, and the same falloff at every point along it. */
float trail(vec2 uv, float radius) {
  /* The sample point is wobbled by a slow field first. A gaussian is a perfect
     circle, and a perfect circle parked under a resting cursor is the one thing
     that reads as drawn rather than felt; warping the coordinate by a fraction
     of the radius makes the touch an organic patch that breathes, for two noise
     taps and nothing else. */
  vec2 wob = vec2(snoise(uv * 1.7 + vec2(0.0, iTime * 0.05)),
                  snoise(uv * 1.7 + vec2(4.3, -iTime * 0.04)));
  uv += wob * radius * 0.18;
  float a = 0.0, wsum = 0.0;
  float r2 = max(1e-4, radius * radius);
  for (int i = 0; i < TRAIL_TAPS; i++) {
    float k = float(i) / float(TRAIL_TAPS - 1);
    vec2 c = mix(iMouseWake, iMouse, k);
    vec2 dd = uv - c;
    float w = mix(0.30, 1.0, k);
    a += w * exp(-dot(dd, dd) / r2);
    wsum += w;
  }
  return a / wsum;
}
/* The curl of a scalar potential — the cheapest divergence-free flow there is.
   Rotating the gradient of a noise field by ninety degrees gives a velocity field
   that can never pile up on itself, which is exactly what a plain domain warp
   gets wrong: a warp bunches smoke into knots, a curl folds it. Two octaves of
   potential, four taps for the two derivatives — eight noise evaluations for a
   flow field that behaves. */
float potential(vec2 p) {
  return snoise(p) + 0.5 * snoise(p * 2.03 + vec2(3.7, -1.9));
}

vec2 curl(vec2 p, float e) {
  float nx1 = potential(p + vec2(0.0, e));
  float nx2 = potential(p - vec2(0.0, e));
  float ny1 = potential(p + vec2(e, 0.0));
  float ny2 = potential(p - vec2(e, 0.0));
  return vec2(nx1 - nx2, ny2 - ny1) / (2.0 * e);
}

vec3 ramp4(float t) {
  vec3 c = mix(uColorA, uColorB, smoothstep(0.00, 0.36, t));
  c = mix(c, uColorC, smoothstep(0.32, 0.70, t));
  c = mix(c, uColorD, smoothstep(0.66, 1.00, t));
  return c;
}

// triangular-PDF dither — the only reliable cure for 8-bit gradient banding
float triDither(vec2 fc) {
  float a = fract(sin(dot(fc, vec2(12.9898, 78.233))) * 43758.5453);
  float b = fract(sin(dot(fc + 17.0, vec2(12.9898, 78.233))) * 43758.5453);
  return (a + b - 1.0) / 255.0;
}

// ---- house grain. ONE look across the collection: an integer hash (no sin() streaks),
// triangular so it reads as film rather than static, weighted into the midtones so it
// never crusts a black or a white. Static by default; uGrainAnim re-seeds it 24×/s.
uniform float uGrainAnim;
float houseGrain(vec2 fc) {
  uvec2 q = uvec2(fc) * uvec2(1597334677u, 3812015801u)
          + uint(floor(iTime * 24.0 * uGrainAnim)) * 2654435769u;
  uint n = q.x ^ q.y; n = n * 1664525u + 1013904223u; n ^= n >> 16u; n *= 2246822519u; n ^= n >> 13u;
  float a = float(n & 0xffffu) / 65535.0;
  n *= 3266489917u; n ^= n >> 16u;
  float b = float(n & 0xffffu) / 65535.0;
  return a + b - 1.0;
}
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution) / iResolution.y;
  float t = iTime * uSpeed;

  float tr = trail(uv, uPointerRadius);

  vec2 p = (uv - iMouse * uParallax) * uScale;

  // the column rises: the whole field is sampled in a frame that slides down past
  // it, so the smoke climbs without the frame ever moving
  vec2 sp = p + vec2(0.0, -t * uRise);

  // the flow that carries it, plus the draught the hand puts into the room. The
  // hand's travel is added to the VELOCITY field rather than to the coordinate,
  // so it folds the smoke the way a real draught does instead of sliding a patch
  // of it sideways — and it keeps blowing for a beat after the hand stops,
  // because the wake node behind the trail is still catching up
  vec2 c = curl(sp * uCurlScale + vec2(0.0, t * uFlow), 0.14) * uCurl;
  c += iMouseVel * uDraft * tr;

  // the smoke itself, stretched vertically: a column is taller than it is wide
  vec2 mp = vec2(sp.x, sp.y * uSlender) * uSmokeScale + c;
  float dens = fbm(mp) * 0.5 + 0.5;

  // the corridor the column climbs, leaning toward the pointer and widening as it
  // goes — the lean is weighted by height, so the base stays put and the top
  // swings, which is how a plume answers a draught
  float h = uv.y + 0.55;
  float lean = iMouse.x * uLean * clamp(h, 0.0, 1.6);
  float width = max(0.06, uWidth * (0.45 + uSpread * clamp(h, 0.0, 1.8)));
  float xr = (uv.x - lean) / width;
  float corridor = exp(-xr * xr);

  // and it thins as it cools on the way up
  float cool = smoothstep(-0.65, 0.85, uv.y);
  // Phones breathe the floor up until the plume fills the frame. Left alone
  // that can wash the entire screen; hold a band of cool air along the top
  // so the lit area tops out around four fifths of the height. Desktop keeps
  // the uniform floor it always had (uCeiling is 0 there).
  float ceiling = smoothstep(0.30, 0.50, uv.y) * uCeiling;
  float floorTop = mix(uCoolFloor, 0.30, ceiling);
  float smoke = dens * corridor * mix(1.0, floorTop, cool) * uDensity;

  // and the stirred air carries a little more of it — an exposure lift, not a
  // shape, so there is nothing following the cursor to point at
  float f = clamp((smoke - uMidpoint) * uContrast + 0.5 + tr * uPointerStrength * 0.30, 0.0, 1.0);

  vec3 col = ramp4(f);
  col += uColorD * uGlow * pow(f, 4.0);
  col = mix(uBgColor, col, smoothstep(0.0, max(0.01, uSink), f) * 0.90 + 0.10);
  col *= 1.0 - uVignette * dot(uv, uv);
  { float hgL = clamp(dot(col, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
    col += houseGrain(gl_FragCoord.xy) * uGrain * mix(1.0, 4.0 * hgL * (1.0 - hgL), 0.6); }
  col += triDither(gl_FragCoord.xy) * uDither;

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  }

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  gl.bindVertexArray(gl.createVertexArray());

  const LOC = {};
  const loc = n => (n in LOC ? LOC[n] : (LOC[n] = gl.getUniformLocation(program, n)));
  const u1f = (n, v) => gl.uniform1f(loc(n), v);
  const u2f = (n, x, y) => gl.uniform2f(loc(n), x, y);
  const u3c = (n, c) => gl.uniform3f(loc(n), c[0], c[1], c[2]);

  // Shipped Flue settings. Colours are the only thing viyoga overrides.
  const SETTINGS = {
    scale: 0.2, speed: 0.33, flow: 0.02, roughness: 0.47,
    lacunarity: 2.75, smokeScale: 3.06, curl: 0.57, curlScale: 1.46,
    rise: 0.05, slender: 1.57, width: 1.55, spread: 2.05, lean: 0.62,
    density: 1.4, contrast: 1.85, midpoint: 0.69, glow: 0.48,
    sink: 0.42, grain: 0, grainAnim: 0, dither: 0.43, vignette: 0.15,
    cursor: 1, pointerRadius: 0.38, draft: 4.5, pointerStrength: 0.73,
    parallax: 0.007, coolFloor: 0.30, maxDpr: 1
  };

  /* ── theme palette ─────────────────────────────────────────────────────
     The shader's ramp is walked perceptually; only its five stops change.
     A/B come from the secondary accent (the hue), C is that hue lightened
     toward the foreground, D is the foreground warmed by the primary
     accent. Everything stays inside the active theme. */
  const colorCtx = document.createElement('canvas').getContext('2d');
  function parseColor(v) {
    if (!v) return null;
    colorCtx.fillStyle = '#000000';
    colorCtx.fillStyle = v;
    const out = colorCtx.fillStyle;
    if (out.charAt(0) === '#') {
      return [parseInt(out.slice(1, 3), 16), parseInt(out.slice(3, 5), 16), parseInt(out.slice(5, 7), 16)];
    }
    const m = out.match(/rgba?\(([^)]+)\)/);
    if (m) { const p = m[1].split(',').map(Number); return [p[0], p[1], p[2]]; }
    return null;
  }
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const norm = c => c.map(v => v / 255);

  function themePalette() {
    const cs = getComputedStyle(document.documentElement);
    const get = (n, fb) => parseColor(cs.getPropertyValue(n).trim()) || fb;
    const bg = get('--bg', [10, 10, 12]);
    const core = get('--bg-core', bg);
    const acc = get('--accent', [255, 180, 84]);
    const acc2 = get('--accent-2', acc);
    const fg = get('--fg', [242, 227, 204]);
    return {
      bgColor: norm(mix(core, bg, 0.35)),
      colorA: norm(mix(bg, acc2, 0.32)),
      colorB: norm(mix(bg, acc2, 0.75)),
      colorC: norm(mix(acc2, fg, 0.50)),
      colorD: norm(mix(fg, acc, 0.15))
    };
  }

  function applyColors() {
    const p = themePalette();
    gl.useProgram(program);
    u3c('uBgColor', p.bgColor);
    u3c('uColorA', p.colorA);
    u3c('uColorB', p.colorB);
    u3c('uColorC', p.colorC);
    u3c('uColorD', p.colorD);
  }

  function applyConfig() {
    gl.useProgram(program);
    applyColors();
    for (const k in SETTINGS) {
      if (k === 'maxDpr') continue;
      u1f('u' + k.charAt(0).toUpperCase() + k.slice(1), SETTINGS[k]);
    }
    // Mobile only: hold the top fifth of the frame below the light.
    u1f('uCeiling', coarsePointer ? 1 : 0);
    resize();
  }

  let dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, SETTINGS.maxDpr);
    // Measure the canvas box, not the window. On a phone the URL bar
    // collapsing changes innerHeight mid-scroll; backing the canvas with the
    // window made every one of those ticks reallocate the drawing buffer and
    // drop a frame (the "the gradient freezes when I scroll" hitch). The
    // element is 100vh, which is stable, so the buffer stays put.
    const cw = canvas.clientWidth || innerWidth;
    const ch = canvas.clientHeight || innerHeight;
    const w = Math.max(1, Math.round(cw * dpr));
    const h = Math.max(1, Math.round(ch * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    gl.useProgram(program);
    u2f('iResolution', w, h);
    if (staticMode) drawStatic();
  }

  let resizeQueued = false;
  addEventListener('resize', () => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => { resizeQueued = false; resize(); });
  }, { passive: true });

  /* ── pointer ────────────────────────────────────────────────────────── */
  const mouse = { x: 0, y: 0, ax: 0, ay: 0, wx: 0, wy: 0, tx: 0, ty: 0 };
  const aim = e => {
    const a = innerWidth / innerHeight;
    mouse.tx = (e.clientX / innerWidth - 0.5) * a;
    mouse.ty = 0.5 - e.clientY / innerHeight;
  };

  const mq = window.matchMedia ? window.matchMedia.bind(window) : null;
  // Reduced motion is the only reason to freeze the field. Touch devices keep
  // the full animation — they simply never aim it, because a finger on glass
  // is not a cursor and dragging the smoke around under your thumb feels
  // broken. So motion and pointer are two separate decisions.
  const staticMode = !mq || mq('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = !!mq && mq('(hover: none), (pointer: coarse)').matches;
  const pointerOn = !staticMode && !coarsePointer;

  // Nothing steers the field on a phone, so its own drift is the only motion
  // on screen. Ease it back a touch: still alive, no longer a metronome.
  if (coarsePointer) SETTINGS.speed = 0.28;

  if (pointerOn) {
    addEventListener('pointermove', aim, { passive: true });
    addEventListener('pointerdown', aim, { passive: true });
  }

  function drawStatic() {
    gl.useProgram(program);
    u1f('iTime', 0);
    u2f('iMouse', 0, -9999);
    u2f('iMouseVel', 0, 0);
    u2f('iMouseWake', 0, -9999);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /* ── render loop ────────────────────────────────────────────────────── */
  let prevT = performance.now(), clock = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const raw = now - prevT;
    prevT = now;
    if (document.hidden) return;
    // Clamped interval drives both the shader clock and every spring:
    // an alt-tab costs a pause, never a lurch.
    const ms = raw > 50 ? 50 : raw < 4.167 ? 4.167 : raw;
    const s = ms > 36.7 ? 2.2 : ms * 0.06;
    clock += ms * 0.001;

    u1f('iTime', clock);
    if (coarsePointer) {
      // Phones only ever see the warm base of the column: at the top the
      // cooling term multiplies density down to uCoolFloor, which sits below
      // uMidpoint, so that band is mathematically incapable of lighting up.
      // Breathe the floor over 72 seconds so the frame fills and recedes
      // instead of leaving the upper bands permanently black. The shader's
      // uCeiling keeps the last fifth of the height cool at the peak.
      u1f('uCoolFloor', 0.30 + 0.45 * (0.5 - 0.5 * Math.cos(clock * Math.PI / 36)));
    }
    if (pointerOn) {
      const kLead = 0.105 * s, kBody = 0.043 * s, kWake = 0.017 * s;
      mouse.ax += (mouse.tx - mouse.ax) * kLead;
      mouse.ay += (mouse.ty - mouse.ay) * kLead;
      mouse.x += (mouse.ax - mouse.x) * kBody;
      mouse.y += (mouse.ay - mouse.y) * kBody;
      mouse.wx += (mouse.x - mouse.wx) * kWake;
      mouse.wy += (mouse.y - mouse.wy) * kWake;

      if (!SETTINGS.cursor) {
        if (mouse.rest === undefined) mouse.rest = { x: mouse.tx, y: mouse.ty };
        mouse.tx = mouse.rest.x;
        mouse.ty = mouse.rest.y;
      }
      u2f('iMouse', mouse.x, mouse.y);
      u2f('iMouseVel', mouse.ax - mouse.x, mouse.ay - mouse.y);
      u2f('iMouseWake', mouse.wx, mouse.wy);
    } else {
      // No pointer to aim with: park the nodes outside the field so the
      // shader's pointer term contributes nothing and time alone drives it.
      u2f('iMouse', 0, -9999);
      u2f('iMouseVel', 0, 0);
      u2f('iMouseWake', 0, -9999);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  applyConfig();

  if (staticMode) {
    drawStatic();
    document.documentElement.classList.add('flue-live');
    document.addEventListener('themechange', () => { applyColors(); drawStatic(); });
  } else {
    // Warm frame: start from the resting state the loop will settle into.
    u1f('iTime', 0);
    u2f('iMouse', 0, pointerOn ? 0 : -9999);
    u2f('iMouseVel', 0, 0);
    u2f('iMouseWake', 0, pointerOn ? 0 : -9999);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    document.documentElement.classList.add('flue-live');
    document.addEventListener('themechange', applyColors);
    requestAnimationFrame(frame);
  }
})();
