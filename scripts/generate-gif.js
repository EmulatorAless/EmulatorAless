/**
 * Generates assets/tech-cyber-calm.gif for the profile README.
 * Usage: npm install && node scripts/generate-gif.js
 */
const fs = require("fs");
const path = require("path");
const { GIFEncoder, quantize, applyPalette } = require("gifenc");

const W = 840;
const H = 240;
const FRAMES = 40;
const DELAY = 70;

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
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10001", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  W: ["10001", "10001", "10001", "10001", "10101", "10101", "01010"],
  X: ["10001", "01010", "00100", "00100", "00100", "01010", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00100", "01000", "10000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
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

function softGlow(data, cx, cy, radius, rgb, strength) {
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const d = Math.sqrt(x * x + y * y) / radius;
      if (d >= 1) continue;
      const px = (cx + x) | 0;
      const py = (cy + y) | 0;
      if (px < 0 || py < 0 || px >= W || py >= H) continue;
      const i = idx(px, py);
      const f = (1 - d) * strength;
      data[i] = Math.min(255, data[i] + rgb[0] * f);
      data[i + 1] = Math.min(255, data[i + 1] + rgb[1] * f);
      data[i + 2] = Math.min(255, data[i + 2] + rgb[2] * f);
    }
  }
}

function makeFrame(t) {
  const data = new Uint8ClampedArray(W * H * 4);
  const bg = [14, 18, 28];
  const teal = [72, 180, 195];
  const tealSoft = [48, 120, 135];
  const tealDim = [36, 70, 85];
  const ice = [180, 220, 230];
  const white = [236, 244, 248];
  const muted = [120, 145, 158];
  const panel = [20, 28, 40];
  const grid = [28, 40, 55];
  const line = [40, 65, 80];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const g = (y / H) * 10;
      const pulse = Math.sin(x * 0.01 + t * 0.08) * 3;
      set(data, x, y, [
        Math.max(0, bg[0] + g + pulse * 0.3),
        Math.max(0, bg[1] + g + pulse * 0.5),
        Math.max(0, bg[2] + g + 4 + pulse),
      ]);
    }
  }

  const horizon = 175;
  for (let row = 0; row < 8; row++) {
    const y = horizon + row * row * 1.2 + row * 4;
    if (y >= H) break;
    hline(data, 0, y | 0, W, blend(grid, tealDim, 0.2 + row * 0.05));
  }
  for (let i = -12; i <= 12; i++) {
    const x0 = W / 2 + i * 18;
    for (let y = horizon; y < H; y++) {
      const perspective = (y - horizon) / (H - horizon);
      const x = (x0 + (x0 - W / 2) * perspective * 2.2) | 0;
      set(data, x, y, blend(grid, tealDim, 0.15 + perspective * 0.3));
    }
  }

  for (let x = 40; x < W - 40; x += 40) vline(data, x, 20, horizon - 30, grid);
  for (let y = 20; y < horizon - 20; y += 40) hline(data, 40, y, W - 80, grid);

  softGlow(data, 760 + Math.sin(t / 12) * 12, 48, 80, teal, 0.16);
  softGlow(data, 120, 200, 50, tealSoft, 0.08);

  const hx = 710;
  const hy = 95;
  const hexR = 38 + Math.sin(t / 10) * 2;
  for (let a = 0; a < 6; a++) {
    const a1 = (Math.PI / 3) * a + t * 0.04;
    const a2 = (Math.PI / 3) * (a + 1) + t * 0.04;
    const x1 = hx + Math.cos(a1) * hexR;
    const y1 = hy + Math.sin(a1) * hexR;
    const x2 = hx + Math.cos(a2) * hexR;
    const y2 = hy + Math.sin(a2) * hexR;
    for (let s = 0; s <= 20; s++) {
      const u = s / 20;
      set(data, (x1 + (x2 - x1) * u) | 0, (y1 + (y2 - y1) * u) | 0, teal);
      set(data, (x1 + (x2 - x1) * u) | 0, ((y1 + (y2 - y1) * u) | 0) + 1, tealSoft);
    }
  }
  softGlow(data, hx, hy, 18, ice, 0.2);
  rect(data, hx - 3, hy - 3, 6, 6, teal);

  vline(data, 24, 30, 160, tealDim);
  hline(data, 24, 50, 20, tealDim);
  hline(data, 24, 110, 28, tealSoft);
  hline(data, 24, 170, 16, tealDim);
  rect(data, 20, 48, 8, 4, teal);
  rect(data, 20, 108, 8, 4, teal);
  rect(data, 20, 168, 8, 4, tealSoft);

  const panelH = 158;
  rect(data, 48, 38, 420, panelH, panel);
  const brackets = [
    [48, 38],
    [48 + 420 - 16, 38],
    [48, 38 + panelH - 16],
    [48 + 420 - 16, 38 + panelH - 16],
  ];
  for (const [bx, by] of brackets) {
    hline(data, bx, by, 16, teal);
    vline(data, bx, by, 16, teal);
    hline(data, bx, by + 15, 16, teal);
    vline(data, bx + 15, by, 16, teal);
  }

  rect(data, 60, 46, 6, 6, teal);
  rect(data, 72, 46, 6, 6, tealSoft);
  rect(data, 84, 46, 6, 6, tealDim);
  text(data, "SYS.OK", 100, 44, 1, muted);

  const scanY = 38 + ((t * 2) % panelH);
  for (let x = 48; x < 468; x++) set(data, x, scanY, blend(panel, teal, 0.25));

  text(data, "ALEX", 68, 62, 7, white);
  rect(data, 68, 62 + 7 * 7 + 3, 4 * 42, 2, tealSoft);
  if (Math.floor(t / 6) % 2 === 0) rect(data, 68 + 4 * 42 + 6, 62, 4, 49, teal);

  text(data, "FULL STACK / SAAS", 68, 128, 3, teal);
  text(data, "WEB  MOBILE  BACKEND", 68, 158, 2, muted);

  const barY = 184;
  rect(data, 68, barY, 360, 3, line);
  const progress = Math.max(12, Math.floor(((t % FRAMES) / FRAMES) * 360));
  rect(data, 68, barY, progress, 3, teal);
  rect(data, 68 + ((t * 8) % 360), barY - 3, 5, 9, ice);

  for (let i = 0; i < 6; i++) {
    const h = 10 + Math.abs(Math.sin(t / 6 + i * 0.9) * 22);
    rect(data, 500 + i * 10, 160 - h, 6, h, i % 2 ? tealSoft : tealDim);
  }
  text(data, "CORE", 500, 168, 2, muted);

  for (let i = 0; i < 3; i++) {
    const ang = t * 0.1 + i * ((Math.PI * 2) / 3);
    rect(data, (hx + Math.cos(ang) * 52) | 0, (hy + Math.sin(ang) * 52) | 0, 3, 3, ice);
  }

  hline(data, 40, 16, W - 80, tealDim);
  rect(data, 40, 14, 40, 2, teal);
  rect(data, W - 80, 14, 40, 2, tealSoft);

  return data;
}

const gif = GIFEncoder();
for (let t = 0; t < FRAMES; t++) {
  const frame = makeFrame(t);
  const palette = quantize(frame, 256);
  const index = applyPalette(frame, palette);
  gif.writeFrame(index, W, H, { palette, delay: DELAY });
}
gif.finish();

const out = path.join(__dirname, "..", "assets", "tech-cyber-calm.gif");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.from(gif.bytes()));
console.log("✓", out, `${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
