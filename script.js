/* ==========================================================================
   REACT BITS GOOEYNAV & PORTFOLIO INTERACTION CONTROLLER
   ========================================================================== */

(function () {
  'use strict';

  // 1. Theme Toggle Management (Plain Solid Crystal Black & White Themes)
  const THEME_STORAGE_KEY = 'portfolio-theme-preference';
  const htmlRoot = document.documentElement;
  const themeToggleBtn = document.getElementById('theme-toggle');

  function getPreferredTheme() {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme) {
      return storedTheme;
    }
    const userPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return userPrefersDark ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    htmlRoot.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    
    const isDark = theme === 'dark';
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.setAttribute('aria-label', isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme');
      btn.setAttribute('title', isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme');
    });
    
    // Refresh GooeyNav palette if engine exists
    if (window.__gooeyNavEngine) {
      window.__gooeyNavEngine.setTheme(theme);
    }

    // Refresh DotField palette if engine exists
    if (window.__dotFieldEngine) {
      window.__dotFieldEngine.setTheme(theme);
    }

    // Refresh ProfileCard theme if engine exists
    if (window.__profileCardEngine) {
      window.__profileCardEngine.setTheme(theme);
    }
  }

  const initialTheme = getPreferredTheme();
  applyTheme(initialTheme);

  // Attach click listener to all theme toggle buttons across desktop & mobile
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const currentTheme = htmlRoot.getAttribute('data-theme') || 'dark';
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
    });
  });

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(THEME_STORAGE_KEY)) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  // 2. React Bits GooeyNav WebGL2 Engine & Physics Simulation
  function initGooeyNav() {
    const stage = document.getElementById('gooey-stage');
    const canvas = document.getElementById('gooey-canvas');
    const list = document.getElementById('gooey-list');
    const overlay = document.getElementById('gooey-overlay');
    const fallback = document.getElementById('gooey-fallback');

    if (!stage || !canvas || !list || !overlay || !fallback) return;

    const MAX_DROPS = 32;
    const MAX_PILLS = 4;
    const MARGIN = 72;

    const VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

    const FRAGMENT = `#version 300 es
precision highp float;

uniform vec2 uSize;
uniform float uRatio;
uniform vec4 uPills[${MAX_PILLS}];
uniform vec4 uHover;
uniform vec4 uDrops[${MAX_DROPS}];
uniform vec2 uTails[${MAX_DROPS}];
uniform vec3 uTints[${MAX_DROPS}];
uniform int uCount;
uniform float uSmooth;
uniform vec3 uPill;
uniform vec4 uHoverColor;
uniform float uShadow;

out vec4 outColor;

float sdPill(vec2 p, vec4 box) {
  vec2 extent = max(box.zw, vec2(0.0));
  float r = min(extent.x, extent.y);
  vec2 q = abs(p - box.xy) - extent + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

vec4 blend(vec4 a, vec4 b, float k) {
  float h = clamp(0.5 + 0.5 * (b.w - a.w) / k, 0.0, 1.0);
  return vec4(mix(b.rgb, a.rgb, h), mix(b.w, a.w, h) - k * h * (1.0 - h));
}

vec4 field(vec2 p) {
  vec4 shape = vec4(uPill, 1e5);
  for (int i = 0; i < ${MAX_PILLS}; i++) {
    vec4 pill = uPills[i];
    if (pill.z <= 0.0) continue;
    shape = blend(shape, vec4(uPill, sdPill(p, pill)), uSmooth);
  }
  for (int i = 0; i < ${MAX_DROPS}; i++) {
    if (i >= uCount) break;
    vec4 drop = uDrops[i];
    if (drop.z <= 0.0) continue;
    float d = sdCapsule(p, drop.xy, drop.xy - uTails[i], drop.z);
    if (d > shape.w + uSmooth) continue;
    shape = blend(shape, vec4(uTints[i], d), uSmooth);
  }
  return shape;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uRatio - gl_FragCoord.y) / uRatio;
  vec4 shape = field(p);
  float d = shape.w;
  float aa = max(fwidth(d), 0.35);
  float body = clamp(0.5 - d / aa, 0.0, 1.0);

  vec2 grad = vec2(dFdx(d), -dFdy(d));
  vec2 n = length(grad) > 0.0001 ? normalize(grad) : vec2(0.0, 1.0);
  float rim = (1.0 - smoothstep(0.0, 1.6, -d)) * max(0.0, -n.y) * 0.3;
  vec3 fill = mix(shape.rgb, vec3(1.0), rim) * (1.0 - 0.06 * max(0.0, n.y) * (1.0 - smoothstep(0.0, 6.0, -d)));

  float lifted = field(p - vec2(0.0, 3.0)).w;
  float shadow = (1.0 - smoothstep(-3.0, 9.0, lifted)) * uShadow * (1.0 - body);

  float hover = clamp(0.5 - sdPill(p, uHover) / aa, 0.0, 1.0) * uHoverColor.a;

  vec4 color = vec4(0.0, 0.0, 0.0, shadow);
  color = vec4(uHoverColor.rgb * hover, hover) + color * (1.0 - hover);
  color = vec4(fill * body, body) + color * (1.0 - body);
  outColor = color;
}
`;

    const parse = value => {
      const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(value).trim());
      if (match) {
        const hex = match[1].length === 3 ? match[1].replace(/./g, digit => digit + digit) : match[1];
        return [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16) / 255).concat(1);
      }
      const rgba = /rgba?\(([^)]+)\)/i.exec(String(value));
      if (rgba) {
        const parts = rgba[1].split(',').map(part => parseFloat(part));
        return [parts[0] / 255, parts[1] / 255, parts[2] / 255, parts[3] ?? 1];
      }
      return [0.22, 0.74, 0.97, 1]; // fallback #38BDF8
    };

    const clamp01 = value => Math.min(1, Math.max(0, value));

    const travelEase = t => {
      const x = clamp01(t);
      return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
    };

    const bezier = (a, b, c, d, t) => {
      const u = 1 - t;
      return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
    };

    const pillPath = (x, y, w, h) => {
      if (w <= 0.5 || h <= 0.5) return '';
      const r = Math.min(w, h) / 2;
      return `M${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h - r}A${r},${r} 0 0 1 ${x + w - r},${y + h}H${x + r}A${r},${r} 0 0 1 ${x},${y + h - r}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}Z`;
    };

    const compile = (gl, type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };

    const UNIFORMS = [
      'uSize',
      'uRatio',
      'uPills',
      'uHover',
      'uDrops',
      'uTails',
      'uTints',
      'uCount',
      'uSmooth',
      'uPill',
      'uHoverColor',
      'uShadow'
    ];

    const build = gl => {
      const program = gl.createProgram();
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program);
        return null;
      }
      const uniforms = Object.fromEntries(UNIFORMS.map(name => [name, gl.getUniformLocation(program, name)]));
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      return { program, uniforms, buffer, position: gl.getAttribLocation(program, 'aPosition') };
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let gl = null;
    let pipeline = null;

    try {
      gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
      if (gl) pipeline = build(gl);
    } catch (e) {
      gl = null;
    }

    fallback.style.display = pipeline ? 'none' : 'block';
    canvas.style.display = pipeline ? 'block' : 'none';

    let currentTheme = htmlRoot.getAttribute('data-theme') || 'dark';
    let pillColor = currentTheme === 'light' ? '#09090b' : '#ffffff';
    let pillRgb = parse(pillColor);
    let hoverRgb = parse(currentTheme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)');

    let settings = {
      animationTime: 600,
      particleCount: 16,
      timeVariance: 300,
      spread: 56,
      gooeyness: 0.5,
      wobble: 0.5,
      hoverEffect: true,
      pillRgb,
      tints: [],
      hoverRgb,
      shadow: 0.4
    };

    const view = { width: 0, height: 0 };
    let rects = [];
    let target = 0;
    const pills = new Map();
    const drops = [];
    const hover = { x: 0, y: 0, w: 0, h: 0, alpha: 0, index: -1 };
    const pillData = new Float32Array(MAX_PILLS * 4);
    const dropData = new Float32Array(MAX_DROPS * 4);
    const tailData = new Float32Array(MAX_DROPS * 2);
    const tintData = new Float32Array(MAX_DROPS * 3);
    let raf = 0;
    let last = 0;

    const measure = () => {
      const box = stage.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      view.width = box.width;
      view.height = box.height;
      const outerWidth = box.width + MARGIN * 2;
      const outerHeight = box.height + MARGIN * 2;
      Object.assign(canvas.style, {
        left: `${-MARGIN}px`,
        top: `${-MARGIN}px`,
        width: `${outerWidth}px`,
        height: `${outerHeight}px`
      });
      const width = Math.max(1, Math.round(outerWidth * ratio));
      const height = Math.max(1, Math.round(outerHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      rects = Array.from(list.children).map(item => {
        const rect = item.getBoundingClientRect();
        return { x: rect.left - box.left, y: rect.top - box.top, w: rect.width, h: rect.height };
      });
    };

    const trace = (boxes, blobs, smooth) => {
      const field = (x, y) => {
        let d = 1e5;
        const merge = value => {
          const h = clamp01(0.5 + (0.5 * (value - d)) / smooth);
          d = value + (d - value) * h - smooth * h * (1 - h);
        };
        for (const box of boxes) {
          const r = Math.min(box.hw, box.hh);
          const qx = Math.abs(x - box.cx) - box.hw + r;
          const qy = Math.abs(y - box.cy) - box.hh + r;
          merge(Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r);
        }
        for (const blob of blobs) {
          const px = x - blob.x;
          const py = y - blob.y;
          const bx = -blob.tx;
          const by = -blob.ty;
          const span = bx * bx + by * by;
          const h = span > 0.0001 ? clamp01((px * bx + py * by) / span) : 0;
          const value = Math.hypot(px - bx * h, py - by * h) - blob.r;
          if (value > d + smooth) continue;
          merge(value);
        }
        return d;
      };
      const step = 2;
      const parts = [];
      for (let y = 0; y < view.height; y += 1) {
        const cy = y + 0.5;
        let previous = field(0, cy);
        let start = previous < 0 ? 0 : null;
        for (let x = step; x <= view.width + step; x += step) {
          const value = field(Math.min(x, view.width), cy);
          if (previous < 0 !== value < 0) {
            const cross = x - step + (step * previous) / (previous - value);
            if (value < 0) start = cross;
            else if (start !== null) {
              parts.push(`M${start.toFixed(1)},${y}H${cross.toFixed(1)}V${y + 1}H${start.toFixed(1)}Z`);
              start = null;
            }
          }
          previous = value;
        }
        if (start !== null) parts.push(`M${start.toFixed(1)},${y}H${view.width}V${y + 1}H${start.toFixed(1)}Z`);
      }
      return parts.join('');
    };

    const pill = index => {
      if (!pills.has(index)) pills.set(index, { mass: 0, scale: 0, velocity: 0, outgoing: 0 });
      return pills.get(index);
    };

    const shape = (index, amount) => {
      const rect = rects[index];
      if (!rect || amount <= 0.002) return null;
      const h = rect.h * Math.min(1.08, 0.42 + 0.58 * Math.sqrt(Math.max(0, amount)));
      const w = Math.max(h, rect.w * Math.max(0, amount) ** 0.75);
      return { x: rect.x + rect.w / 2 - w / 2, y: rect.y + rect.h / 2 - h / 2, w, h };
    };

    const plan = (drop, index, now, fresh) => {
      const rect = rects[index];
      if (!rect) return;
      const reach = Math.max(0, settings.spread);
      const ex = rect.x + rect.w / 2 + (Math.random() - 0.5) * rect.w * 0.45;
      const ey = rect.y + rect.h / 2 + (Math.random() - 0.5) * rect.h * 0.2;
      const base = Math.max(0.15, settings.animationTime / 1000);
      const variance = (Math.random() - 0.5) * (Math.max(0, settings.timeVariance) / 1000);
      const duration = Math.max(0.15, base * (0.62 + Math.random() * 0.32) + variance * 0.6);
      const out = Math.random() * Math.PI * 2;
      const into = Math.random() * Math.PI * 2;
      const burst = reach * (0.7 + Math.random() * 0.6);
      const swing = reach * (0.55 + Math.random() * 0.55);
      const carry = Math.min(duration / 3, 0.12);
      drop.index = index;
      drop.start = now;
      drop.duration = duration;
      drop.path = [
        drop.x,
        drop.y,
        fresh ? drop.x + Math.cos(out) * burst * 1.6 : drop.x + drop.vx * carry,
        fresh ? drop.y + Math.sin(out) * burst * 1.6 : drop.y + drop.vy * carry,
        ex + Math.cos(into) * swing * 1.5,
        ey + Math.sin(into) * swing * 1.5,
        ex,
        ey
      ];
    };

    const emit = (from, to, now) => {
      const source = pills.get(from);
      const rect = rects[from];
      if (!source || !rect || !rects[to]) return;
      const available = source.mass - source.outgoing;
      if (available <= 0.002) return;
      const room = MAX_DROPS - drops.length;
      const count = Math.min(room, Math.max(1, Math.round(Math.max(1, settings.particleCount) * available)));
      if (count <= 0) return;
      const win = Math.max(0.15, settings.animationTime / 1000) * 0.16;
      for (let i = 0; i < count; i++) {
        const mass = available / count;
        source.outgoing += mass;
        drops.push({
          x: rect.x + rect.w / 2 + (Math.random() - 0.5) * rect.w * 0.6,
          y: rect.y + rect.h / 2 + (Math.random() - 0.5) * rect.h * 0.3,
          vx: 0,
          vy: 0,
          mass,
          size: 0.8 + Math.random() * 0.4,
          given: 0,
          source: from,
          index: to,
          leave: now + Math.random() * win * 1000,
          emerged: 0,
          absorbed: 0,
          state: 'waiting',
          tint: null
        });
      }
    };

    const render = () => {
      const height = rects[target]?.h ?? rects[0]?.h ?? 36;
      const smooth = height * (0.18 + 0.5 * clamp01(settings.gooeyness));
      const boxes = [];
      const blobs = [];
      for (const [index, state] of pills) {
        const box = shape(index, state.scale);
        if (box) boxes.push({ cx: box.x + box.w / 2, cy: box.y + box.h / 2, hw: box.w / 2, hh: box.h / 2 });
      }
      for (const drop of drops) {
        if (drop.state === 'waiting') continue;
        const radius = 0.26 * height * drop.size * Math.min(drop.emerged, 1 - drop.absorbed);
        if (radius <= 0.05) continue;
        const speed = Math.hypot(drop.vx, drop.vy);
        const length = Math.min(radius * 1.1, speed * 0.018);
        blobs.push({
          x: drop.x,
          y: drop.y,
          r: radius,
          tx: speed > 0.01 ? (drop.vx / speed) * length : 0,
          ty: speed > 0.01 ? (drop.vy / speed) * length : 0,
          tint: drop.tint
        });
      }

      const settledPill = boxes.length === 1 && !blobs.length;
      let pathStr = '';
      if (settledPill && boxes[0]) {
        const box = boxes[0];
        pathStr = pillPath(box.cx - box.hw, box.cy - box.hh, box.hw * 2, box.hh * 2);
      } else {
        pathStr = trace(boxes, blobs, smooth) || '';
      }

      if (pathStr) {
        const clipVal = `path('${pathStr}')`;
        overlay.style.clipPath = clipVal;
        overlay.style.webkitClipPath = clipVal;
        overlay.style.visibility = 'visible';
      } else {
        overlay.style.visibility = 'hidden';
      }

      if (!pipeline || !gl) {
        const box = shape(target, 1);
        if (box) {
          fallback.style.transform = `translate(${box.x.toFixed(2)}px, ${box.y.toFixed(2)}px)`;
          fallback.style.width = `${box.w}px`;
          fallback.style.height = `${box.h}px`;
        }
        fallback.style.opacity = box ? '1' : '0';
        return;
      }

      let slot = 0;
      for (const box of boxes) {
        if (slot >= MAX_PILLS) break;
        pillData[slot * 4] = box.cx + MARGIN;
        pillData[slot * 4 + 1] = box.cy + MARGIN;
        pillData[slot * 4 + 2] = box.hw;
        pillData[slot * 4 + 3] = box.hh;
        slot += 1;
      }
      pillData.fill(0, slot * 4);
      let count = 0;
      for (const blob of blobs) {
        if (count >= MAX_DROPS) break;
        dropData[count * 4] = blob.x + MARGIN;
        dropData[count * 4 + 1] = blob.y + MARGIN;
        dropData[count * 4 + 2] = blob.r;
        dropData[count * 4 + 3] = 0;
        tailData[count * 2] = blob.tx;
        tailData[count * 2 + 1] = blob.ty;
        const tint = blob.tint || settings.pillRgb;
        tintData[count * 3] = tint[0];
        tintData[count * 3 + 1] = tint[1];
        tintData[count * 3 + 2] = tint[2];
        count += 1;
      }

      const { program, uniforms, buffer, position } = pipeline;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(uniforms.uSize, view.width + MARGIN * 2, view.height + MARGIN * 2);
      gl.uniform1f(uniforms.uRatio, canvas.width / Math.max(1, view.width + MARGIN * 2));
      gl.uniform4fv(uniforms.uPills, pillData);
      gl.uniform4f(uniforms.uHover, hover.x + MARGIN, hover.y + MARGIN, hover.w / 2, hover.h / 2);
      gl.uniform4fv(uniforms.uDrops, dropData);
      gl.uniform2fv(uniforms.uTails, tailData);
      gl.uniform3fv(uniforms.uTints, tintData);
      gl.uniform1i(uniforms.uCount, count);
      gl.uniform1f(uniforms.uSmooth, smooth);
      gl.uniform3f(uniforms.uPill, settings.pillRgb[0], settings.pillRgb[1], settings.pillRgb[2]);
      gl.uniform4f(uniforms.uHoverColor, settings.hoverRgb[0], settings.hoverRgb[1], settings.hoverRgb[2], settings.hoverRgb[3] * hover.alpha);
      gl.uniform1f(uniforms.uShadow, settings.shadow);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const frameLoop = now => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      const emergeTime = 0.09;
      const absorbTime = 0.12;

      for (let i = drops.length - 1; i >= 0; i--) {
        const drop = drops[i];
        if (drop.state === 'waiting') {
          if (now < drop.leave) continue;
          drop.state = 'flying';
          plan(drop, drop.index, now, true);
        }
        if (drop.state === 'flying') {
          drop.emerged = Math.min(1, drop.emerged + dt / emergeTime);
          const source = pills.get(drop.source);
          if (source && drop.given < drop.mass) {
            const step = Math.min(drop.mass * (dt / emergeTime), drop.mass - drop.given);
            source.mass = Math.max(0, source.mass - step);
            source.outgoing = Math.max(0, source.outgoing - step);
            drop.given += step;
          }
          const t = clamp01((now - drop.start) / 1000 / drop.duration);
          const eased = travelEase(t);
          const [x0, y0, x1, y1, x2, y2, x3, y3] = drop.path;
          const x = bezier(x0, x1, x2, x3, eased);
          const y = bezier(y0, y1, y2, y3, eased);
          if (dt > 0) {
            drop.vx = (x - drop.x) / dt;
            drop.vy = (y - drop.y) / dt;
          }
          drop.x = x;
          drop.y = y;
          if (t >= 1) drop.state = 'absorbing';
        }
        if (drop.state === 'absorbing') {
          const step = Math.min(1 - drop.absorbed, dt / absorbTime);
          drop.absorbed += step;
          drop.vx *= 0.8;
          drop.vy *= 0.8;
          const host = pill(drop.index);
          host.mass = Math.min(1, host.mass + drop.mass * step);
          if (drop.absorbed >= 1) drops.splice(i, 1);
        }
      }

      const zeta = reduced ? 1 : 1 - 0.72 * clamp01(settings.wobble);
      const omega = 26;
      const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
      const h = dt / steps;
      for (const [index, state] of pills) {
        for (let n = 0; n < steps; n++) {
          state.velocity += (omega * omega * (state.mass - state.scale) - 2 * zeta * omega * state.velocity) * h;
          state.scale += state.velocity * h;
        }
        if (index !== target && state.mass <= 0.002 && state.outgoing <= 0.002 && Math.abs(state.scale) < 0.004) {
          pills.delete(index);
        }
      }

      if (hover.index >= 0 && rects[hover.index]) {
        const rect = rects[hover.index];
        const k = 1 - Math.exp(-dt / 0.06);
        hover.x += (rect.x + rect.w / 2 - hover.x) * k;
        hover.y += (rect.y + rect.h / 2 - hover.y) * k;
        hover.w += (rect.w - hover.w) * k;
        hover.h += (rect.h - hover.h) * k;
      }
      const hoverGoal = settings.hoverEffect && hover.index >= 0 && hover.index !== target ? 1 : 0;
      hover.alpha += (hoverGoal - hover.alpha) * (1 - Math.exp(-dt / 0.08));

      render();

      const host = pills.get(target);
      const resting =
        drops.length === 0 &&
        pills.size === 1 &&
        host &&
        Math.abs(host.mass - host.scale) < 0.0008 &&
        Math.abs(host.velocity) < 0.004;
      const hoverRect = rects[hover.index];
      const hovering =
        Math.abs(hoverGoal - hover.alpha) > 0.003 ||
        (hoverRect && Math.abs(hoverRect.x + hoverRect.w / 2 - hover.x) + Math.abs(hoverRect.w - hover.w) > 0.1);
      if (!resting || hovering) raf = requestAnimationFrame(frameLoop);
      else {
        host.mass = 1;
        host.scale = 1;
        host.velocity = 0;
        hover.alpha = hoverGoal;
        render();
      }
    };

    const wake = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frameLoop);
    };

    const settle = index => {
      pills.clear();
      drops.length = 0;
      target = index;
      const state = pill(index);
      state.mass = 1;
      state.scale = 1;
      state.velocity = 0;
      render();
    };

    const go = (index, animate) => {
      if (index === target) return;
      if (!rects[index] || !animate || reduced || target < 0) {
        settle(index);
        return;
      }
      const now = performance.now();
      target = index;
      pill(index);
      for (const drop of drops) {
        drop.index = index;
        if (drop.state === 'flying') plan(drop, index, now, false);
        if (drop.state === 'absorbing') {
          drop.state = 'flying';
          drop.mass *= 1 - drop.absorbed;
          drop.absorbed = 0;
          plan(drop, index, now, false);
        }
      }
      for (const from of [...pills.keys()]) {
        if (from !== index) emit(from, index, now);
      }
      
      // Update data-active attribute
      Array.from(list.children).forEach((li, idx) => {
        if (idx === index) {
          li.setAttribute('data-active', '');
        } else {
          li.removeAttribute('data-active');
        }
      });

      wake();
    };

    // Item click & hover listeners
    Array.from(list.children).forEach((item, index) => {
      item.addEventListener('click', () => {
        go(index, true);
      });
      item.addEventListener('pointerenter', () => {
        const rect = rects[index];
        if (!rect) return;
        if (hover.alpha < 0.01) {
          hover.x = rect.x + rect.w / 2;
          hover.y = rect.y + rect.h / 2;
          hover.w = rect.w;
          hover.h = rect.h;
        }
        hover.index = index;
        wake();
      });
    });

    list.addEventListener('pointerleave', () => {
      hover.index = -1;
      wake();
    });

    const resizeObserver = new ResizeObserver(() => {
      measure();
      if (!drops.length) settle(target);
      else render();
    });
    resizeObserver.observe(stage);
    resizeObserver.observe(list);

    measure();
    settle(0);

    document.fonts?.ready.then(() => {
      measure();
      if (!drops.length) settle(target);
    });

    window.__gooeyNavEngine = {
      go: index => go(index, true),
      setTheme: theme => {
        currentTheme = theme;
        pillColor = theme === 'light' ? '#09090b' : '#ffffff';
        settings.pillRgb = parse(pillColor);
        settings.hoverRgb = parse(theme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)');
        const navEl = stage.closest('.gooey-nav');
        if (navEl) {
          navEl.style.setProperty('--gn-pill', pillColor);
          navEl.style.setProperty('--gn-active-ink', theme === 'light' ? '#ffffff' : '#000000');
          navEl.style.setProperty('--gn-ink', theme === 'light' ? '#09090b' : '#ffffff');
          navEl.style.setProperty('--gn-muted', theme === 'light' ? '#18181b' : 'rgba(255,255,255,0.72)');
          navEl.style.setProperty('--gn-frame', theme === 'light' ? 'rgba(255, 255, 255, 0.98)' : 'rgba(14, 14, 18, 0.72)');
          navEl.style.setProperty('--gn-frame-edge', theme === 'light' ? 'rgba(0, 0, 0, 0.16)' : 'rgba(255, 255, 255, 0.12)');
        }
        render();
        wake();
      }
    };

    // Apply active theme to GooeyNav engine immediately upon initialization
    window.__gooeyNavEngine.setTheme(htmlRoot.getAttribute('data-theme') || 'dark');

    // Smoothly activate Home tab when clicking Nitin.VR brand
    const brandLink = document.getElementById('gooey-brand');
    if (brandLink) {
      brandLink.addEventListener('click', () => {
        go(0, true);
      });
    }
  }

  // 3. Scrollspy Connection for GooeyNav & Mobile Sidebar (Sync with page sections)
  function initScrollspy() {
    const sectionIds = ['home', 'about', 'projects', 'skills', 'experience', 'contact'];
    const sectionElements = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

    function onScroll() {
      const scrollPosition = window.scrollY + 180;
      let activeIndex = 0;

      sectionElements.forEach((section, index) => {
        if (section.offsetTop <= scrollPosition) {
          activeIndex = index;
        }
      });

      if (window.__gooeyNavEngine) {
        window.__gooeyNavEngine.go(activeIndex);
      }

      // Sync active state on responsive mobile sidebar
      const mobileLinks = document.querySelectorAll('.mobile-sidebar__link');
      mobileLinks.forEach((link, index) => {
        if (index === activeIndex) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // 3b. Responsive Mobile Sidebar Controller (Phone Alone)
  function initMobileNav() {
    const toggleBtn = document.getElementById('mobile-nav-toggle');
    const closeBtn = document.getElementById('mobile-sidebar-close');
    const sidebar = document.getElementById('mobile-sidebar');
    const backdrop = document.getElementById('mobile-sidebar-backdrop');
    const mobileLinks = document.querySelectorAll('.mobile-sidebar__link');
    const brandLink = document.getElementById('mobile-sidebar-brand');

    if (!sidebar || !toggleBtn) return;

    function openSidebar() {
      sidebar.classList.add('is-open');
      if (backdrop) backdrop.classList.add('is-open');
      toggleBtn.classList.add('is-active');
      toggleBtn.setAttribute('aria-expanded', 'true');
      sidebar.setAttribute('aria-hidden', 'false');
      document.body.classList.add('mobile-nav-open');
    }

    function closeSidebar() {
      sidebar.classList.remove('is-open');
      if (backdrop) backdrop.classList.remove('is-open');
      toggleBtn.classList.remove('is-active');
      toggleBtn.setAttribute('aria-expanded', 'false');
      sidebar.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('mobile-nav-open');
    }

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = sidebar.classList.contains('is-open');
      if (isOpen) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', closeSidebar);
    }

    if (backdrop) {
      backdrop.addEventListener('click', closeSidebar);
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar.classList.contains('is-open')) {
        closeSidebar();
      }
    });

    // Close sidebar on link click & smooth scroll to target
    const navMapping = {
      '#home': 0,
      '#about': 1,
      '#projects': 2,
      '#skills': 3,
      '#experience': 4,
      '#contact': 5
    };

    function handleLinkClick(e, link) {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        const targetEl = document.querySelector(href);
        if (targetEl) {
          e.preventDefault();
          closeSidebar();
          
          setTimeout(() => {
            targetEl.scrollIntoView({ behavior: 'smooth' });
            history.pushState(null, '', href);
            if (window.__gooeyNavEngine && navMapping[href] !== undefined) {
              window.__gooeyNavEngine.go(navMapping[href]);
            }
          }, 120);
        }
      }
    }

    mobileLinks.forEach(link => {
      link.addEventListener('click', (e) => handleLinkClick(e, link));
    });

    if (brandLink) {
      brandLink.addEventListener('click', (e) => handleLinkClick(e, brandLink));
    }

    const ctaBtn = document.querySelector('.mobile-sidebar__cta-btn');
    if (ctaBtn) {
      ctaBtn.addEventListener('click', (e) => handleLinkClick(e, ctaBtn));
    }

    // Auto-close if screen is resized wider than 768px (phone breakpoint)
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && sidebar.classList.contains('is-open')) {
        closeSidebar();
      }
    });
  }

  // 4. Dynamic Crystal Glass Specular Spotlight (Card Hover Effect)
  function initGlassSpotlight() {
    const glassCards = document.querySelectorAll('.glass-panel');
    glassCards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
    });
  }

  // 5. Toast Notification Helper
  const toast = document.getElementById('toast');
  let toastTimer = null;

  function showToast(message) {
    if (!toast) return;
    toast.querySelector('.toast-text').textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  // 6. Crystal Black Liquid Glass Contact & Enquiry Form Controller
  // ==========================================================================
  // CONFIGURATION: Set your deployed Google Apps Script Web App URL below
  // Example: 'https://script.google.com/macros/s/AKfycbx.../exec'
  // You can also set it directly on <form id="contact-form" action="..."> in index.html
  // ==========================================================================
  const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwXd-nZH4nXIh46DeM-gjVrJpZwKHGRdV3lFuZriJWq2DWgvOVTC-qtcyjBASEXCNmt/exec';

  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const submitBtn = document.getElementById('form-submit-btn');
    const statusBanner = document.getElementById('form-status-banner');
    const timestampInput = document.getElementById('contact-form-timestamp');
    const honeypotInput = document.getElementById('contact-hp-website');

    // Field configuration mappings
    const fields = {
      name: {
        input: document.getElementById('field-name'),
        error: document.getElementById('name-error'),
        counter: document.getElementById('name-counter'),
        group: document.getElementById('group-name'),
        max: 100,
        min: 2
      },
      email: {
        input: document.getElementById('field-email'),
        error: document.getElementById('email-error'),
        counter: document.getElementById('email-counter'),
        group: document.getElementById('group-email'),
        max: 254,
        min: 5
      },
      subject: {
        input: document.getElementById('field-subject'),
        error: document.getElementById('subject-error'),
        counter: document.getElementById('subject-counter'),
        group: document.getElementById('group-subject'),
        max: 200,
        min: 5
      },
      description: {
        input: document.getElementById('field-description'),
        error: document.getElementById('description-error'),
        counter: document.getElementById('description-counter'),
        group: document.getElementById('group-description'),
        max: 5000,
        min: 10
      }
    };

    // Track form load timestamp for anti-bot speed analysis
    const formLoadTime = Date.now();
    if (timestampInput) {
      timestampInput.value = formLoadTime.toString();
    }

    let isSubmitting = false;

    // Helper: update character counters
    function updateCounter(fieldKey) {
      const field = fields[fieldKey];
      if (!field || !field.counter || !field.input) return;
      const count = field.input.value.length;
      const max = field.max;
      field.counter.textContent = `${count.toLocaleString()} / ${max.toLocaleString()}`;

      if (count >= max) {
        field.counter.classList.add('counter-limit');
        field.counter.classList.remove('counter-warning');
      } else if (count >= max * 0.9) {
        field.counter.classList.add('counter-warning');
        field.counter.classList.remove('counter-limit');
      } else {
        field.counter.classList.remove('counter-warning', 'counter-limit');
      }
    }

    // Helper: set inline error
    function setFieldError(fieldKey, message) {
      const field = fields[fieldKey];
      if (!field) return;

      if (field.error) {
        field.error.textContent = message;
        field.error.classList.add('active');
      }
      if (field.group) {
        field.group.classList.add('has-error');
      }
      if (field.input) {
        field.input.setAttribute('aria-invalid', 'true');
      }
    }

    // Helper: clear inline error
    function clearFieldError(fieldKey) {
      const field = fields[fieldKey];
      if (!field) return;

      if (field.error) {
        field.error.textContent = '';
        field.error.classList.remove('active');
      }
      if (field.group) {
        field.group.classList.remove('has-error');
      }
      if (field.input) {
        field.input.setAttribute('aria-invalid', 'false');
      }
    }

    // Helper: show status announcement banner
    function showBanner(type, message) {
      if (!statusBanner) return;
      statusBanner.className = `form-status-banner banner-${type}`;
      statusBanner.removeAttribute('hidden');
      statusBanner.innerHTML = `
        <span class="banner-icon">${type === 'success' ? '✓' : type === 'info' ? 'ℹ' : '⚠'}</span>
        <span class="banner-text">${message}</span>
      `;
      statusBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Helper: hide banner
    function hideBanner() {
      if (!statusBanner) return;
      statusBanner.setAttribute('hidden', '');
      statusBanner.innerHTML = '';
      statusBanner.className = 'form-status-banner';
    }

    // Field-level single validation logic
    function validateField(fieldKey) {
      const field = fields[fieldKey];
      if (!field || !field.input) return true;

      const rawVal = field.input.value;
      const val = rawVal.trim();

      if (fieldKey === 'name') {
        if (!val) {
          setFieldError('name', 'Please enter your name.');
          return false;
        }
        if (val.length < 2) {
          setFieldError('name', 'Name must be at least 2 characters.');
          return false;
        }
        if (rawVal.length > 100) {
          setFieldError('name', 'Name cannot exceed 100 characters.');
          return false;
        }
      }

      if (fieldKey === 'email') {
        if (!val) {
          setFieldError('email', 'Please enter your email address.');
          return false;
        }
        if (rawVal.length > 254) {
          setFieldError('email', 'Email ID cannot exceed 254 characters.');
          return false;
        }
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
        if (!emailRegex.test(val)) {
          setFieldError('email', 'Please enter a valid email format (e.g., name@domain.com).');
          return false;
        }
      }

      if (fieldKey === 'subject') {
        if (!val) {
          setFieldError('subject', 'Please enter a subject or enquiry topic.');
          return false;
        }
        if (val.length < 5) {
          setFieldError('subject', 'Subject must be at least 5 characters.');
          return false;
        }
        if (rawVal.length > 200) {
          setFieldError('subject', 'Subject cannot exceed 200 characters.');
          return false;
        }
      }

      if (fieldKey === 'description') {
        if (!val) {
          setFieldError('description', 'Please provide project or role details in the description.');
          return false;
        }
        if (val.length < 10) {
          setFieldError('description', 'Description must be at least 10 characters.');
          return false;
        }
        if (rawVal.length > 5000) {
          setFieldError('description', 'Description cannot exceed 5,000 characters.');
          return false;
        }
      }

      clearFieldError(fieldKey);
      return true;
    }

    // Attach input & blur listeners for all fields
    Object.keys(fields).forEach((key) => {
      const field = fields[key];
      if (!field.input) return;

      // Initialize counter
      updateCounter(key);

      // On input: update counter, and revalidate/clear error if input is fixed
      field.input.addEventListener('input', () => {
        updateCounter(key);
        if (field.group && field.group.classList.contains('has-error')) {
          validateField(key);
        }
      });

      // On blur: validate field
      field.input.addEventListener('blur', () => {
        validateField(key);
      });
    });

    // Form submission event
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (isSubmitting) return;

      hideBanner();

      // 1. Validate all fields
      let firstInvalid = null;
      let isFormValid = true;

      ['name', 'email', 'subject', 'description'].forEach((key) => {
        const valid = validateField(key);
        if (!valid) {
          isFormValid = false;
          if (!firstInvalid && fields[key].input) {
            firstInvalid = fields[key].input;
          }
        }
      });

      if (!isFormValid) {
        if (firstInvalid) {
          firstInvalid.focus();
        }
        return;
      }

      // 2. Anti-Spam: Honeypot check
      if (honeypotInput && honeypotInput.value.trim().length > 0) {
        console.warn('Honeypot trap triggered. Rejecting automated submission.');
        showBanner('error', 'Anti-spam check failed. Submission rejected.');
        return;
      }

      // 3. Anti-Spam: Time threshold check (must take at least 1.5 seconds)
      const elapsedMs = Date.now() - formLoadTime;
      if (elapsedMs < 1500) {
        showBanner('error', 'Submission happened unusually fast. Please review your details and submit again.');
        return;
      }

      // 4. Resolve and check Apps Script endpoint
      const endpointUrl = (
        (form.getAttribute('action') && form.getAttribute('action').trim()) ||
        (typeof GOOGLE_APPS_SCRIPT_URL === 'string' && GOOGLE_APPS_SCRIPT_URL.trim()) ||
        (typeof window.GOOGLE_APPS_SCRIPT_URL === 'string' && window.GOOGLE_APPS_SCRIPT_URL.trim()) ||
        ''
      );
      const hasEndpoint = endpointUrl.length > 0 && endpointUrl.startsWith('https://script.google.com/');

      // Normalize inputs
      const normalizedName = fields.name.input.value.trim().replace(/\s+/g, ' ');
      const normalizedEmail = fields.email.input.value.trim().toLowerCase();
      const normalizedSubject = fields.subject.input.value.trim().replace(/\s+/g, ' ');
      const normalizedDescription = fields.description.input.value.trim();

      // Pack payload as URLSearchParams for 100% compatibility with Google Apps Script e.parameter
      const params = new URLSearchParams();
      params.append('name', normalizedName);
      params.append('email', normalizedEmail);
      params.append('subject', normalizedSubject);
      params.append('description', normalizedDescription);
      params.append('_hp_website', honeypotInput ? honeypotInput.value : '');
      params.append('timestamp', new Date().toISOString());
      params.append('userAgent', navigator.userAgent || 'Unknown');

      // Set Submitting UI state
      isSubmitting = true;
      submitBtn.disabled = true;
      submitBtn.setAttribute('aria-busy', 'true');
      submitBtn.classList.add('is-loading');

      try {
        if (!hasEndpoint) {
          // Helpful instruction banner if URL not configured yet
          await new Promise((r) => setTimeout(r, 650));
          showBanner(
            'info',
            'Configuration Needed: Please set your deployed Google Apps Script Web App URL in script.js (GOOGLE_APPS_SCRIPT_URL) or in index.html (action="..."). Your entered information has been preserved.'
          );
          return;
        }

        // Send to Google Apps Script Web App
        let response;
        let responseText = '';
        try {
          response = await fetch(endpointUrl, {
            method: 'POST',
            mode: 'cors',
            redirect: 'follow',
            body: params
          });
        } catch (fetchErr) {
          // If browser CORS restrictions prevent reading the 302 redirect, fallback to no-cors mode
          console.warn('Standard CORS fetch error, retrying via no-cors fallback:', fetchErr);
          response = await fetch(endpointUrl, {
            method: 'POST',
            mode: 'no-cors',
            body: params
          });
        }

        let result = null;
        if (response.type === 'opaque') {
          // Opaque response from no-cors means request was dispatched to Google Apps Script successfully
          result = { status: 'success', message: 'Your enquiry has been successfully logged!' };
        } else {
          try {
            responseText = await response.text();
            try {
              result = JSON.parse(responseText);
            } catch {
              // Plain text response (e.g. "Success" from ContentService.createTextOutput)
              if (response.ok || responseText.trim().toLowerCase().includes('success')) {
                result = { status: 'success', message: 'Your enquiry has been successfully logged!' };
              } else {
                result = { status: 'error', message: responseText || `Server returned HTTP ${response.status}` };
              }
            }
          } catch (readErr) {
            if (response.ok) {
              result = { status: 'success', message: 'Your enquiry has been successfully logged!' };
            } else {
              throw new Error(`Server returned HTTP ${response.status}`);
            }
          }
        }

        if (result && result.status === 'success') {
          // Confirmed row written to Google Sheets
          showBanner(
            'success',
            result.message || 'Thank you! Your enquiry has been received and saved to Google Sheets. I will be in touch soon.'
          );
          showToast('Enquiry recorded successfully!');

          // Clear all 4 fields ONLY on success
          form.reset();
          Object.keys(fields).forEach((key) => {
            updateCounter(key);
            clearFieldError(key);
          });
        } else {
          // Server returned an error or validation failure
          const errorMsg = (result && result.message) || 'Submission could not be saved. Please verify your details.';
          showBanner('error', errorMsg);

          // If backend provided specific field errors, map them
          if (result && result.fieldErrors) {
            Object.keys(result.fieldErrors).forEach((fieldKey) => {
              setFieldError(fieldKey, result.fieldErrors[fieldKey]);
            });
          }
          // Preserve user input! Do NOT reset form.
        }
      } catch (networkError) {
        console.error('Submission network error:', networkError);
        showBanner(
          'error',
          'Network / Dispatch Error: Could not reach the Google Apps Script endpoint. Please verify your connection or contact directly via email. Your entered information has been preserved.'
        );
        // Preserve user input!
      } finally {
        isSubmitting = false;
        submitBtn.disabled = false;
        submitBtn.removeAttribute('aria-busy');
        submitBtn.classList.remove('is-loading');
      }
    });
  }



  // 3. React Bits SplitFlapText — Crystal Black & White Portfolio Intro
  function initIntroAnimation() {
    const introOverlay = document.getElementById('portfolio-intro');
    const splitFlapEl = document.getElementById('intro-splitflap');
    const subtitleEl = document.getElementById('intro-subtitle');
    if (!introOverlay || !splitFlapEl) return;

    const SESSION_KEY = 'portfolio_intro_seen';
    
    // Check dev query override: ?intro=true or ?forceIntro=true
    let forceIntro = false;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('intro') === 'true' || params.get('forceIntro') === 'true') {
        forceIntro = true;
      }
    } catch (e) {}

    // Check if user already saw the intro in this tab session
    const alreadySeen = !forceIntro && (sessionStorage.getItem(SESSION_KEY) === 'true');
    if (alreadySeen) {
      introOverlay.classList.add('portfolio-intro--hidden');
      introOverlay.style.display = 'none';
      introOverlay.style.pointerEvents = 'none';
      return;
    }

    // Lock page scroll during intro
    document.body.style.overflow = 'hidden';

    const text = 'NITIN VR';
    const padTo = 8;
    const paddedText = text.padEnd(padTo, ' ');
    const chars = paddedText.split('');
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const flipDurationMs = 120; // 0.12s
    const staggerMs = 80; // 0.08s
    const flipsPerChar = 8;
    const holdDurationMs = 1200;

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function toGlyph(c) {
      return (c === ' ' || !c) ? '\u00A0' : c;
    }

    function getRandomChar() {
      return charset.charAt(Math.floor(Math.random() * charset.length));
    }

    // Pre-create 8 tile DOM structures
    splitFlapEl.innerHTML = '';
    const srSpan = document.createElement('span');
    srSpan.className = 'split-flap-text__sr';
    srSpan.textContent = text;
    splitFlapEl.appendChild(srSpan);

    const tileElements = [];

    chars.forEach((targetChar, index) => {
      const tile = document.createElement('span');
      tile.className = 'split-flap-text__tile';
      tile.setAttribute('aria-hidden', 'true');
      tile.setAttribute('data-index', index);

      // Top half
      const topHalf = document.createElement('span');
      topHalf.className = 'split-flap-text__half split-flap-text__half--top';
      const topChar = document.createElement('span');
      topChar.className = 'split-flap-text__char';
      topChar.textContent = prefersReducedMotion ? toGlyph(targetChar) : '\u00A0';
      topHalf.appendChild(topChar);

      // Bottom half
      const bottomHalf = document.createElement('span');
      bottomHalf.className = 'split-flap-text__half split-flap-text__half--bottom';
      const bottomChar = document.createElement('span');
      bottomChar.className = 'split-flap-text__char';
      bottomChar.textContent = prefersReducedMotion ? toGlyph(targetChar) : '\u00A0';
      bottomHalf.appendChild(bottomChar);

      tile.appendChild(topHalf);
      tile.appendChild(bottomHalf);
      splitFlapEl.appendChild(tile);

      tileElements.push({
        tile,
        topChar,
        bottomChar,
        targetChar,
        currentChar: ' '
      });
    });

    let completedTiles = 0;
    let isTransitioningOut = false;
    let activeTimers = [];

    function cleanupTimers() {
      activeTimers.forEach(t => clearTimeout(t));
      activeTimers = [];
    }

    function transitionOut() {
      if (isTransitioningOut) return;
      isTransitioningOut = true;
      cleanupTimers();

      // Show final target text instantly if skipped early
      tileElements.forEach(item => {
        item.topChar.textContent = toGlyph(item.targetChar);
        item.bottomChar.textContent = toGlyph(item.targetChar);
        item.tile.classList.remove('is-flipping');
        const flaps = item.tile.querySelectorAll('.split-flap-text__flap, .split-flap-text__shade');
        flaps.forEach(f => f.remove());
      });

      if (subtitleEl) {
        subtitleEl.classList.add('portfolio-intro__subtitle--visible');
      }

      // Smooth fade-out of overlay
      introOverlay.classList.add('portfolio-intro--fading');
      document.body.style.overflow = '';

      try {
        sessionStorage.setItem(SESSION_KEY, 'true');
      } catch (e) {}

      const fadeTimer = setTimeout(() => {
        introOverlay.classList.add('portfolio-intro--hidden');
        introOverlay.style.display = 'none';
        introOverlay.style.pointerEvents = 'none';
      }, 780);
      activeTimers.push(fadeTimer);
    }

    // Skip on click or keypress
    introOverlay.addEventListener('click', () => {
      transitionOut();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === ' ') {
        if (!isTransitioningOut && !introOverlay.classList.contains('portfolio-intro--hidden')) {
          transitionOut();
        }
      }
    });

    // Safety timeout: portfolio opens no matter what
    const safetyTimer = setTimeout(() => {
      transitionOut();
    }, 5500);
    activeTimers.push(safetyTimer);

    if (prefersReducedMotion) {
      if (subtitleEl) {
        const subTimer = setTimeout(() => {
          subtitleEl.classList.add('portfolio-intro__subtitle--visible');
        }, 300);
        activeTimers.push(subTimer);
      }
      const exitTimer = setTimeout(() => {
        transitionOut();
      }, 1400);
      activeTimers.push(exitTimer);
      return;
    }

    // Animate each tile with departure-board cascade
    tileElements.forEach((item, index) => {
      const sequence = [];
      for (let s = 0; s < flipsPerChar; s++) {
        sequence.push(getRandomChar());
      }
      sequence.push(item.targetChar);

      const tileStartDelay = index * staggerMs;

      const startTimer = setTimeout(() => {
        if (isTransitioningOut) return;
        runTileFlips(item, sequence, 0);
      }, tileStartDelay);
      activeTimers.push(startTimer);
    });

    function runTileFlips(item, sequence, stepIndex) {
      if (isTransitioningOut) return;

      const nextChar = sequence[stepIndex];
      const currentChar = item.currentChar;

      // Update static top half to nextChar (so when flap falls, nextChar is revealed)
      item.topChar.textContent = toGlyph(nextChar);
      item.bottomChar.textContent = toGlyph(currentChar);

      // Clean existing flap elements
      const existingFlaps = item.tile.querySelectorAll('.split-flap-text__flap, .split-flap-text__shade');
      existingFlaps.forEach(f => f.remove());

      // Top shade
      const shadeTop = document.createElement('span');
      shadeTop.className = 'split-flap-text__shade split-flap-text__shade--top';

      // Bottom shade
      const shadeBottom = document.createElement('span');
      shadeBottom.className = 'split-flap-text__shade split-flap-text__shade--bottom';

      // Front flap (falls down from top)
      const frontFlap = document.createElement('span');
      frontFlap.className = 'split-flap-text__flap split-flap-text__flap--front';
      const frontChar = document.createElement('span');
      frontChar.className = 'split-flap-text__char';
      frontChar.textContent = toGlyph(currentChar);
      frontFlap.appendChild(frontChar);

      // Back flap (lands on bottom)
      const backFlap = document.createElement('span');
      backFlap.className = 'split-flap-text__flap split-flap-text__flap--back';
      const backChar = document.createElement('span');
      backChar.className = 'split-flap-text__char';
      backChar.textContent = toGlyph(nextChar);
      backFlap.appendChild(backChar);

      item.tile.classList.add('is-flipping');
      item.tile.appendChild(shadeTop);
      item.tile.appendChild(shadeBottom);
      item.tile.appendChild(frontFlap);
      item.tile.appendChild(backFlap);

      const stepTimer = setTimeout(() => {
        if (isTransitioningOut) return;

        // Finish this single flip
        item.bottomChar.textContent = toGlyph(nextChar);
        item.currentChar = nextChar;
        item.tile.classList.remove('is-flipping');
        frontFlap.remove();
        backFlap.remove();
        shadeTop.remove();
        shadeBottom.remove();

        const nextStep = stepIndex + 1;
        if (nextStep < sequence.length) {
          runTileFlips(item, sequence, nextStep);
        } else {
          // Tile complete
          completedTiles++;
          if (completedTiles === tileElements.length) {
            onAllTilesComplete();
          }
        }
      }, flipDurationMs);
      activeTimers.push(stepTimer);
    }

    function onAllTilesComplete() {
      if (isTransitioningOut) return;

      // Fade in subtitle
      if (subtitleEl) {
        subtitleEl.classList.add('portfolio-intro__subtitle--visible');
      }

      // Final hold before fading out overlay
      const holdTimer = setTimeout(() => {
        transitionOut();
      }, holdDurationMs);
      activeTimers.push(holdTimer);
    }
  }

  // 8. React Bits LogoLoop Engine — Seamless Continuous Technology Stack Loops
  function initLogoLoop() {
    function setupLoop({ loopId, trackId, speed = 48, direction = 'left', startDelay = 0, initialOffset = 0 }) {
      const loopEl = document.getElementById(loopId);
      const trackEl = document.getElementById(trackId);
      if (!loopEl || !trackEl) return;

      const originalList = trackEl.querySelector('.logoloop__list');
      if (!originalList) return;

      // Build 4 list copies for seamless infinite marquee loop in both directions
      const copies = 4;
      const primaryIndex = 1;
      const template = originalList.cloneNode(true);
      trackEl.innerHTML = '';

      for (let i = 0; i < copies; i++) {
        const clone = template.cloneNode(true);
        if (i !== primaryIndex) {
          clone.setAttribute('aria-hidden', 'true');
          // Prevent keyboard tab navigation to hidden clones
          clone.querySelectorAll('a').forEach((a) => a.setAttribute('tabindex', '-1'));
        } else {
          clone.removeAttribute('aria-hidden');
        }
        trackEl.appendChild(clone);
      }

      let offset = initialOffset;
      let period = 0;
      let lead = 0;
      const dirSign = direction === 'right' ? -1 : 1;
      let velocity = 0;
      const baseSpeed = speed * dirSign;
      let isHovered = false;
      let isDragging = false;
      let startX = 0;
      let dragOffset = 0;
      const isReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let rafId = 0;
      const startTime = performance.now();
      let lastTime = startTime;

      function measure() {
        const first = trackEl.children[0];
        const second = trackEl.children[1];
        if (first && second) {
          const rect1 = first.getBoundingClientRect();
          const rect2 = second.getBoundingClientRect();
          period = rect2.left - rect1.left;
        } else if (first) {
          period = first.offsetWidth;
        }
        if (period > 0) {
          lead = period;
          render();
        }
      }

      function render() {
        if (period <= 0) return;
        const currentOffset = ((offset % period) + period) % period;
        const T = -lead - currentOffset;
        trackEl.style.transform = `translate3d(${T.toFixed(2)}px, 0px, 0px)`;
      }

      measure();
      window.addEventListener('resize', measure);

      // Pause on hover
      loopEl.addEventListener('mouseenter', () => { isHovered = true; });
      loopEl.addEventListener('mouseleave', () => { isHovered = false; isDragging = false; });

      // Touch and pointer drag support
      loopEl.addEventListener('pointerdown', (e) => {
        isDragging = true;
        startX = e.clientX;
        dragOffset = offset;
      });

      window.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        offset = dragOffset - dx;
        render();
      });

      window.addEventListener('pointerup', () => {
        isDragging = false;
      });

      // Continuous loop animation frame
      function loopStep(now) {
        const elapsed = (now - startTime) / 1000;
        if (elapsed < startDelay) {
          lastTime = now;
          rafId = requestAnimationFrame(loopStep);
          return;
        }

        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        if (!isReducedMotion && !isDragging) {
          const targetSpeed = isHovered ? 0 : baseSpeed;
          velocity += (targetSpeed - velocity) * (1 - Math.exp(-dt / 0.25));
          offset += velocity * dt;
          render();
        }

        rafId = requestAnimationFrame(loopStep);
      }

      rafId = requestAnimationFrame(loopStep);
    }

    // Loop 1: Core Technology Stack (unchanged timing, speed 48, direction left)
    setupLoop({
      loopId: 'tech-logoloop',
      trackId: 'logoloop-track',
      speed: 48,
      direction: 'left',
      startDelay: 0,
      initialOffset: 0
    });

    // Loop 2: AI/ML & Data Science Stack (direction right, startDelay 1.2s, initialOffset 140px, speed 42)
    setupLoop({
      loopId: 'aiml-logoloop',
      trackId: 'aiml-logoloop-track',
      speed: 42,
      direction: 'right',
      startDelay: 1.2,
      initialOffset: 140
    });
  }

  // 8. React Bits DotField WebGL2 Engine (Ambient Hero Background)
  function initDotField() {
    const container = document.getElementById('hero-dotfield');
    const canvas = document.getElementById('dotfield-canvas');
    if (!container || !canvas) return;

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance'
    });
    if (!gl) return;

    const PIXEL_BUDGET = 9e6;
    const MAX_DOTS = 120000;
    const PATTERNS = { grid: 0, hex: 1, spiral: 2, scatter: 3 };
    const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

    const VERTEX = `#version 300 es
precision highp float;
layout(location = 0) in vec4 aDot;
uniform vec2 uSize;
uniform float uPixel;
uniform float uRadius;
uniform float uCell;
uniform vec4 uLens;
uniform vec2 uWarp;
uniform vec3 uGlow;
uniform vec3 uFrom;
uniform vec3 uTo;
uniform vec4 uGlowColor;
uniform vec3 uGradient;
uniform float uTime;
uniform float uWave;
uniform float uSparkle;
uniform float uFocus;
uniform float uBase;
uniform float uLight;
out vec2 vLocal;
out float vRadius;
out float vBlur;
out float vHalo;
out float vHaloWidth;
out vec3 vColor;
out float vAlpha;

vec3 toRgb(vec3 lab) {
  float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s = lab.x - 0.0894841775 * lab.y - 1.291485548 * lab.z;
  vec3 lms = vec3(l * l * l, m * m * m, s * s * s);
  vec3 lin = clamp(vec3(
    4.0767416621 * lms.x - 3.3077115913 * lms.y + 0.2309699292 * lms.z,
    -1.2684380046 * lms.x + 2.6097574011 * lms.y - 0.3413193965 * lms.z,
    -0.0041960863 * lms.x - 0.7034186147 * lms.y + 1.707614701 * lms.z
  ), 0.0, 1.0);
  return mix(lin * 12.92, 1.055 * pow(lin, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, lin));
}

vec3 blend(vec3 a, vec3 b, float t) {
  vec2 ab = mix(a.yz, b.yz, t);
  float chroma = mix(length(a.yz), length(b.yz), t);
  float len = length(ab);
  return vec3(mix(a.x, b.x, t), len > 1e-5 ? ab * (chroma / len) : ab);
}

vec3 wave(vec2 p, float t) {
  float ay = p.x * 0.018 + t + 1.1 * sin(p.y * 0.016 - t * 0.4);
  float ax = p.y * 0.021 + t * 0.7 + 1.3 * sin(p.x * 0.013 + t * 0.3);
  float spread = cos(ay) * 0.0176 * cos(p.y * 0.016 - t * 0.4) + 0.5 * cos(ax) * 0.0169 * cos(p.x * 0.013 + t * 0.3);
  return uWave * vec3(0.5 * sin(ax), sin(ay), spread);
}

void main() {
  vec2 corner = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1)) * 2.0 - 1.0;
  vec2 center = uSize * 0.5;
  vec3 swell = wave(aDot.xy, uTime);
  vec2 source = center + (aDot.xy - center) * mix(1.12, 1.0, uFocus) + swell.xy;

  vec2 rel = source - uLens.xy;
  float x = length(rel) / uLens.z;
  float y = clamp(1.0 - x * x, 0.0, 1.0);
  float w = y * y * y;
  float k = uWarp.x * uLens.w;
  float grow = 1.0 + k * w;
  float spread = 1.0 + k * (w - 6.0 * x * x * y * y);
  float theta = uWarp.y * uLens.w * w;
  vec2 turn = vec2(cos(theta), sin(theta));
  vec2 display = uLens.xy + vec2(turn.x * rel.x - turn.y * rel.y, turn.y * rel.x + turn.x * rel.y) * grow;
  float scale = sqrt(max(grow * spread, 0.02));

  float spark = 0.0;
  if (uSparkle > 0.0) {
    float phase = 0.5 + 0.5 * sin(uTime * (0.55 + aDot.w * 0.9) + aDot.z * 6.2831853);
    spark = pow(phase, 48.0) * step(0.72, fract(aDot.z * 7.31 + aDot.w * 3.17)) * uSparkle;
  }

  float pool = 0.0;
  if (uGlow.x > 0.0) {
    float g = length(display - uLens.xy) / uGlow.x;
    float q = clamp(1.0 - g * g, 0.0, 1.0);
    pool = q * q * uGlow.y * uLens.w;
  }

  float radius = uRadius * (1.0 + 0.7 * spark);
  float device = radius * scale * uPixel;
  float fade = 1.0;
  if (device < 0.75) {
    fade = device * device / 0.5625;
    radius = 0.75 / (scale * uPixel);
  }
  float blur = (1.0 - uFocus) * uCell * 0.42;
  float energy = pow(radius / (radius + blur), 1.15);
  float halo = pool * uGlow.z;
  float haloWidth = 2.0 + radius * 1.5;
  float pad = radius + blur * 1.2 + 1.5 / (scale * uPixel) + (halo > 0.0 ? haloWidth * 2.5 : 0.0);

  float t = clamp(dot(aDot.xy - center, uGradient.xy) / uGradient.z + 0.5, 0.0, 1.0);
  vec3 tone = blend(uFrom, uTo, t);
  vec3 deep = vec3(tone.x * 0.72, tone.yz * 1.3);
  vec3 base = toRgb(tone);
  vec3 lit = toRgb(mix(deep, uGlowColor.xyz, uGlowColor.w));
  vec3 color = mix(base, lit, clamp(pool, 0.0, 1.0) * 0.8);
  color = mix(color, uLight > 0.5 ? color * 0.6 : vec3(1.0), spark * 0.55);

  vLocal = corner * pad;
  vRadius = radius + blur;
  vBlur = blur * 0.7;
  vHalo = halo;
  vHaloWidth = haloWidth;
  vColor = color;
  float shade = clamp(1.0 - swell.z * 2.5, 0.4, 1.6);
  vAlpha = mix(min(uBase * shade, 1.0), 1.0, clamp(max(pool, spark), 0.0, 1.0)) * fade * energy * smoothstep(0.0, 0.25, uFocus + 0.08);
  vec2 point = display + corner * pad * scale;
  gl_Position = vec4(point.x / uSize.x * 2.0 - 1.0, 1.0 - point.y / uSize.y * 2.0, 0.0, 1.0);
}`;

    const FRAGMENT = `#version 300 es
precision highp float;
uniform float uOpacity;
in vec2 vLocal;
in float vRadius;
in float vBlur;
in float vHalo;
in float vHaloWidth;
in vec3 vColor;
in float vAlpha;
out vec4 fragColor;

void main() {
  float dist = length(vLocal);
  float d = dist - vRadius;
  float edge = max(fwidth(dist), 1e-4) + vBlur;
  float cover = 1.0 - smoothstep(-0.5 * edge, 0.5 * edge, d);
  float glow = vHalo * exp(-max(d, 0.0) / vHaloWidth) * 0.5;
  float alpha = min(cover + glow, 1.0) * vAlpha * uOpacity;
  if (alpha < 0.002) discard;
  fragColor = vec4(vColor * alpha, alpha);
}`;

    const clampVal = (val, min, max) => Math.min(max, Math.max(min, val));

    const parseColor = value => {
      const text = String(value || '').trim();
      const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text);
      if (hex) {
        const full = hex[1].length === 3 ? hex[1].replace(/./g, digit => digit + digit) : hex[1];
        return [0, 2, 4].map(index => parseInt(full.slice(index, index + 2), 16) / 255);
      }
      const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(text);
      if (rgb) return [rgb[1], rgb[2], rgb[3]].map(channel => clampVal(parseFloat(channel) / 255, 0, 1));
      return null;
    };

    const toLinear = channel => (channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4));

    const toOklab = color => {
      const [r, g, b] = color.map(toLinear);
      const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
      const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
      const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
      return [
        0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
      ];
    };

    const toInk = (value, fallback, light) => {
      const lab = toOklab(parseColor(value) || fallback);
      if (!light) return lab;
      const hue = (Math.atan2(lab[2], lab[1]) * 180) / Math.PI;
      const warmth = clampVal(1 - Math.abs(hue - 85) / 40, 0, 1);
      const ceiling = 0.6 + 0.16 * warmth * warmth * (3 - 2 * warmth);
      if (lab[0] <= ceiling) return lab;
      const boost = 1 + (lab[0] - ceiling) * 1.6;
      return [ceiling, lab[1] * boost, lab[2] * boost];
    };

    const chroma = value => {
      const lab = toOklab(parseColor(value) || [1, 1, 1]);
      return Math.hypot(lab[1], lab[2]);
    };

    const hash = (a, b, c) => {
      let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 1274126177)) | 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    };

    const lensReach = (radius, strength, twist) => {
      let peak = 0;
      for (let index = 1; index < 48; index++) {
        const x = index / 48;
        const w = (1 - x * x) ** 3;
        const sigma = x * radius;
        const grow = 1 + strength * w;
        const theta = twist * w;
        peak = Math.max(peak, Math.hypot(sigma * (grow * Math.cos(theta) - 1), sigma * grow * Math.sin(theta)));
      }
      return peak;
    };

    const buildDots = (width, height, step, pattern, margin) => {
      const cx = width / 2;
      const cy = height / 2;
      const minX = -margin;
      const maxX = width + margin;
      const minY = -margin;
      const maxY = height + margin;
      const out = [];
      const push = (x, y, a, b) => {
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) out.push(x, y, a, b);
      };
      if (pattern === PATTERNS.spiral) {
        const spacing = step / Math.sqrt(Math.PI);
        const reach = Math.hypot(width / 2 + margin, height / 2 + margin);
        const count = Math.ceil((reach / spacing) ** 2);
        for (let index = 0; index < count; index++) {
          const r = spacing * Math.sqrt(index + 0.5);
          const angle = index * GOLDEN_ANGLE;
          push(cx + r * Math.cos(angle), cy + r * Math.sin(angle), hash(index, 0, 3), hash(index, 0, 4));
        }
      } else {
        const rowStep = pattern === PATTERNS.hex ? (step * Math.sqrt(3)) / 2 : step;
        const cols = Math.ceil((width / 2 + margin) / step) + 1;
        const rows = Math.ceil((height / 2 + margin) / rowStep) + 1;
        for (let row = -rows; row <= rows; row++) {
          for (let col = -cols; col <= cols; col++) {
            let x = cx + col * step + (pattern === PATTERNS.hex && row & 1 ? step / 2 : 0);
            let y = cy + row * rowStep;
            if (pattern === PATTERNS.scatter) {
              x += (hash(col, row, 1) - 0.5) * step * 0.8;
              y += (hash(col, row, 2) - 0.5) * step * 0.8;
            }
            push(x, y, hash(col, row, 3), hash(col, row, 4));
          }
        }
      }
      return new Float32Array(out);
    };

    const compileShader = (type, source) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, VERTEX);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return;
    }

    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let index = 0; index < count; index++) {
      const info = gl.getActiveUniform(program, index);
      if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name);
    }

    const isLightMode = htmlRoot.getAttribute('data-theme') === 'light';
    const dotRadius = 1.5;
    const dotSpacing = 14;
    const gradientFrom = '#6a6a6d';
    const gradientTo = '#6a6a6d';
    const glowColor = '#6a6a6d';
    const gradientAngle = 8;
    const cursorRadius = 60;
    const bulgeStrength = 0.6;
    const glowRadius = 160;
    const glowIntensity = 0.8;
    const baseOpacity = 0.55;

    const radius = clampVal(dotRadius, 0.25, 12);
    const step = radius * 2 + clampVal(dotSpacing, 1, 200);
    const angle = (gradientAngle * Math.PI) / 180;
    const settings = {
      radius,
      step,
      pattern: PATTERNS.grid,
      from: toInk(gradientFrom, [0.32, 0.15, 1], isLightMode),
      to: toInk(gradientTo, [1, 0.62, 0.99], isLightMode),
      glowColor: toInk(glowColor, [1, 1, 1], isLightMode),
      glowWeight: isLightMode ? clampVal((chroma(glowColor) - 0.02) / 0.06, 0, 1) : 1,
      direction: [Math.sin(angle), -Math.cos(angle)],
      lensRadius: clampVal(cursorRadius, 20, 2000),
      strength: clampVal(bulgeStrength, -1, 1),
      twist: 0,
      glowRadius: Math.max(0, glowRadius),
      glowIntensity: clampVal(glowIntensity, 0, 2),
      base: clampVal(baseOpacity, 0, 1),
      wave: 0,
      sparkle: 0,
      speed: 1,
      interactive: false,
      holdToZoom: true,
      intro: true,
      light: isLightMode,
      opacity: 1,
      maxRatio: 2
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);
    gl.vertexAttribDivisor(0, 1);
    gl.bindVertexArray(null);

    const size = { width: 1, height: 1, ratio: 1 };
    const pointer = { x: 0, y: 0, inside: false, down: false };
    const lens = { x: 0, y: 0, vx: 0, vy: 0, presence: 0, zoom: 0, ready: false };
    let layoutKey = '';
    let dotCount = 0;
    let time = Math.random() * 100;
    let focus = settings.intro && !reduced ? 0 : 1;
    let raf = 0;
    let last = 0;
    let visible = true;
    let pageVisible = document.visibilityState !== 'hidden';
    let lost = false;

    const strengthOf = (s, zoom) => {
      const base = s.strength >= 0 ? s.strength * 1.2 : s.strength * 0.7;
      return clampVal(base * (1 + zoom * 0.6), -0.85, 1.45);
    };

    const layout = () => {
      const reach = lensReach(settings.lensRadius, strengthOf(settings, settings.holdToZoom ? 1 : 0), settings.twist * (settings.holdToZoom ? 1.6 : 1));
      const margin = Math.ceil(reach + settings.wave + settings.step * 2);
      const area = (size.width + margin * 2) * (size.height + margin * 2);
      const stepVal = Math.max(settings.step, Math.sqrt(area / MAX_DOTS));
      const key = `${size.width}|${size.height}|${stepVal}|${settings.pattern}|${margin}`;
      if (key === layoutKey) return;
      layoutKey = key;
      const data = buildDots(size.width, size.height, stepVal, settings.pattern, margin);
      dotCount = data.length / 4;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const cssWidth = Math.max(1, rect.width || window.innerWidth);
      const cssHeight = Math.max(1, rect.height || 600);
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        settings.maxRatio,
        Math.sqrt(PIXEL_BUDGET / (cssWidth * cssHeight))
      );
      const width = Math.max(1, Math.round(cssWidth * ratio));
      const height = Math.max(1, Math.round(cssHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      size.width = cssWidth;
      size.height = cssHeight;
      size.ratio = width / cssWidth;
      layout();
    };

    const frame = now => {
      raf = 0;
      if (lost) return;
      const dt = clampVal((now - last) / 1000 || 0, 0, 0.05);
      last = Math.max(last, now);
      if (!reduced) time += dt * settings.speed;
      if (focus < 1) focus = Math.min(1, focus + dt / 1.8);

      const tracking = settings.interactive && pointer.inside;
      if (tracking && (!lens.ready || lens.presence < 0.01)) {
        lens.x = pointer.x;
        lens.y = pointer.y;
        lens.vx = 0;
        lens.vy = 0;
        lens.ready = true;
      }
      if (lens.ready) {
        const omega = 18;
        const f = 1 + 2 * dt * omega;
        const oo = omega * omega;
        const hoo = dt * oo;
        const hhoo = dt * hoo;
        const inv = 1 / (f + hhoo);
        const nx = (f * lens.x + dt * lens.vx + hhoo * pointer.x) * inv;
        const ny = (f * lens.y + dt * lens.vy + hhoo * pointer.y) * inv;
        lens.vx = (lens.vx + hoo * (pointer.x - lens.x)) * inv;
        lens.vy = (lens.vy + hoo * (pointer.y - lens.y)) * inv;
        lens.x = nx;
        lens.y = ny;
      }
      const presenceTarget = tracking ? 1 : 0;
      lens.presence += (presenceTarget - lens.presence) * (1 - Math.exp(-dt / (tracking ? 0.18 : 0.4)));
      const zoomTarget = tracking && pointer.down && settings.holdToZoom ? 1 : 0;
      lens.zoom += (zoomTarget - lens.zoom) * (1 - Math.exp(-dt / 0.14));

      const eased = focus < 0.5 ? 4 * focus * focus * focus : 1 - Math.pow(-2 * focus + 2, 3) / 2;
      const presence = lens.presence * lens.presence * (3 - 2 * lens.presence);
      const extent = Math.abs(size.width * settings.direction[0]) + Math.abs(size.height * settings.direction[1]);

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      const u = uniforms;
      gl.uniform2f(u.uSize, size.width, size.height);
      gl.uniform1f(u.uPixel, size.ratio);
      gl.uniform1f(u.uRadius, settings.radius);
      gl.uniform1f(u.uCell, settings.step);
      gl.uniform4f(u.uLens, lens.x, lens.y, settings.lensRadius * (1 + lens.zoom * 0.12), presence);
      gl.uniform2f(u.uWarp, strengthOf(settings, lens.zoom), settings.twist * (1 + lens.zoom * 0.6));
      gl.uniform3f(
        u.uGlow,
        settings.glowRadius * (1 + lens.zoom * 0.1),
        settings.glowIntensity * (1 + lens.zoom * 0.25),
        settings.light ? 0 : 1
      );
      gl.uniform3f(u.uFrom, settings.from[0], settings.from[1], settings.from[2]);
      gl.uniform3f(u.uTo, settings.to[0], settings.to[1], settings.to[2]);
      gl.uniform4f(u.uGlowColor, settings.glowColor[0], settings.glowColor[1], settings.glowColor[2], settings.glowWeight);
      gl.uniform3f(u.uGradient, settings.direction[0], settings.direction[1], Math.max(extent, 1));
      gl.uniform1f(u.uTime, time);
      gl.uniform1f(u.uWave, settings.wave);
      gl.uniform1f(u.uSparkle, settings.sparkle);
      gl.uniform1f(u.uFocus, eased);
      gl.uniform1f(u.uBase, settings.light ? Math.min(1, settings.base * 1.3) : settings.base);
      gl.uniform1f(u.uLight, settings.light ? 1 : 0);
      gl.uniform1f(u.uOpacity, settings.opacity);
      if (dotCount) gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, dotCount);

      const moving =
        Math.abs(pointer.x - lens.x) + Math.abs(pointer.y - lens.y) > 0.05 || Math.hypot(lens.vx, lens.vy) > 0.5;
      const settling =
        Math.abs(presenceTarget - lens.presence) > 0.002 ||
        Math.abs(zoomTarget - lens.zoom) > 0.002 ||
        (lens.presence > 0.002 && moving);
      const animated = !reduced && settings.speed > 0 && (settings.wave > 0 || settings.sparkle > 0);
      const busy = focus < 1 || settling || animated;
      if (busy && visible && pageVisible) raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (raf || lost || !visible || !pageVisible) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      wake();
    });
    resizeObserver.observe(container);
    window.addEventListener('resize', () => {
      resize();
      wake();
    }, { passive: true });

    const intersection = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      wake();
    });
    intersection.observe(container);

    const onVisibility = () => {
      pageVisible = document.visibilityState !== 'hidden';
      wake();
    };
    document.addEventListener('visibilitychange', onVisibility);

    resize();
    wake();

    window.__dotFieldEngine = {
      setTheme: theme => {
        const isLight = theme === 'light';
        settings.light = isLight;
        const color = isLight ? '#71717a' : '#6a6a6d';
        settings.from = toInk(color, [0.32, 0.15, 1], isLight);
        settings.to = toInk(color, [1, 0.62, 0.99], isLight);
        settings.glowColor = toInk(color, [1, 1, 1], isLight);
        settings.glowWeight = isLight ? clampVal((chroma(color) - 0.02) / 0.06, 0, 1) : 1;
        wake();
      }
    };
  }

  // 9. React Bits ProfileCard Interactive 3D Holographic Tilt Engine
  function initProfileCard() {
    const root = document.getElementById('portfolio-profile-card');
    if (!root) return;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const settings = {
      enableTilt: true,
      tiltStrength: 12,
      parallax: 8,
      mobileTiltSensitivity: 5,
      intro: true
    };

    let size = { width: root.offsetWidth || 340, height: root.offsetHeight || 480 };
    const x = { p: 0, v: 0, target: 0 };
    const y = { p: 0, v: 0, target: 0 };
    const light = { p: 0, target: 0 };
    let raf = 0;
    let last = 0;
    let slowUntil = 0;
    let touchId = null;

    const write = () => {
      const angle = settings.enableTilt && !reduced ? settings.tiltStrength : 0;
      const depth = settings.parallax;
      const tilt = Math.min(1, Math.hypot(x.p, y.p));
      const style = root.style;
      style.setProperty('--pc-light-x', `${((x.p + 1) * 0.5 * size.width).toFixed(1)}px`);
      style.setProperty('--pc-light-y', `${((y.p + 1) * 0.5 * size.height).toFixed(1)}px`);
      style.setProperty('--pc-pointer-x', `${((x.p + 1) * 50).toFixed(2)}%`);
      style.setProperty('--pc-pointer-y', `${((y.p + 1) * 50).toFixed(2)}%`);
      style.setProperty('--pc-band-x', `${(50 + x.p * 15).toFixed(2)}%`);
      style.setProperty('--pc-band-y', `${(50 + y.p * 15).toFixed(2)}%`);
      style.setProperty('--pc-rotate-x', `${(y.p * angle).toFixed(3)}deg`);
      style.setProperty('--pc-rotate-y', `${(-x.p * angle).toFixed(3)}deg`);
      style.setProperty('--pc-shift-x', `${(x.p * (reduced ? 0 : depth)).toFixed(2)}px`);
      style.setProperty('--pc-shift-y', `${(y.p * (reduced ? 0 : depth)).toFixed(2)}px`);
      style.setProperty('--pc-reach', tilt.toFixed(4));
      style.setProperty('--pc-tilt', (tilt * light.p).toFixed(4));
      style.setProperty('--pc-active', light.p.toFixed(4));
    };

    const frame = now => {
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      const slow = now < slowUntil;
      const stiffness = slow ? 24 : 120;
      const damping = slow ? 9 : 16;
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        for (const axis of [x, y]) {
          axis.v += (stiffness * (axis.target - axis.p) - damping * axis.v) * h;
          axis.p += axis.v * h;
        }
      }
      const tau = light.target > light.p ? 0.18 : slow ? 0.9 : 0.45;
      light.p += (light.target - light.p) * (1 - Math.exp(-dt / tau));
      write();
      const moving =
        Math.abs(x.target - x.p) > 0.0005 ||
        Math.abs(y.target - y.p) > 0.0005 ||
        Math.abs(x.v) > 0.0005 ||
        Math.abs(y.v) > 0.0005 ||
        Math.abs(light.target - light.p) > 0.002;
      if (moving) {
        raf = requestAnimationFrame(frame);
      } else {
        x.p = x.target;
        y.p = y.target;
        light.p = light.target;
        write();
        raf = 0;
      }
    };

    const wake = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const aim = (nx, ny, on = true) => {
      x.target = clamp(nx, -1, 1);
      y.target = clamp(ny, -1, 1);
      light.target = on ? 1 : 0;
      slowUntil = 0;
      wake();
    };

    const aimAt = event => {
      const rect = root.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      aim(((event.clientX - rect.left) / rect.width) * 2 - 1, ((event.clientY - rect.top) / rect.height) * 2 - 1);
    };

    const release = () => aim(0, 0, false);

    const onEnter = event => {
      if (event.pointerType === 'mouse') aimAt(event);
    };
    const onMove = event => {
      if (event.pointerType === 'mouse' || event.pointerId === touchId) aimAt(event);
    };
    const onLeave = event => {
      if (event.pointerType === 'mouse') release();
    };
    const onDown = event => {
      if (event.pointerType === 'mouse') return;
      touchId = event.pointerId;
      aimAt(event);
    };
    const onUp = event => {
      if (event.pointerId !== touchId) return;
      touchId = null;
      release();
    };

    root.addEventListener('pointerenter', onEnter);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerleave', onLeave);
    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onUp);

    if (window.ResizeObserver) {
      const observer = new ResizeObserver(() => {
        size.width = root.offsetWidth || 340;
        size.height = root.offsetHeight || 480;
        write();
      });
      observer.observe(root);
    }

    if (settings.intro && !reduced) {
      x.p = 0.62;
      y.p = -0.55;
      light.p = 1;
      slowUntil = performance.now() + 1400;
      write();
      wake();
    } else {
      write();
    }

    window.__profileCardEngine = {
      aim,
      release,
      setTheme: theme => {
        root.classList.toggle('profile-card--light', theme === 'light');
        root.classList.toggle('profile-card--dark', theme !== 'light');
        write();
      }
    };
  }

  // 10. Footer Navigation & GooeyNav Synchronization
  function initFooterNavigation() {
    const footerLinks = document.querySelectorAll('.footer-nav__link, .footer-brand, .footer-copy-brand__link');
    const navMapping = {
      '#home': 0,
      '#about': 1,
      '#projects': 2,
      '#skills': 3,
      '#experience': 4,
      '#contact': 5
    };

    footerLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
          const targetEl = document.querySelector(href);
          if (targetEl) {
            e.preventDefault();
            targetEl.scrollIntoView({ behavior: 'smooth' });
            history.pushState(null, '', href);
            if (window.__gooeyNavEngine && navMapping[href] !== undefined) {
              window.__gooeyNavEngine.go(navMapping[href]);
            }
          }
        }
      });
    });
  }

  // Master Initialization Guard
  let appInitialized = false;
  function bootstrapApp() {
    if (appInitialized) return;
    appInitialized = true;

    initIntroAnimation();
    initGooeyNav();
    initMobileNav();
    initScrollspy();
    initGlassSpotlight();
    initContactForm();
    initLogoLoop();
    initDotField();
    initProfileCard();
    initFooterNavigation();
  }

  // Initialize all interactive modules on DOMContentLoaded or immediately if ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapApp);
  } else {
    bootstrapApp();
  }

})();
