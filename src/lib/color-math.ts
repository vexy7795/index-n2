export type Lab = { L: number; a: number; b: number };
export type Rgb = [number, number, number];

export function rgbToLab(r: number, g: number, b: number): Lab {
  let R = r / 255,
    G = g / 255,
    B = b / 255;
  R = R > 0.04045 ? Math.pow((R + 0.055) / 1.055, 2.4) : R / 12.92;
  G = G > 0.04045 ? Math.pow((G + 0.055) / 1.055, 2.4) : G / 12.92;
  B = B > 0.04045 ? Math.pow((B + 0.055) / 1.055, 2.4) : B / 12.92;
  const X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
  const Y = (R * 0.2126729 + G * 0.7151522 + B * 0.0721750) / 1.0;
  const Z = (R * 0.0193339 + G * 0.119192 + B * 0.9503041) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X),
    fy = f(Y),
    fz = f(Z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function labToRgb(L: number, a: number, b: number): Rgb {
  const fy = (L + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;
  const f3 = (t: number) => (t > 0.206897 ? t * t * t : (t - 16 / 116) / 7.787);
  const X = 0.95047 * f3(fx),
    Y = 1.0 * f3(fy),
    Z = 1.08883 * f3(fz);
  const R = X * 3.2404542 - Y * 1.5371385 - Z * 0.4985314;
  const G = -X * 0.969266 + Y * 1.8760108 + Z * 0.041556;
  const B = X * 0.0556434 - Y * 0.2040259 + Z * 1.0572252;
  const gamma = (c: number) =>
    c > 0.0031308 ? 1.055 * Math.pow(c, 1 / 2.4) - 0.055 : 12.92 * c;
  return [
    Math.round(Math.max(0, Math.min(255, gamma(R) * 255))),
    Math.round(Math.max(0, Math.min(255, gamma(G) * 255))),
    Math.round(Math.max(0, Math.min(255, gamma(B) * 255))),
  ];
}

export function labToHex(L: number, a: number, b: number): string {
  const [r, g, bb] = labToRgb(L, a, b);
  return "#" + [r, g, bb].map((v) => v.toString(16).padStart(2, "0")).join("");
}

export function deltaE(lab1: Lab, lab2: Lab): number {
  const dL = lab1.L - lab2.L;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}
