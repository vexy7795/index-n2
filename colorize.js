// Extract dominant colors from local media files using sharp + median cut.
// Stores results in .cache/colors.json. Skips files already cached.

import sharp from "sharp";
import quantize from "quantize";
import { readFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { atomicWriteFileSync } from "./atomic-write.js";

let CACHE_DIR, COLORS_PATH;

export function setCacheDir(dir) {
  CACHE_DIR = dir;
  COLORS_PATH = join(dir, "colors.json");
}
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

const SAMPLE_SIZE = 200;
const MIN_RATIO = 0.25; // minimum % to keep (matches Eagle)
const SCHEMA_VERSION = 5;

// --- Color conversions ---

// sRGB → Lab (D65 illuminant)
function rgbToLab(r, g, b) {
  let R = r / 255, G = g / 255, B = b / 255;
  R = R > 0.04045 ? Math.pow((R + 0.055) / 1.055, 2.4) : R / 12.92;
  G = G > 0.04045 ? Math.pow((G + 0.055) / 1.055, 2.4) : G / 12.92;
  B = B > 0.04045 ? Math.pow((B + 0.055) / 1.055, 2.4) : B / 12.92;

  let X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
  let Y = (R * 0.2126729 + G * 0.7151522 + B * 0.0721750) / 1.00000;
  let Z = (R * 0.0193339 + G * 0.1191920 + B * 0.9503041) / 1.08883;

  const f = (t) => t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116);
  const fx = f(X), fy = f(Y), fz = f(Z);

  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bb = 200 * (fy - fz);
  return [L, a, bb];
}

async function extractColors(filePath) {
  try {
    const { data, info } = await sharp(filePath)
      .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: "inside" })
      .raw()
      .removeAlpha()
      .toBuffer({ resolveWithObject: true });

    const total = info.width * info.height;
    let sumL = 0, sumChroma = 0;
    let darkCount = 0, brightCount = 0;

    // Collect RGB pixels for quantize + compute Lab aggregates
    const pixels = [];
    for (let i = 0; i < data.length; i += 3) {
      pixels.push([data[i], data[i + 1], data[i + 2]]);
      const [L, a, b] = rgbToLab(data[i], data[i + 1], data[i + 2]);
      const chroma = Math.sqrt(a * a + b * b);
      sumL += L;
      sumChroma += chroma;
      if (L < 25) darkCount++;
      if (L > 75) brightCount++;
    }

    // Median cut quantization → 12 colors
    const result = quantize(pixels, 12);
    if (!result) return null;
    const pal = result.palette();
    if (!pal) return null;

    // Count pixels per palette color
    const counts = new Array(pal.length).fill(0);
    const palKeys = pal.map(c => c.join(","));
    for (const px of pixels) {
      const mapped = result.map(px);
      if (!mapped) continue;
      const key = mapped.join(",");
      const idx = palKeys.indexOf(key);
      if (idx >= 0) counts[idx]++;
    }

    // Sort by count, progressive filtering
    const indexed = pal.map((c, i) => ({ rgb: c, count: counts[i] }));
    indexed.sort((a, b) => b.count - a.count);
    const kept = [];
    for (let i = 0; i < indexed.length; i++) {
      const ratio = (indexed[i].count / total) * 100;
      if (ratio < MIN_RATIO) continue;
      if (kept.length < 5) { kept.push(indexed[i]); }
      else if (ratio >= 1) { kept.push(indexed[i]); }
    }
    if (kept.length > 10) kept.length = 10;

    const palette = kept.map(c => {
      const [L, a, b] = rgbToLab(c.rgb[0], c.rgb[1], c.rgb[2]);
      return {
        L: Math.round(L), a: Math.round(a), b: Math.round(b),
        w: Math.round((c.count / total) * 1000) / 1000,
      };
    });

    return {
      palette,
      avgL: Math.round(sumL / total),
      avgChroma: Math.round(sumChroma / total),
      darkPct: Math.round((darkCount / total) * 100),
      brightPct: Math.round((brightCount / total) * 100),
    };
  } catch (e) {
    return null;
  }
}

export async function buildColorCache(mediaDir, manifestPath, onProgress) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  // Build set of pfp filenames to skip
  const pfpFiles = new Set();
  if (manifestPath && existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
      for (const e of manifest.entries) {
        if (e.sourceUrl?.includes("profile_images") && e.localPath) {
          pfpFiles.add(basename(e.localPath));
        }
      }
    } catch {}
  }

  let cache = {};
  if (existsSync(COLORS_PATH)) {
    try {
      const raw = JSON.parse(readFileSync(COLORS_PATH, "utf-8"));
      // Migrate: rebuild if version mismatch or wrong shape
      if (raw.__schema === SCHEMA_VERSION) {
        cache = raw;
        delete cache.__schema;
      } else {
        console.log("Colors: schema changed, rebuilding...");
        cache = {};
      }
    } catch {}
  }

  const files = readdirSync(mediaDir).filter(f => {
    if (pfpFiles.has(f)) return false;
    const ext = "." + f.split(".").pop().toLowerCase();
    return IMAGE_EXTS.has(ext);
  });

  const todo = files.filter(f => !cache[f]);
  if (todo.length === 0) {
    console.log(`Colors: ${Object.keys(cache).length} cached, nothing new`);
    cache.__schema = SCHEMA_VERSION;
    atomicWriteFileSync(COLORS_PATH, JSON.stringify(cache));
    delete cache.__schema;
    return cache;
  }

  console.log(`Colors: processing ${todo.length} new images...`);
  let done = 0;
  for (const f of todo) {
    const colors = await extractColors(join(mediaDir, f));
    if (colors) cache[f] = colors;
    done++;
    if (onProgress) onProgress(done, todo.length);
    if (done % 200 === 0) {
      cache.__schema = SCHEMA_VERSION;
      atomicWriteFileSync(COLORS_PATH, JSON.stringify(cache));
      delete cache.__schema;
      console.log(`  ${done}/${todo.length}`);
    }
  }
  cache.__schema = SCHEMA_VERSION;
  atomicWriteFileSync(COLORS_PATH, JSON.stringify(cache));
  delete cache.__schema;
  console.log(`Colors: done. Total ${Object.keys(cache).length}`);
  return cache;
}

export function loadColors() {
  if (!existsSync(COLORS_PATH)) return {};
  try {
    const raw = JSON.parse(readFileSync(COLORS_PATH, "utf-8"));
    if (raw.__schema !== SCHEMA_VERSION) return {};
    delete raw.__schema;
    return raw;
  } catch { return {}; }
}
