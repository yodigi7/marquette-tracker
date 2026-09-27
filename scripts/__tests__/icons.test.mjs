import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  BACKGROUND,
  BARS,
  CANVAS,
  OUTPUTS,
  OUTPUT_FILES,
  build,
  buildIconPng,
  buildSvg,
  safeRadius,
} from "../icons.mjs";

/** Small helper so the background is compared through one definition. */
function hexToRgb(hex) {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

// Resolved from the working directory, which Vitest sets to the project root —
// the same assumption `vitest.config.ts` already makes for its setup file.
const PUBLIC_DIR = path.resolve(process.cwd(), "public");

/**
 * Every install icon the project ships. All of these must be fully opaque:
 * a transparent or bordered install icon is masked a second time by the
 * platform, which is what produced the white halo.
 */
const REQUIRED_INSTALL_ICONS = [
  "pwa-64x64.png",
  "pwa-192x192.png",
  "pwa-512x512.png",
  "maskable-icon-512x512.png",
  "apple-touch-icon-180x180.png",
];

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const CHANNELS_BY_COLOR_TYPE = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

function unfilter(raw, width, height, bytesPerPixel) {
  const stride = width * bytesPerPixel;
  const out = new Uint8Array(stride * height);
  let previous = new Uint8Array(stride);
  let pos = 0;

  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const line = raw.subarray(pos, pos + stride);
    pos += stride;
    const row = out.subarray(y * stride, (y + 1) * stride);

    for (let x = 0; x < stride; x++) {
      const a = x >= bytesPerPixel ? row[x - bytesPerPixel] : 0;
      const b = previous[x];
      const c = x >= bytesPerPixel ? previous[x - bytesPerPixel] : 0;
      const value = line[x];

      switch (filter) {
        case 0:
          row[x] = value;
          break;
        case 1:
          row[x] = (value + a) & 0xff;
          break;
        case 2:
          row[x] = (value + b) & 0xff;
          break;
        case 3:
          row[x] = (value + ((a + b) >> 1)) & 0xff;
          break;
        case 4:
          row[x] = (value + paeth(a, b, c)) & 0xff;
          break;
        default:
          throw new Error(`unsupported PNG filter type ${filter} on row ${y}`);
      }
    }
    previous = row;
  }
  return out;
}

/**
 * Decode a PNG to `{ width, height, data }` with 8-bit RGBA pixels.
 *
 * This is deliberately an independent implementation rather than a reuse of
 * the generator's encoder: the committed files must be judged on their own
 * bytes, so a shared assumption cannot hide a defect on both sides.
 */
function decodePng(buffer) {
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (buffer[i] !== PNG_SIGNATURE[i]) throw new Error("not a PNG");
  }

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  let palette = null;
  let transparency = null;
  const idat = [];

  let pos = 8;
  while (pos < buffer.length) {
    const length = buffer.readUInt32BE(pos);
    const type = buffer.toString("latin1", pos + 4, pos + 8);
    const body = buffer.subarray(pos + 8, pos + 8 + length);

    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      bitDepth = body[8];
      colorType = body[9];
      interlace = body[12];
    } else if (type === "PLTE") {
      palette = body;
    } else if (type === "tRNS") {
      transparency = body;
    } else if (type === "IDAT") {
      idat.push(body);
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + length;
  }

  if (bitDepth !== 8) throw new Error(`unsupported PNG bit depth ${bitDepth}`);
  if (interlace !== 0) throw new Error("interlaced PNG is not supported");
  const channels = CHANNELS_BY_COLOR_TYPE[colorType];
  if (channels === undefined) throw new Error(`unsupported PNG color type ${colorType}`);

  const flat = unfilter(inflateSync(Buffer.concat(idat)), width, height, channels);
  const data = new Uint8Array(width * height * 4);
  const keyR = transparency && transparency.length >= 2 ? transparency.readUInt16BE(0) : -1;
  const keyG = transparency && transparency.length >= 4 ? transparency.readUInt16BE(2) : -1;
  const keyB = transparency && transparency.length >= 6 ? transparency.readUInt16BE(4) : -1;

  for (let i = 0; i < width * height; i++) {
    const source = i * channels;
    const target = i * 4;
    let r;
    let g;
    let b;
    let a = 255;

    if (colorType === 3) {
      if (!palette) throw new Error("palette PNG without PLTE");
      const index = flat[source] * 3;
      r = palette[index];
      g = palette[index + 1];
      b = palette[index + 2];
      if (transparency) a = flat[source] < transparency.length ? transparency[flat[source]] : 255;
    } else if (colorType === 0 || colorType === 4) {
      r = g = b = flat[source];
      if (colorType === 4) a = flat[source + 1];
    } else {
      r = flat[source];
      g = flat[source + 1];
      b = flat[source + 2];
      if (colorType === 6) a = flat[source + 3];
      // A single fully transparent colour key is the other way a tRNS chunk
      // can introduce transparency into an image that looks opaque.
      else if (transparency && r === keyR && g === keyG && b === keyB) a = 0;
    }

    data[target] = r;
    data[target + 1] = g;
    data[target + 2] = b;
    data[target + 3] = a;
  }

  return { width, height, data };
}

function readIcon(name) {
  return decodePng(readFileSync(path.join(PUBLIC_DIR, name)));
}

describe("install icon opacity", () => {
  it.each(REQUIRED_INSTALL_ICONS)("%s is fully opaque on every pixel", (name) => {
    const { width, height, data } = readIcon(name);
    let transparent = 0;

    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 255) transparent++;
    }

    expect({ name, width, height, transparent }).toEqual({ name, width, height, transparent: 0 });
  });

  it.each(REQUIRED_INSTALL_ICONS)("%s has a uniform full-bleed background", (name) => {
    const { width, height, data } = readIcon(name);
    const corners = [
      0,
      (width - 1) * 4,
      (height - 1) * width * 4,
      ((height - 1) * width + width - 1) * 4,
    ].map((offset) => Array.from(data.subarray(offset, offset + 3)));

    for (const corner of corners) {
      expect(corner).toEqual(corners[0]);
    }
    // A full-bleed background means the corners are the background colour, not
    // a lighter or transparent surround waiting to be exposed by a platform mask.
    expect(corners[0]).toEqual([12, 10, 9]);
    expect(width).toBe(height);
  });
});

/**
 * Parse an ICO container into its frame directory and raw frame bytes.
 * Independent of the builder in `scripts/icons.mjs` for the same reason the
 * PNG decoder above is: the committed file is judged on its own bytes.
 */
function parseIco(buffer) {
  const reserved = buffer.readUInt16LE(0);
  const type = buffer.readUInt16LE(2);
  const count = buffer.readUInt16LE(4);
  if (reserved !== 0 || type !== 1) throw new Error("not an ICO container");

  const frames = [];
  for (let i = 0; i < count; i++) {
    const entry = 6 + i * 16;
    frames.push({
      // 0 means 256 in the ICO directory.
      width: buffer[entry] === 0 ? 256 : buffer[entry],
      height: buffer[entry + 1] === 0 ? 256 : buffer[entry + 1],
      bytes: buffer.readUInt32LE(entry + 8),
      offset: buffer.readUInt32LE(entry + 12),
    });
  }
  return frames.map((frame) => ({
    ...frame,
    data: buffer.subarray(frame.offset, frame.offset + frame.bytes),
  }));
}

/** Collect the icon filenames a source file declares, ignoring the base prefix. */
function referencedIcons(source) {
  const found = new Set();
  const base = /%BASE_URL%|\/marquette-tracker\//g;

  // `src: "..."` entries in the Vite manifest's icons array.
  for (const match of source.matchAll(/\bsrc:\s*"([^"]+)"/g)) {
    found.add(match[1]);
  }
  // `href="..."` on any <link> whose rel mentions icon.
  for (const match of source.matchAll(/<link\b[^>]*>/g)) {
    const tag = match[0];
    if (!/\brel="[^"]*icon[^"]*"/.test(tag)) continue;
    const href = /\bhref="([^"]+)"/.exec(tag);
    if (href) found.add(href[1].replace(base, ""));
  }
  return [...found];
}

/** True when the pixel at `offset` is the untouched background. */
function isBackground(data, offset, background) {
  return (
    data[offset] === background[0] &&
    data[offset + 1] === background[1] &&
    data[offset + 2] === background[2]
  );
}

/**
 * Index of the first differing element, or -1 when the buffers match.
 *
 * Comparing half a million elements with `toEqual` makes Vitest build a full
 * structural diff, slow enough to dominate the run; this reports the same
 * outcome along with the one fact that is actually useful.
 */
function firstDifference(a, b) {
  if (a.length !== b.length) return Math.min(a.length, b.length);
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return i;
  }
  return -1;
}

const VITE_CONFIG = readFileSync(path.resolve(process.cwd(), "vite.config.ts"), "utf8");
const INDEX_HTML = readFileSync(path.resolve(process.cwd(), "index.html"), "utf8");

describe("declared icon references", () => {
  const references = [
    ...new Set([...referencedIcons(VITE_CONFIG), ...referencedIcons(INDEX_HTML)]),
  ].sort();

  it("declares at least one icon reference", () => {
    expect(references.length).toBeGreaterThan(0);
  });

  it.each(references)("%s is a file the generator produces", (name) => {
    // A reference the generator does not produce is a stale reference: nothing
    // can regenerate or validate it, so it is how the scaffold bolt survived.
    expect(OUTPUT_FILES).toContain(name);
  });

  it.each(references)("%s exists on disk", (name) => {
    expect(existsSync(path.join(PUBLIC_DIR, name))).toBe(true);
  });

  it("declares an Apple touch icon so iOS does not choose one itself", () => {
    // Without this the Home Screen icon is whichever asset the browser picks,
    // which is how the halo reached the device unnoticed.
    expect(INDEX_HTML).toMatch(/<link\b[^>]*rel="apple-touch-icon"/);
  });
});

describe("markable safe area", () => {
  it("keeps the whole mark inside the maskable safe circle", () => {
    const { width, height, data } = decodePng(buildIconPng(CANVAS));
    const background = hexToRgb(BACKGROUND);
    const cx = width / 2;
    const cy = height / 2;
    let farthest = 0;
    let marked = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (isBackground(data, (y * width + x) * 4, background)) continue;
        marked++;
        farthest = Math.max(farthest, Math.hypot(x + 0.5 - cx, y + 0.5 - cy));
      }
    }

    expect(marked).toBeGreaterThan(0);
    expect(farthest).toBeLessThanOrEqual(safeRadius());
  });

  it("centres the mark on the canvas", () => {
    const { width, height, data } = decodePng(buildIconPng(CANVAS));
    const background = hexToRgb(BACKGROUND);
    let minX = width;
    let maxX = -1;
    let minY = height;
    let maxY = -1;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (isBackground(data, (y * width + x) * 4, background)) continue;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }

    expect(maxX).toBeGreaterThan(minX);
    // The mark's bounding box is centred: equal margin on all four sides. Every
    // previous variant sat 4.5-9.4% of its height above centre.
    expect(minX).toBe(width - 1 - maxX);
    expect(minY).toBe(height - 1 - maxY);
  });
});

describe("committed icons match the generator", () => {
  const pngOutputs = OUTPUTS.filter((output) => output.format === "png");

  it("generates every required install icon", () => {
    expect(pngOutputs.map((output) => output.file).sort()).toEqual(
      [...REQUIRED_INSTALL_ICONS].sort(),
    );
  });

  it.each(pngOutputs)("$file matches the committed pixels", (output) => {
    const committed = decodePng(readFileSync(path.join(PUBLIC_DIR, output.file)));
    const built = decodePng(buildIconPng(output.size));

    expect(built.width).toBe(output.size);
    expect(committed.width).toBe(output.size);
    expect(committed.height).toBe(output.size);
    // Compared as decoded pixels, not compressed bytes: the question is whether
    // the committed image shows what the source describes, and that must not
    // depend on a particular zlib version. -1 means every pixel agrees.
    expect({
      file: output.file,
      firstDifferingPixel: firstDifference(committed.data, built.data),
    }).toEqual({ file: output.file, firstDifferingPixel: -1 });
  });

  it.each(OUTPUTS)("$file is generated deterministically", (output) => {
    // 0 means the two runs produced identical bytes.
    expect(Buffer.compare(build(output), build(output))).toBe(0);
  });

  it("produces a multi-size favicon covering the sizes browsers request", () => {
    const frames = parseIco(readFileSync(path.join(PUBLIC_DIR, "favicon.ico")));
    expect(frames.map((frame) => frame.width).sort((a, b) => a - b)).toEqual([16, 32, 48]);
    for (const frame of frames) {
      const image = decodePng(frame.data);
      expect(image.width).toBe(frame.width);
      expect(image.height).toBe(frame.height);
    }
  });

  it("emits a full-bleed scalable icon rather than a transparent one", () => {
    const svg = buildSvg();
    expect(svg).toContain(`<rect width="${CANVAS}" height="${CANVAS}" fill="${BACKGROUND}"`);
    for (const bar of BARS) {
      expect(svg).toContain(bar.color);
    }
  });
});
