// OKLCH design tokens -> sRGB, so canvas drawing uses exactly the colours declared in css/tokens.css.
const cache = new Map();

export function parseOklch(text) {
  const m = /oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/.exec(text);
  if (!m) throw new Error(`Not an oklch() colour: "${text}"`);
  const unit = (v) => (v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v));
  return { l: unit(m[1]), c: +m[2], h: +m[3], a: m[4] ? unit(m[4]) : 1 };
}

export function token(name) {
  if (!cache.has(name)) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (value.startsWith('#')) {
      const channels = value.slice(1).match(/../g).map((channel) => parseInt(channel, 16) / 255);
      const [red, green, blue] = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
      const light = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
      const medium = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
      const short = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);
      const axisA = 1.9779984951 * light - 2.428592205 * medium + 0.4505937099 * short;
      const axisB = 0.0259040371 * light + 0.7827717662 * medium - 0.808675766 * short;
      cache.set(name, { l: 0.2104542553 * light + 0.793617785 * medium - 0.0040720468 * short, c: Math.hypot(axisA, axisB), h: (Math.atan2(axisB, axisA) * 180 / Math.PI + 360) % 360, a: 1 });
    } else cache.set(name, parseOklch(value));
  }
  return cache.get(name);
}

export function toRgb({ l, c, h }) {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr), b = c * Math.sin(hr);
  const l3 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m3 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s3 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ];
  return linear.map((v) => {
    const x = Math.min(1, Math.max(0, v));
    return Math.round(255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055));
  });
}

export function css(color, alpha = color.a ?? 1) {
  const [r, g, b] = toRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Interpolate two OKLCH colours; hue takes the short way round and ignores near-greys. */
export function mix(from, to, t) {
  const hueFrom = from.c < 0.02 ? to.h : from.h;
  const hueTo = to.c < 0.02 ? from.h : to.h;
  const dh = ((hueTo - hueFrom + 540) % 360) - 180;
  return { l: from.l + (to.l - from.l) * t, c: from.c + (to.c - from.c) * t, h: (hueFrom + dh * t + 360) % 360, a: 1 };
}

export const paint = (name, alpha) => css(token(name), alpha);
