/**
 * The application's icon artwork, defined once.
 *
 * Every icon the project ships is a scale of the single mark described here, on
 * a full-bleed opaque background with no shape baked in. The platform applies
 * the icon outline; anything already drawn here would be masked a second time,
 * which is what produced the white halo this replaced.
 *
 * This module has no filesystem side effects, so the CLI and the tests can both
 * import it and build every icon in memory.
 */

import { deflateSync } from "node:zlib";

/** Design-space canvas. Every output size is a scale of this. */
export const CANVAS = 512;

/** Near-black, matching the manifest's `theme_color`. */
export const BACKGROUND = "#0c0a09";

export const BAR_WIDTH = 52;
export const BAR_GAP = 30;
/** Equal to half the width, which gives the bars stadium ends. */
export const BAR_RADIUS = BAR_WIDTH / 2;

/**
 * Ascending heights on a common baseline, lightest bar first. Carried over from
 * the previous mark unchanged: this is not a redesign.
 */
export const BARS = [
  { height: 130, color: "#fafaf9" },
  { height: 195, color: "#84cc16" },
  { height: 260, color: "#a1a1aa" },
];

/**
 * The mark's bounding box, derived rather than restated so that centring cannot
 * drift away from the bars. The previous artwork sat 4.5–9.4% of its height
 * above centre in every variant; centring the box is what fixes that.
 */
export const MARK = (() => {
  const width = BARS.length * BAR_WIDTH + (BARS.length - 1) * BAR_GAP;
  const height = Math.max(...BARS.map((bar) => bar.height));
  return {
    left: (CANVAS - width) / 2,
    top: (CANVAS - height) / 2,
    width,
    height,
    centreX: CANVAS / 2,
    centreY: CANVAS / 2,
  };
})();

/** Shared bottom edge of all three bars. */
export const BASELINE = MARK.top + MARK.height;

/**
 * Radius of the circle a maskable launcher is guaranteed to preserve: the inner
 * 80% of the canvas. See `design.md` D3 for why this is the 80% figure and not
 * the stricter native-Android one.
 */
export const SAFE_RADIUS_FACTOR = 0.4;

export function safeRadius(canvas = CANVAS) {
  return canvas * SAFE_RADIUS_FACTOR;
}

/** The three bar rectangles in design space. */
export function barRects() {
  return BARS.map((bar, index) => ({
    x: MARK.left + index * (BAR_WIDTH + BAR_GAP),
    y: BASELINE - bar.height,
    width: BAR_WIDTH,
    height: bar.height,
    radius: BAR_RADIUS,
    color: bar.color,
  }));
}

/**
 * Every file the generator owns.
 *
 * The 512 px standard and maskable icons are intentionally the same artwork:
 * the mark fits the maskable safe circle, so one file serves both purposes and
 * the launcher cannot pick a differently-proportioned logo. They stay separate
 * files because the manifest must declare both purposes.
 */
export const OUTPUTS = [
  { file: "pwa-64x64.png", format: "png", size: 64 },
  { file: "pwa-192x192.png", format: "png", size: 192 },
  { file: "pwa-512x512.png", format: "png", size: 512 },
  { file: "maskable-icon-512x512.png", format: "png", size: 512 },
  { file: "apple-touch-icon-180x180.png", format: "png", size: 180 },
  { file: "favicon.ico", format: "ico", sizes: [16, 32, 48] },
  { file: "icon.svg", format: "svg" },
];

export const OUTPUT_FILES = OUTPUTS.map((output) => output.file);

/* ------------------------------------------------------------------ *
 * Rasterising
 * ------------------------------------------------------------------ */

function hexToRgb(hex) {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

/**
 * Supersampling grid per axis, as a pure function of the output size.
 *
 * Small icons need a denser grid because a bar cap is only a couple of pixels
 * wide there and a coarse grid visibly facets it. Deriving this from the size
 * keeps the output byte-for-byte reproducible.
 */
function sampleCount(size) {
  if (size <= 32) return 8;
  if (size <= 64) return 6;
  return 4;
}

function insideRoundedRect(x, y, rect) {
  if (x < rect.x || x > rect.x + rect.width) return false;
  if (y < rect.y || y > rect.y + rect.height) return false;
  // Only the four corner regions need the distance test; the straight edges of
  // the stadium are already covered by the bounds check above.
  const cx = Math.min(Math.max(x, rect.x + rect.radius), rect.x + rect.width - rect.radius);
  const cy = Math.min(Math.max(y, rect.y + rect.radius), rect.y + rect.height - rect.radius);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= rect.radius * rect.radius;
}

function coverage(x, y, rect, samples) {
  let hits = 0;
  for (let sy = 0; sy < samples; sy++) {
    const qy = y + (sy + 0.5) / samples;
    if (qy < rect.y || qy > rect.y + rect.height) continue;
    for (let sx = 0; sx < samples; sx++) {
      const qx = x + (sx + 0.5) / samples;
      if (insideRoundedRect(qx, qy, rect)) hits++;
    }
  }
  return hits / (samples * samples);
}

/**
 * Render the mark at `size` into 8-bit RGB.
 *
 * The background is laid down across the whole canvas first, which is what
 * makes the result full-bleed: there is no margin for a platform mask to
 * expose, and no alpha channel for one to composite against.
 */
export function renderRgb(size) {
  const scale = size / CANVAS;
  const samples = sampleCount(size);
  const background = hexToRgb(BACKGROUND);
  const data = Buffer.alloc(size * size * 3);

  for (let i = 0; i < size * size; i++) {
    data[i * 3] = background[0];
    data[i * 3 + 1] = background[1];
    data[i * 3 + 2] = background[2];
  }

  const rects = barRects().map((rect) => ({
    ...rect,
    x: rect.x * scale,
    y: rect.y * scale,
    width: rect.width * scale,
    height: rect.height * scale,
    radius: rect.radius * scale,
  }));

  for (const rect of rects) {
    const color = hexToRgb(rect.color);
    const minX = Math.max(0, Math.floor(rect.x));
    const maxX = Math.min(size - 1, Math.ceil(rect.x + rect.width));
    const minY = Math.max(0, Math.floor(rect.y));
    const maxY = Math.min(size - 1, Math.ceil(rect.y + rect.height));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const alpha = coverage(x, y, rect, samples);
        if (alpha <= 0) continue;
        const offset = (y * size + x) * 3;
        for (let c = 0; c < 3; c++) {
          data[offset + c] = Math.round(data[offset + c] + (color[c] - data[offset + c]) * alpha);
        }
      }
    }
  }

  return data;
}

/* ------------------------------------------------------------------ *
 * PNG encoding
 * ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i++) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, body) {
  const out = Buffer.alloc(12 + body.length);
  out.writeUInt32BE(body.length, 0);
  out.write(type, 4, 4, "latin1");
  body.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + body.length)), 8 + body.length);
  return out;
}

/**
 * Encode 8-bit truecolour RGB as a PNG.
 *
 * Deliberately alpha-free: the artwork is fully opaque by design, so there is
 * no channel in which transparency could be reintroduced. Only `IHDR`, `IDAT`
 * and `IEND` are written — no timestamp, no gamma, no text — so a regenerated
 * file is comparable with the committed one.
 */
function encodePng(size, rgb) {
  const stride = size * 3;
  const raw = Buffer.alloc(size * (stride + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: truecolour
  header[10] = 0; // deflate
  header[11] = 0; // adaptive filtering
  header[12] = 0; // no interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Build one install icon as a PNG of the given square size. */
export function buildIconPng(size) {
  return encodePng(size, renderRgb(size));
}

/* ------------------------------------------------------------------ *
 * ICO and SVG
 * ------------------------------------------------------------------ */

/**
 * Wrap PNG frames in an ICO container.
 *
 * The committed favicon was a single 48 px entry, so a browser asking for 16 or
 * 32 px had to downscale a larger image. The sizes below are the ones browsers
 * actually request. PNG-compressed frames, which is what the previous file used.
 */
export function buildIco(sizes) {
  const frames = sizes.map((size) => ({ size, png: buildIconPng(size) }));

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(frames.length, 4);

  const directory = Buffer.alloc(frames.length * 16);
  let offset = header.length + directory.length;

  frames.forEach((frame, index) => {
    const entry = index * 16;
    // 0 is the ICO encoding of 256.
    directory[entry] = frame.size >= 256 ? 0 : frame.size;
    directory[entry + 1] = directory[entry];
    directory[entry + 2] = 0; // palette size: not palette-compressed
    directory[entry + 3] = 0; // reserved
    directory.writeUInt16LE(1, entry + 4); // colour planes
    directory.writeUInt16LE(32, entry + 6); // bits per pixel
    directory.writeUInt32LE(frame.png.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += frame.png.length;
  });

  return Buffer.concat([header, directory, ...frames.map((frame) => frame.png)]);
}

/**
 * The scalable icon, emitted from the same geometry as the raster icons so the
 * two cannot drift apart.
 *
 * It carries the dark background rather than being transparent: the lightest
 * bar is near-white and would disappear against a light browser tab bar.
 */
export function buildSvg() {
  const bars = barRects()
    .map(
      (bar) =>
        `    <rect x="${bar.x}" y="${bar.y}" width="${bar.width}" height="${bar.height}" ` +
        `rx="${bar.radius}" fill="${bar.color}" />`,
    )
    .join("\n");

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}" ` +
    `width="${CANVAS}" height="${CANVAS}">\n` +
    `  <title>Marquette Tracker</title>\n` +
    `  <rect width="${CANVAS}" height="${CANVAS}" fill="${BACKGROUND}" />\n` +
    `${bars}\n` +
    `</svg>\n`
  );
}

/** Build the bytes for one entry of the output table. */
export function build(output) {
  if (output.format === "png") return buildIconPng(output.size);
  if (output.format === "ico") return buildIco(output.sizes);
  if (output.format === "svg") return Buffer.from(buildSvg(), "utf8");
  throw new Error(`unknown output format ${output.format} for ${output.file}`);
}
