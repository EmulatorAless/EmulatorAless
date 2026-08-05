/**
 * Generates two tech GIF options for the profile README:
 * 1) tech-intro.gif      — clean terminal / recruiter-friendly
 * 2) tech-cyber.gif      — denser cyber grid + particles
 */
const fs = require("fs");
const path = require("path");
const { GIFEncoder, quantize, applyPalette } = require("gifenc");

const W = 840;
const H = 240;

const C = {
  bg: [22, 28, 36],
  panel: [28, 36, 46],
  grid: [36, 48, 58],
  teal: [94, 200, 184],
  tealDim: [48, 110, 105],
  white: [240, 245, 247],
  muted: [140, 160, 168],
  line: [50, 70, 80],
};

function idx(x, y) {
  return (y * W + x) * 4;
}

function set(data, x, y, rgb, a = 255) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = idx(x, y);
  data[i] = rgb[0];
  data[i + 1] = rgb[1];
  data[i + 2] = rgb[2];
  data[i + 3] = a;
}

function rect(data, x, y, w, h, rgb) {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) set(data, px, py, rgb);
  }
}

function hline(data, x, y, len, rgb) {
  for (let i = 0; i < len; i++) set(data, x + i, y, rgb);
}

function vline(data, x, y, len, rgb) {
  for (let i = 0; i < len; i++) set(data, x, y + i, rgb);
}

function blend(a, b, t) {
  return [
    (a[0] + (b[0] - a[0]) * t) | 0,
    (a[1] + (b[1] - a[1]) * t) | 0,
    (a[2] + (b[2] - a[2]) * t) | 0,
  ];
}

const FONT = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01110"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10001", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  W: ["10001", "10001", "10001", "10001", "10101", "10101", "01010"],
  X: ["10001", "01010", "00100", "00100", "00100", "01010", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00100", "01000", "10000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ">": ["10000", "01000", "00100", "00010", "00100", "01000", "10000"],
  "_": ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
};

function text(data, str, x, y, scale, rgb) {
  let cx = x;
  for (const ch of str) {
    const g = FONT[ch] || FONT[" "];
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 5; c++) {
        if (g[r][c] === "1") rect(data, cx + c * scale, y + r * scale, scale, scale, rgb);
      }
    }
    cx += 6 * scale;
  }
}

function fillBg(data, t, style) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = ((x * 11 + y * 23 + t) % 5) - 2;
      const base = style === "cyber" ? C.bg : C.panel;
      set(data, x, y, [base[0] + n, base[1] + n, base[2] + n]);
    }
  }
}

function drawGrid(data, gap) {
  for (let x = 0; x < W; x += gap) vline(data, x, 0, H, C.grid);
  for (let y = 0; y < H; y += gap) hline(data, 0, y, W, C.grid);
}

function glow(data, cx, cy, radius, strength) {
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const d = Math.sqrt(x * x + y * y) / radius;
      if (d >= 1) continue;
      const px = cx + x;
      const py = cy + y;
      if (px < 0 || py < 0 || px >= W || py >= H) continue;
      const i = idx(px, py);
      const f = (1 - d) * strength;
      data[i] = Math.min(255, data[i] + C.teal[0] * f);
      data[i + 1] = Math.min(255, data[i + 1] + C.teal[1] * f);
      data[i + 2] = Math.min(255, data[i + 2] + C.teal[2] * f);
    }
  }
}

function makeTerminal(t, frames) {
  const data = new Uint8ClampedArray(W * H * 4);
  fillBg(data, t, "terminal");
  drawGrid(data, 40);

  // Window chrome
  rect(data, 40, 28, 760, 184, C.bg);
  hline(data, 40, 28, 760, C.tealDim);
  hline(data, 40, 211, 760, C.tealDim);
  vline(data, 40, 28, 184, C.tealDim);
  vline(data, 799, 28, 184, C.tealDim);
  rect(data, 40, 28, 760, 26, [18, 24, 30]);
  // traffic lights
  rect(data, 54, 36, 10, 10, [220, 90, 90]);
  rect(data, 72, 36, 10, 10, [220, 180, 70]);
  rect(data, 90, 36, 10, 10, [80, 180, 120]);
  text(data, "alex", 120, 35, 2, C.muted);

  glow(data, 720, 120, 70, 0.18);

  // Terminal lines appear progressively
  const lines = [
    { txt: "> whoami", color: C.teal, at: 0 },
    { txt: "  ALEX", color: C.white, at: 6 },
    { txt: "> role", color: C.teal, at: 12 },
    { txt: "  FULL-STACK  SAAS", color: C.white, at: 18 },
    { txt: "> stack", color: C.teal, at: 24 },
    { txt: "  WEB · MOBILE · BACKEND", color: C.muted, at: 30 },
  ];

  let ly = 70;
  for (const line of lines) {
    if (t >= line.at) {
      const visible = Math.min(line.txt.length, Math.floor((t - line.at) * 1.6) + 1);
      text(data, line.txt.slice(0, visible), 58, ly, 2, line.color);
    }
    ly += 22;
  }

  // Cursor on last visible prompt line
  if (Math.floor(t / 4) % 2 === 0) {
    const last = lines.filter((l) => t >= l.at).pop();
    if (last) {
      const row = lines.indexOf(last);
      const visible = Math.min(last.txt.length, Math.floor((t - last.at) * 1.6) + 1);
      rect(data, 58 + visible * 12, 70 + row * 22, 8, 14, C.teal);
    }
  }

  // Bottom status
  const p = Math.floor((t / frames) * 700);
  rect(data, 58, 198, 700, 3, C.line);
  rect(data, 58, 198, Math.max(10, p), 3, C.teal);

  return data;
}

function makeCyber(t, frames) {
  const data = new Uint8ClampedArray(W * H * 4);
  fillBg(data, t, "cyber");
  drawGrid(data, 28);

  glow(data, 760 + Math.sin(t / 8) * 20, 50, 80, 0.22);
  glow(data, 120, 200, 50, 0.1);

  // Scan
  const scanY = ((t / frames) * H) | 0;
  for (let x = 0; x < W; x++) {
    set(data, x, scanY, blend(C.bg, C.teal, 0.45));
    if (scanY + 1 < H) set(data, x, scanY + 1, blend(C.bg, C.teal, 0.2));
  }

  // Particles
  for (let i = 0; i < 18; i++) {
    const px = (i * 97 + t * 5) % W;
    const py = (i * 53 + t * 3) % H;
    rect(data, px, py, 2, 2, i % 3 === 0 ? C.teal : C.tealDim);
  }

  rect(data, 36, 40, 4, 150, C.teal);
  text(data, "ALEX", 56, 55, 7, C.white);
  if (Math.floor(t / 5) % 2 === 0) rect(data, 56 + 4 * 42 + 6, 55, 5, 49, C.teal);
  text(data, "FULL STACK / SAAS", 56, 120, 3, C.teal);
  text(data, "WEB  MOBILE  BACKEND", 56, 158, 2, C.muted);

  const p = Math.floor((t / frames) * 720);
  rect(data, 56, 200, 720, 4, C.tealDim);
  rect(data, 56, 200, Math.max(12, p), 4, C.teal);
  rect(data, 56 + ((t * 12) % 720), 197, 6, 10, C.white);

  text(data, "</>", 740, 175, 3, blend(C.tealDim, C.teal, 0.4 + 0.6 * Math.abs(Math.sin(t / 6))));

  return data;
}

function hsv(h, s, v) {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const u = v * (1 - (1 - f) * s);
  let r, g, b;
  switch (i % 6) {
    case 0: r = v; g = u; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = u; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = u; g = p; b = v; break;
    default: r = v; g = p; b = q;
  }
  return [(r * 255) | 0, (g * 255) | 0, (b * 255) | 0];
}

function makeCyberVivid(t, frames) {
  const data = new Uint8ClampedArray(W * H * 4);
  const bg = [12, 14, 28];

  // Animated diagonal color wash background
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const hue = ((x * 0.0012 + y * 0.002 + t * 0.018) % 1 + 1) % 1;
      const wash = hsv(hue, 0.55, 0.22);
      const n = ((x * 17 + y * 31 + t * 3) % 5) - 2;
      set(data, x, y, [
        Math.min(255, bg[0] + wash[0] * 0.55 + n),
        Math.min(255, bg[1] + wash[1] * 0.55 + n),
        Math.min(255, bg[2] + wash[2] * 0.55 + n),
      ]);
    }
  }

  // Moving grid that shifts color
  const gridHue = ((t * 0.02) % 1 + 1) % 1;
  const gridCol = hsv(gridHue, 0.7, 0.35);
  for (let x = (t * 2) % 28; x < W; x += 28) vline(data, x, 0, H, gridCol);
  for (let y = (t * 2) % 28; y < H; y += 28) hline(data, 0, y, W, gridCol);

  // Dual orbiting neon orbs
  const orbColors = [
    hsv((t * 0.03) % 1, 0.9, 1),
    hsv((0.33 + t * 0.03) % 1, 0.9, 1),
    hsv((0.66 + t * 0.03) % 1, 0.9, 1),
  ];
  glow(data, 700 + Math.sin(t / 6) * 40, 55 + Math.cos(t / 8) * 25, 70, 0.45);
  // manual colored glows
  function neonGlow(cx, cy, radius, rgb, strength) {
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        const d = Math.sqrt(x * x + y * y) / radius;
        if (d >= 1) continue;
        const px = cx + x;
        const py = cy + y;
        if (px < 0 || py < 0 || px >= W || py >= H) continue;
        const i = idx(px, py);
        const f = (1 - d) * strength;
        data[i] = Math.min(255, data[i] + rgb[0] * f);
        data[i + 1] = Math.min(255, data[i + 1] + rgb[1] * f);
        data[i + 2] = Math.min(255, data[i + 2] + rgb[2] * f);
      }
    }
  }
  neonGlow(700 + Math.sin(t / 6) * 40, 55 + Math.cos(t / 8) * 25, 75, orbColors[0], 0.4);
  neonGlow(160 + Math.cos(t / 7) * 30, 180 + Math.sin(t / 5) * 20, 55, orbColors[1], 0.35);
  neonGlow(480 + Math.sin(t / 5) * 50, 120, 45, orbColors[2], 0.3);

  // Rain of colorful code bits
  for (let i = 0; i < 40; i++) {
    const px = (i * 61) % W;
    const py = (i * 37 + t * (4 + (i % 5))) % H;
    const c = hsv((i * 0.07 + t * 0.04) % 1, 0.85, 1);
    rect(data, px, py, 2, 6 + (i % 4), c);
  }

  // Rainbow scan beam
  const scanY = ((t * 4) % H);
  for (let x = 0; x < W; x++) {
    const c = hsv((x / W + t * 0.05) % 1, 0.9, 1);
    set(data, x, scanY, c);
    if (scanY + 1 < H) set(data, x, scanY + 1, blend(bg, c, 0.5));
    if (scanY + 2 < H) set(data, x, scanY + 2, blend(bg, c, 0.25));
  }

  // Accent bar cycles hue
  const accent = hsv((t * 0.05) % 1, 0.95, 1);
  rect(data, 36, 40, 5, 155, accent);

  // Title with color-shifting outline feel
  const titleHue = (0.55 + t * 0.025) % 1;
  text(data, "ALEX", 58, 52, 7, [255, 255, 255]);
  // neon underline under name
  const nameW = 4 * 42;
  for (let x = 0; x < nameW; x++) {
    const c = hsv((x / nameW + t * 0.06) % 1, 1, 1);
    rect(data, 58 + x, 52 + 7 * 7 + 4, 1, 3, c);
  }

  const cursorCol = hsv((t * 0.08) % 1, 1, 1);
  if (Math.floor(t / 3) % 2 === 0) {
    rect(data, 58 + nameW + 6, 52, 6, 49, cursorCol);
  }

  text(data, "FULL STACK / SAAS", 58, 118, 3, hsv((0.15 + t * 0.03) % 1, 0.85, 1));
  text(data, "WEB  MOBILE  BACKEND", 58, 156, 2, hsv((0.75 + t * 0.02) % 1, 0.5, 0.9));

  // Multi-color progress bar
  rect(data, 56, 200, 720, 6, [30, 30, 50]);
  const progress = Math.max(20, Math.floor(((t % frames) / frames) * 720));
  for (let x = 0; x < progress; x++) {
    const c = hsv((x / 720 + t * 0.05) % 1, 0.95, 1);
    rect(data, 56 + x, 200, 1, 6, c);
  }
  // bouncing tip
  const tip = 56 + ((t * 16) % 720);
  rect(data, tip, 196, 10, 14, [255, 255, 255]);

  // Floating brackets spinning colors
  text(data, "</>", 720, 168, 3, hsv((t * 0.1) % 1, 1, 1));

  // Side equalizer bars
  for (let i = 0; i < 8; i++) {
    const h = 20 + Math.abs(Math.sin(t / 3 + i) * 50);
    const c = hsv((i / 8 + t * 0.04) % 1, 0.9, 1);
    rect(data, 780 + i * 6, 200 - h, 4, h, c);
  }

  return data;
}

function makeCyberMinecraft(t, frames) {
  const data = new Uint8ClampedArray(W * H * 4);
  const B = 16;
  const bg = [10, 12, 28];

  // Neon sky wash (from vivid)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const hue = ((x * 0.001 + y * 0.0025 + t * 0.016) % 1 + 1) % 1;
      const wash = hsv(hue, 0.6, 0.28);
      const n = ((x * 13 + y * 29 + t) % 5) - 2;
      set(data, x, y, [
        Math.min(255, bg[0] + wash[0] * 0.5 + n),
        Math.min(255, bg[1] + wash[1] * 0.5 + n),
        Math.min(255, bg[2] + wash[2] * 0.5 + n),
      ]);
    }
  }

  // Soft neon grid
  const gridCol = hsv((t * 0.02) % 1, 0.7, 0.28);
  for (let x = 0; x < W; x += 28) vline(data, x, 0, 150, gridCol);
  for (let y = 0; y < 150; y += 28) hline(data, 0, y, W, gridCol);

  // Neon sun
  const sunC = hsv((0.12 + t * 0.02) % 1, 0.9, 1);
  const sunX = 740;
  const sunY = 36;
  for (let y = -22; y <= 22; y++) {
    for (let x = -22; x <= 22; x++) {
      const d = Math.sqrt(x * x + y * y);
      if (d < 12) set(data, sunX + x, sunY + y, [255, 250, 200]);
      else if (d < 20) set(data, sunX + x, sunY + y, sunC);
    }
  }

  // Floating neon block clouds
  for (let c = 0; c < 3; c++) {
    const ox = ((50 + c * 280 + t * 3) % (W + 80)) - 40;
    const cy = 22 + c * 14;
    const cc = hsv((0.55 + c * 0.2 + t * 0.01) % 1, 0.5, 0.95);
    rect(data, ox, cy, 44, 12, cc);
    rect(data, ox + 10, cy - 10, 32, 12, blend(cc, [255, 255, 255], 0.35));
  }

  // Code rain over sky
  for (let i = 0; i < 28; i++) {
    const px = (i * 67) % W;
    const py = (i * 41 + t * (3 + (i % 4))) % 150;
    rect(data, px, py, 2, 5 + (i % 3), hsv((i * 0.08 + t * 0.05) % 1, 0.9, 1));
  }

  // Minecraft terrain with neon-tinted blocks
  const groundY = 158;
  for (let x = 0; x < W; x += B) {
    const hueShift = ((x / W) + t * 0.01) % 1;
    const grass = hsv((0.3 + hueShift * 0.15) % 1, 0.75, 0.75);
    const dirt = hsv((0.08 + hueShift * 0.05) % 1, 0.65, 0.45);
    const stone = hsv((0.6 + hueShift * 0.1) % 1, 0.25, 0.4);
    rect(data, x, groundY, B, B, (x / B + Math.floor(t / 7)) % 2 ? grass : blend(grass, [20, 40, 20], 0.25));
    rect(data, x, groundY + B, B, B, (x / B) % 2 ? dirt : blend(dirt, [20, 10, 5], 0.2));
    rect(data, x, groundY + 2 * B, B, H - (groundY + 2 * B), stone);
  }

  // Neon lava/glitch cracks in ground
  for (let i = 0; i < 5; i++) {
    const lx = 100 + i * 150 + Math.floor(Math.sin(t / 4 + i) * 8);
    rect(data, lx, groundY + 4, 4, B * 2, hsv((0.05 + t * 0.08 + i * 0.1) % 1, 1, 1));
  }

  // Sign with cyber frame
  const sx = 260;
  const sy = 42;
  const frameCol = hsv((t * 0.05) % 1, 0.95, 1);
  rect(data, sx, sy, 330, 96, [20, 18, 35]);
  // rainbow border
  for (let i = 0; i < 330; i++) {
    const c = hsv((i / 330 + t * 0.05) % 1, 1, 1);
    rect(data, sx + i, sy, 1, 3, c);
    rect(data, sx + i, sy + 93, 1, 3, c);
  }
  for (let i = 0; i < 96; i++) {
    const c = hsv((i / 96 + t * 0.05) % 1, 1, 1);
    rect(data, sx, sy + i, 3, 1, c);
    rect(data, sx + 327, sy + i, 3, 1, c);
  }
  rect(data, sx + 10, sy + 10, 310, 76, [245, 240, 255]);
  // posts neon
  rect(data, sx + 40, sy + 96, 14, groundY - (sy + 96), frameCol);
  rect(data, sx + 276, sy + 96, 14, groundY - (sy + 96), hsv((0.5 + t * 0.05) % 1, 0.95, 1));

  text(data, "ALEX", sx + 75, sy + 22, 6, [25, 20, 40]);
  // rainbow underline under name
  for (let i = 0; i < 200; i++) {
    rect(data, sx + 75 + i, sy + 68, 1, 3, hsv((i / 200 + t * 0.06) % 1, 1, 1));
  }
  text(data, "FULL STACK", sx + 95, sy + 76, 2, hsv((0.15 + t * 0.03) % 1, 0.9, 0.55));

  // Gold/neon block placing on sign
  const blockC = hsv((t * 0.1) % 1, 0.9, 1);
  rect(data, sx + 290, sy + 20 + (t % 6 < 3 ? 0 : -4), B, B, blockC);

  // Mini Steve with neon shirt
  const bob = Math.floor(Math.sin(t / 4) * 3);
  const px = 85;
  const py = groundY - 52 + bob;
  const shirt = hsv((0.55 + t * 0.04) % 1, 0.85, 0.95);
  rect(data, px + 8, py, 24, 24, [210, 165, 120]);
  rect(data, px + 8, py, 24, 8, [50, 35, 25]);
  rect(data, px + 12, py + 12, 4, 4, [30, 30, 30]);
  rect(data, px + 24, py + 12, 4, 4, [30, 30, 30]);
  rect(data, px + 8, py + 24, 24, 20, shirt);
  const arm = Math.floor(Math.sin(t / 3) * 4);
  rect(data, px, py + 24 + arm, 8, 18, [210, 165, 120]);
  rect(data, px + 32, py + 24 - arm, 8, 18, [210, 165, 120]);
  rect(data, px + 8, py + 44, 10, 16, hsv(0.7, 0.6, 0.5));
  rect(data, px + 22, py + 44, 10, 16, hsv(0.7, 0.6, 0.5));
  rect(data, px + 8, py + 58, 10, 6, [40, 40, 40]);
  rect(data, px + 22, py + 58, 10, 6, [40, 40, 40]);

  // Neon hearts
  for (let i = 0; i < 5; i++) {
    const hc = hsv((0.95 + i * 0.02 + t * 0.03) % 1, 0.9, 1);
    rect(data, 50 + i * 18, 14, 8, 8, hc);
    rect(data, 52 + i * 18, 12, 4, 2, hc);
  }

  // Scan line
  const scanY = (t * 4) % groundY;
  for (let x = 0; x < W; x++) {
    set(data, x, scanY, hsv((x / W + t * 0.05) % 1, 0.9, 1));
  }

  // Hotbar with neon selection
  const hbY = H - 34;
  const hbX = (W - 9 * 34) / 2;
  const selected = Math.floor(t / 5) % 9;
  for (let i = 0; i < 9; i++) {
    const hx = hbX + i * 34;
    rect(data, hx, hbY, 32, 32, [18, 16, 30]);
    rect(data, hx + 2, hbY + 2, 28, 28, [50, 45, 70]);
    if (i === selected) {
      const sel = hsv((t * 0.08) % 1, 1, 1);
      hline(data, hx, hbY, 32, sel);
      hline(data, hx, hbY + 31, 32, sel);
      vline(data, hx, hbY, 32, sel);
      vline(data, hx + 31, hbY, 32, sel);
    }
    const item = hsv((i / 9 + t * 0.03) % 1, 0.85, 0.95);
    rect(data, hx + 8, hbY + 8, 16, 16, item);
  }

  // Equalizer on right above ground
  for (let i = 0; i < 6; i++) {
    const h = 15 + Math.abs(Math.sin(t / 3 + i) * 40);
    rect(data, 780 + i * 8, groundY - h, 5, h, hsv((i / 6 + t * 0.05) % 1, 0.95, 1));
  }

  return data;
}

function makeMinecraft(t, frames) {
  const data = new Uint8ClampedArray(W * H * 4);
  const B = 16; // block size

  const MC = {
    skyTop: [120, 168, 230],
    skyBot: [170, 205, 245],
    cloud: [245, 245, 245],
    sun: [255, 230, 70],
    sunCore: [255, 250, 180],
    grass: [95, 160, 50],
    grassDark: [70, 130, 40],
    dirt: [130, 90, 55],
    dirtDark: [105, 70, 40],
    stone: [120, 120, 120],
    stoneDark: [90, 90, 90],
    wood: [160, 120, 70],
    woodDark: [120, 85, 45],
    gold: [230, 190, 50],
    goldDark: [180, 140, 30],
    skin: [200, 155, 110],
    hair: [55, 40, 25],
    shirt: [45, 120, 180],
    pants: [55, 55, 140],
    shoes: [60, 60, 60],
    heart: [200, 40, 40],
    hotbar: [40, 40, 40],
    hotbarEdge: [200, 200, 200],
    slot: [90, 90, 90],
    text: [35, 35, 35],
    cream: [250, 245, 220],
  };

  // Sky gradient
  for (let y = 0; y < H; y++) {
    const k = y / H;
    const col = blend(MC.skyTop, MC.skyBot, k);
    for (let x = 0; x < W; x++) set(data, x, y, col);
  }

  // Sun
  const sunX = 720;
  const sunY = 40;
  const pulse = 18 + Math.floor(Math.sin(t / 6) * 2);
  for (let y = -pulse; y <= pulse; y++) {
    for (let x = -pulse; x <= pulse; x++) {
      const d = Math.sqrt(x * x + y * y);
      if (d < pulse * 0.55) set(data, sunX + x, sunY + y, MC.sunCore);
      else if (d < pulse) set(data, sunX + x, sunY + y, MC.sun);
    }
  }

  // Clouds (blocky, drifting)
  function cloud(cx, cy, seed) {
    const ox = ((cx + t * 2 + seed * 40) % (W + 120)) - 60;
    const blocks = [
      [0, 1], [1, 1], [2, 1], [3, 1],
      [1, 0], [2, 0], [3, 0], [4, 0],
      [2, -1],
    ];
    for (const [bx, by] of blocks) {
      rect(data, ox + bx * 12, cy + by * 10, 12, 10, MC.cloud);
    }
  }
  cloud(40, 36, 0);
  cloud(280, 55, 1);
  cloud(500, 30, 2);

  // Terrain rows
  const groundY = 168;
  for (let x = 0; x < W; x += B) {
    // grass
    const g = (Math.floor(x / B) + Math.floor(t / 8)) % 3 === 0 ? MC.grassDark : MC.grass;
    rect(data, x, groundY, B, B, g);
    // dirt
    for (let row = 1; row <= 2; row++) {
      const d = (x / B + row) % 2 === 0 ? MC.dirt : MC.dirtDark;
      rect(data, x, groundY + row * B, B, B, d);
    }
    // stone strip
    const s = (x / B) % 2 === 0 ? MC.stone : MC.stoneDark;
    rect(data, x, groundY + 3 * B, B, H - (groundY + 3 * B), s);
  }

  // Sign board
  const signX = 250;
  const signY = 55;
  rect(data, signX, signY, 340, 90, MC.wood);
  rect(data, signX + 8, signY + 8, 324, 74, MC.cream);
  // posts
  rect(data, signX + 40, signY + 90, 18, groundY - (signY + 90), MC.woodDark);
  rect(data, signX + 282, signY + 90, 18, groundY - (signY + 90), MC.woodDark);

  // Name builds block by block
  const name = "ALEX";
  const lettersToShow = Math.min(name.length, 1 + Math.floor((t / frames) * (name.length + 2)));
  text(data, name.slice(0, lettersToShow), signX + 70, signY + 22, 6, MC.text);
  if (lettersToShow >= name.length) {
    text(data, "FULL STACK", signX + 85, signY + 68, 2, MC.woodDark);
  }

  // Block being placed animation on sign corner
  if (t % 10 < 5) {
    rect(data, signX + 300, signY + 20, B, B, MC.gold);
    rect(data, signX + 304, signY + 24, 8, 8, MC.goldDark);
  } else {
    rect(data, signX + 300, signY + 16, B, B, MC.gold);
    rect(data, signX + 304, signY + 20, 8, 8, MC.goldDark);
  }

  // Mini Steve (bobbing)
  const bob = Math.floor(Math.sin(t / 4) * 3);
  const px = 90;
  const py = groundY - 48 + bob;
  // head
  rect(data, px + 8, py, 24, 24, MC.skin);
  rect(data, px + 8, py, 24, 8, MC.hair);
  // eyes
  rect(data, px + 12, py + 12, 4, 4, [30, 30, 30]);
  rect(data, px + 24, py + 12, 4, 4, [30, 30, 30]);
  // body
  rect(data, px + 8, py + 24, 24, 20, MC.shirt);
  // arms
  const armSwing = Math.floor(Math.sin(t / 3) * 4);
  rect(data, px, py + 24 + armSwing, 8, 18, MC.skin);
  rect(data, px + 32, py + 24 - armSwing, 8, 18, MC.skin);
  // legs
  rect(data, px + 8, py + 44, 10, 16, MC.pants);
  rect(data, px + 22, py + 44, 10, 16, MC.pants);
  rect(data, px + 8, py + 58, 10, 6, MC.shoes);
  rect(data, px + 22, py + 58, 10, 6, MC.shoes);

  // Hearts
  for (let i = 0; i < 5; i++) {
    const hx = 58 + i * 18;
    rect(data, hx, 18, 8, 8, MC.heart);
    rect(data, hx + 2, 16, 4, 2, MC.heart);
  }

  // Hotbar
  const hbY = H - 36;
  const hbX = (W - 9 * 34) / 2;
  for (let i = 0; i < 9; i++) {
    const sx = hbX + i * 34;
    rect(data, sx, hbY, 32, 32, MC.hotbar);
    rect(data, sx + 2, hbY + 2, 28, 28, MC.slot);
    // selected slot outline
    if (i === Math.floor(t / 6) % 9) {
      hline(data, sx, hbY, 32, MC.hotbarEdge);
      hline(data, sx, hbY + 31, 32, MC.hotbarEdge);
      vline(data, sx, hbY, 32, MC.hotbarEdge);
      vline(data, sx + 31, hbY, 32, MC.hotbarEdge);
    }
  }
  // items in hotbar: grass, dirt, stone, wood, gold
  const items = [MC.grass, MC.dirt, MC.stone, MC.wood, MC.gold, MC.shirt, MC.sun, MC.heart, MC.skin];
  for (let i = 0; i < 9; i++) {
    rect(data, hbX + i * 34 + 8, hbY + 8, 16, 16, items[i]);
  }

  return data;
}

function makeMinecraftCreeper(t, frames) {
  const data = new Uint8ClampedArray(W * H * 4);
  const B = 16;
  const MC = {
    skyTop: [90, 130, 180],
    skyBot: [140, 175, 210],
    cloud: [230, 230, 230],
    grass: [85, 145, 45],
    grassDark: [60, 115, 35],
    dirt: [120, 85, 50],
    dirtDark: [95, 65, 38],
    stone: [110, 110, 110],
    cream: [250, 245, 220],
    wood: [150, 115, 65],
    woodDark: [110, 80, 40],
    creeper: [70, 170, 70],
    creeperDark: [40, 120, 40],
    face: [20, 20, 20],
    text: [30, 30, 30],
    tnt: [180, 50, 50],
    fuse: [220, 200, 80],
  };

  for (let y = 0; y < H; y++) {
    const col = blend(MC.skyTop, MC.skyBot, y / H);
    for (let x = 0; x < W; x++) set(data, x, y, col);
  }

  // drifting clouds
  for (let c = 0; c < 3; c++) {
    const ox = ((80 + c * 260 + t * 2) % (W + 100)) - 50;
    const cy = 28 + c * 12;
    rect(data, ox, cy, 48, 14, MC.cloud);
    rect(data, ox + 12, cy - 10, 36, 12, MC.cloud);
  }

  const groundY = 168;
  for (let x = 0; x < W; x += B) {
    rect(data, x, groundY, B, B, (x / B) % 2 ? MC.grass : MC.grassDark);
    rect(data, x, groundY + B, B, B, (x / B) % 2 ? MC.dirt : MC.dirtDark);
    rect(data, x, groundY + 2 * B, B, H - (groundY + 2 * B), MC.stone);
  }

  // Sign
  rect(data, 280, 50, 300, 88, MC.wood);
  rect(data, 288, 58, 284, 72, MC.cream);
  rect(data, 310, 138, 16, groundY - 138, MC.woodDark);
  rect(data, 534, 138, 16, groundY - 138, MC.woodDark);
  text(data, "ALEX", 340, 72, 5, MC.text);
  text(data, "SSSSS...", 355, 112, 2, MC.creeperDark);

  // Big creeper (pixel face + body), slight flash when "hissing"
  const flash = Math.floor(t / 5) % 8 >= 6;
  const body = flash ? [120, 200, 120] : MC.creeper;
  const dark = flash ? [70, 150, 70] : MC.creeperDark;
  const cx = 90;
  const cy = groundY - 96 + Math.floor(Math.sin(t / 5) * 2);

  // head 4x4 face pattern
  rect(data, cx, cy, 64, 64, body);
  // eyes
  rect(data, cx + 8, cy + 16, 16, 16, MC.face);
  rect(data, cx + 40, cy + 16, 16, 16, MC.face);
  // mouth (classic creeper)
  rect(data, cx + 24, cy + 32, 16, 8, MC.face);
  rect(data, cx + 16, cy + 40, 8, 16, MC.face);
  rect(data, cx + 40, cy + 40, 8, 16, MC.face);
  rect(data, cx + 24, cy + 40, 16, 8, MC.face);
  // body
  rect(data, cx + 8, cy + 64, 48, 40, dark);
  // legs
  rect(data, cx + 4, cy + 100, 16, 20, body);
  rect(data, cx + 44, cy + 100, 16, 20, body);
  rect(data, cx + 20, cy + 100, 12, 16, dark);
  rect(data, cx + 32, cy + 100, 12, 16, dark);

  // TNT block popping near creeper when flashing
  if (flash) {
    rect(data, cx + 72, cy + 70, 28, 28, MC.tnt);
    rect(data, cx + 78, cy + 64, 6, 10, MC.fuse);
    text(data, "!", cx + 80, cy + 78, 2, MC.cream);
  }

  // Particles (leaves / hiss)
  for (let i = 0; i < 12; i++) {
    const px = (cx + 30 + i * 17 + t * 3) % 200;
    const py = cy + 20 + ((i * 11 + t * 2) % 60);
    rect(data, px, py, 3, 3, i % 2 ? MC.creeper : MC.creeperDark);
  }

  // Hotbar creeper-themed
  const hbY = H - 34;
  const hbX = (W - 9 * 34) / 2;
  for (let i = 0; i < 9; i++) {
    const sx = hbX + i * 34;
    rect(data, sx, hbY, 32, 32, [35, 35, 35]);
    rect(data, sx + 2, hbY + 2, 28, 28, [80, 80, 80]);
    if (i === Math.floor(t / 5) % 9) {
      hline(data, sx, hbY, 32, [230, 230, 230]);
      hline(data, sx, hbY + 31, 32, [230, 230, 230]);
      vline(data, sx, hbY, 32, [230, 230, 230]);
      vline(data, sx + 31, hbY, 32, [230, 230, 230]);
    }
  }
  const items = [MC.creeper, MC.grass, MC.dirt, MC.tnt, MC.stone, MC.wood, MC.fuse, MC.face, MC.creeperDark];
  for (let i = 0; i < 9; i++) rect(data, hbX + i * 34 + 8, hbY + 8, 16, 16, items[i]);

  return data;
}

function makeMinecraftNether(t, frames) {
  const data = new Uint8ClampedArray(W * H * 4);
  const B = 16;
  const N = {
    void: [25, 8, 8],
    fog: [60, 15, 15],
    netherrack: [110, 45, 45],
    netherrackDark: [80, 30, 30],
    soul: [40, 70, 80],
    soulLight: [70, 200, 210],
    lava: [255, 120, 30],
    lavaHot: [255, 200, 60],
    lavaDark: [180, 50, 10],
    basalt: [50, 50, 55],
    basaltL: [70, 70, 78],
    glowstone: [255, 200, 80],
    wood: [70, 35, 30],
    cream: [255, 220, 180],
    text: [40, 15, 10],
    crimson: [140, 30, 50],
    portal: [90, 30, 160],
    portalBright: [160, 80, 255],
  };

  // Nether background
  for (let y = 0; y < H; y++) {
    const col = blend(N.void, N.fog, y / H);
    for (let x = 0; x < W; x++) {
      const n = ((x * 7 + y * 13 + t) % 5) - 2;
      set(data, x, y, [col[0] + n, col[1], col[2]]);
    }
  }

  // Lava falls
  for (let f = 0; f < 4; f++) {
    const fx = 60 + f * 220;
    for (let y = 0; y < 150; y++) {
      const wobble = Math.floor(Math.sin((y + t * 3) / 8) * 3);
      const col = (y + t) % 6 < 3 ? N.lava : N.lavaHot;
      rect(data, fx + wobble, y, 10, 4, col);
    }
  }

  // Ground netherrack
  const groundY = 160;
  for (let x = 0; x < W; x += B) {
    const c = (x / B + Math.floor(t / 6)) % 2 ? N.netherrack : N.netherrackDark;
    rect(data, x, groundY, B, B, c);
    rect(data, x, groundY + B, B, B, N.basalt);
    rect(data, x, groundY + 2 * B, B, H - (groundY + 2 * B), (x / B) % 2 ? N.basaltL : N.basalt);
  }

  // Lava pool on ground
  for (let x = 400; x < 560; x += 8) {
    const col = ((x / 8 + t) % 4 < 2) ? N.lava : N.lavaHot;
    rect(data, x, groundY - 4, 8, 8, col);
  }

  // Portal frame (obsidian-ish + purple swirl)
  const px = 650;
  const py = 50;
  rect(data, px, py, 120, 110, N.basalt);
  for (let y = 0; y < 90; y++) {
    for (let x = 0; x < 80; x++) {
      const wave = Math.sin((x + y + t * 2) / 5);
      const col = wave > 0 ? N.portal : N.portalBright;
      set(data, px + 20 + x, py + 10 + y, col);
    }
  }
  // portal frame border
  rect(data, px, py, 120, 10, [20, 15, 25]);
  rect(data, px, py + 100, 120, 10, [20, 15, 25]);
  rect(data, px, py, 12, 110, [20, 15, 25]);
  rect(data, px + 108, py, 12, 110, [20, 15, 25]);

  // Glowstone hanging
  rect(data, 200, 20, 24, 24, N.glowstone);
  rect(data, 206, 44, 8, 20, N.basalt);
  glow(data, 212, 32, 40, 0.35);

  // Soul fire
  const fireX = 120;
  const fireH = 28 + Math.floor(Math.sin(t / 3) * 8);
  for (let y = 0; y < fireH; y++) {
    const w = 6 + Math.floor((1 - y / fireH) * 10);
    rect(data, fireX - w / 2, groundY - y, w, 2, y % 3 ? N.soulLight : N.soul);
  }
  rect(data, fireX - 12, groundY, 24, 8, N.basalt);

  // Crimson sign
  rect(data, 250, 48, 320, 92, N.crimson);
  rect(data, 258, 56, 304, 76, N.cream);
  rect(data, 280, 140, 16, groundY - 140, N.wood);
  rect(data, 520, 140, 16, groundY - 140, N.wood);
  text(data, "ALEX", 320, 70, 5, N.text);
  text(data, "NETHER", 355, 110, 2, N.crimson);

  // Ghast-ish floating orb
  const gx = 40 + Math.floor(Math.sin(t / 8) * 10);
  const gy = 40 + Math.floor(Math.cos(t / 10) * 8);
  rect(data, gx, gy, 50, 40, [230, 230, 230]);
  rect(data, gx + 10, gy + 12, 8, 8, [40, 40, 40]);
  rect(data, gx + 32, gy + 12, 8, 8, [40, 40, 40]);
  rect(data, gx + 16, gy + 26, 18, 6, [180, 100, 100]);
  // tear
  if (t % 10 < 5) rect(data, gx + 22, gy + 40, 4, 10, N.soulLight);

  // Hotbar nether
  const hbY = H - 34;
  const hbX = (W - 9 * 34) / 2;
  for (let i = 0; i < 9; i++) {
    const sx = hbX + i * 34;
    rect(data, sx, hbY, 32, 32, [25, 15, 15]);
    rect(data, sx + 2, hbY + 2, 28, 28, [60, 30, 30]);
    if (i === Math.floor(t / 5) % 9) {
      hline(data, sx, hbY, 32, N.lavaHot);
      hline(data, sx, hbY + 31, 32, N.lavaHot);
      vline(data, sx, hbY, 32, N.lavaHot);
      vline(data, sx + 31, hbY, 32, N.lavaHot);
    }
  }
  const items = [N.netherrack, N.lava, N.glowstone, N.portal, N.soulLight, N.crimson, N.basalt, N.lavaHot, N.wood];
  for (let i = 0; i < 9; i++) rect(data, hbX + i * 34 + 8, hbY + 8, 16, 16, items[i]);

  return data;
}

function writeGif(filename, makeFrame, frames = 42, delay = 70) {
  const gif = GIFEncoder();
  for (let t = 0; t < frames; t++) {
    const frame = makeFrame(t, frames);
    const palette = quantize(frame, 256);
    const index = applyPalette(frame, palette);
    gif.writeFrame(index, W, H, { palette, delay });
  }
  gif.finish();
  const out = path.join(__dirname, "..", "assets", filename);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(gif.bytes()));
  console.log("✓", filename, `${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
}

// Generate hybrid cyber + minecraft
writeGif("tech-cyber-minecraft.gif", makeCyberMinecraft, 48, 60);
