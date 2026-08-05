const fs = require("fs");
const path = require("path");
const { GIFEncoder, quantize, applyPalette } = require("gifenc");

const WIDTH = 840;
const HEIGHT = 260;
const FRAMES = 40;
const DELAY = 70;

const BG = [28, 36, 46];
const TEAL = [94, 200, 184];
const TEAL_DIM = [42, 100, 96];
const GRID = [40, 54, 66];
const MUTED = [155, 176, 184];
const WHITE = [244, 247, 248];

function idx(x, y) {
  return (y * WIDTH + x) * 4;
}

function setPixel(data, x, y, rgb) {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const i = idx(x, y);
  data[i] = rgb[0];
  data[i + 1] = rgb[1];
  data[i + 2] = rgb[2];
  data[i + 3] = 255;
}

function fillRect(data, x, y, w, h, rgb) {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) setPixel(data, px, py, rgb);
  }
}

function drawLineH(data, x, y, len, rgb) {
  for (let i = 0; i < len; i++) setPixel(data, x + i, y, rgb);
}

function drawLineV(data, x, y, len, rgb) {
  for (let i = 0; i < len; i++) setPixel(data, x, y + i, rgb);
}

function blend(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
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
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00100", "01000", "10000", "10000", "00000"],
  "<": ["00001", "00010", "00100", "01000", "00100", "00010", "00001"],
  ">": ["10000", "01000", "00100", "00010", "00100", "01000", "10000"],
  "|": ["00100", "00100", "00100", "00100", "00100", "00100", "00100"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
};

function drawChar(data, ch, x, y, scale, rgb) {
  const glyph = FONT[ch] || FONT[" "];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if (glyph[row][col] === "1") {
        fillRect(data, x + col * scale, y + row * scale, scale, scale, rgb);
      }
    }
  }
}

function drawText(data, text, x, y, scale, rgb) {
  let cx = x;
  for (const ch of text) {
    drawChar(data, ch, cx, y, scale, rgb);
    cx += 6 * scale;
  }
}

function makeFrame(t) {
  const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const n = ((x * 13 + y * 29 + t) % 5) - 2;
      setPixel(data, x, y, [BG[0] + n, BG[1] + n, BG[2] + n]);
    }
  }

  for (let x = 0; x < WIDTH; x += 30) drawLineV(data, x, 0, HEIGHT, GRID);
  for (let y = 0; y < HEIGHT; y += 30) drawLineH(data, 0, y, WIDTH, GRID);

  // Glow orb
  const orbX = Math.floor(740 + Math.sin(t / 9) * 16);
  const orbY = Math.floor(58 + Math.cos(t / 11) * 10);
  for (let y = -55; y <= 55; y++) {
    for (let x = -55; x <= 55; x++) {
      const d = Math.sqrt(x * x + y * y) / 55;
      if (d >= 1) continue;
      const px = orbX + x;
      const py = orbY + y;
      if (px < 0 || py < 0 || px >= WIDTH || py >= HEIGHT) continue;
      const i = idx(px, py);
      const f = (1 - d) * 0.25;
      data[i] = Math.min(255, data[i] + TEAL[0] * f);
      data[i + 1] = Math.min(255, data[i + 1] + TEAL[1] * f);
      data[i + 2] = Math.min(255, data[i + 2] + TEAL[2] * f);
    }
  }

  fillRect(data, 34, 40, 4, 170, TEAL);

  // Scan line
  const scanY = Math.floor((t / FRAMES) * HEIGHT);
  for (let x = 0; x < WIDTH; x++) {
    setPixel(data, x, scanY, blend(BG, TEAL, 0.4));
    if (scanY + 1 < HEIGHT) setPixel(data, x, scanY + 1, blend(BG, TEAL, 0.18));
  }

  // Always-visible branding
  drawText(data, "ALEX", 58, 58, 7, WHITE);
  drawText(data, "FULL STACK / SAAS", 58, 128, 3, TEAL);
  drawText(data, "WEB  MOBILE  BACKEND", 58, 168, 2, MUTED);

  // Blinking cursor after ALEX
  if (Math.floor(t / 5) % 2 === 0) {
    fillRect(data, 58 + 4 * 6 * 7 + 4, 58, 5, 7 * 7, TEAL);
  }

  // Animated brackets
  const pulse = 0.4 + 0.6 * Math.abs(Math.sin(t / 7));
  drawText(data, "</>", 720, 190, 3, blend(TEAL_DIM, TEAL, pulse));

  // Progress bar
  const progress = Math.floor(((t % FRAMES) / FRAMES) * 700);
  fillRect(data, 58, 220, 700, 4, TEAL_DIM);
  fillRect(data, 58, 220, Math.max(8, progress), 4, TEAL);

  // Moving particle dots on bar
  const dot = 58 + ((t * 14) % 700);
  fillRect(data, dot, 217, 6, 10, WHITE);

  return data;
}

// Need gifenc installed
const gif = GIFEncoder();
for (let t = 0; t < FRAMES; t++) {
  const frame = makeFrame(t);
  const palette = quantize(frame, 256);
  const index = applyPalette(frame, palette);
  gif.writeFrame(index, WIDTH, HEIGHT, { palette, delay: DELAY });
}
gif.finish();

const out = path.join(__dirname, "..", "assets", "tech-intro.gif");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.from(gif.bytes()));
console.log("Created", out, `(${(fs.statSync(out).size / 1024).toFixed(1)} KB)`);
