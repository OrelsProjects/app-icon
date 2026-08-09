export type GradientStop = {
  id: string;
  color: string;
  at: number;
  opacity: number;
};

export type GradientType = "linear" | "radial";

export type ParsedGradient = {
  type: GradientType;
  angle: number;
  stops: GradientStop[];
};

export const isGradient = (value: string) => /gradient\(/i.test(value);

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `stop-${Math.random().toString(16).slice(2)}`;

export const hexToRgb = (hex: string) => {
  const cleaned = hex.replace("#", "").trim();
  const full =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((char) => char + char)
          .join("")
      : cleaned.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return { r: 255, g: 90, b: 0 };
  }
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
};

export const rgbToHex = (r: number, g: number, b: number) => {
  const to = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
};

export const rgbaString = (hex: string, opacity: number) => {
  const { r, g, b } = hexToRgb(hex);
  const alpha = Math.max(0, Math.min(1, opacity / 100));
  if (alpha >= 0.999) return hex.toUpperCase();
  return `rgba(${r}, ${g}, ${b}, ${Number(alpha.toFixed(3))})`;
};

export const parseColorToHexOpacity = (
  raw: string,
): { color: string; opacity: number } => {
  const value = raw.trim();
  const rgba = value.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i,
  );
  if (rgba) {
    return {
      color: rgbToHex(Number(rgba[1]), Number(rgba[2]), Number(rgba[3])),
      opacity:
        rgba[4] != null
          ? Math.round(Number(rgba[4]) * 100)
          : 100,
    };
  }
  if (value.startsWith("#")) {
    if (value.length === 9) {
      const alpha = Number.parseInt(value.slice(7, 9), 16);
      return {
        color: value.slice(0, 7).toUpperCase(),
        opacity: Math.round((alpha / 255) * 100),
      };
    }
    return { color: value.slice(0, 7).toUpperCase(), opacity: 100 };
  }
  return { color: "#FF5A00", opacity: 100 };
};

export const hexToHsva = (hex: string, opacity = 100) => {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s: s * 100, v: v * 100, a: opacity };
};

export const hsvaToHex = (h: number, s: number, v: number) => {
  const sat = s / 100;
  const val = v / 100;
  const c = val * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = val - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
};

export const buildGradientCss = (
  type: GradientType,
  angle: number,
  stops: GradientStop[],
) => {
  const ordered = [...stops].sort((a, b) => a.at - b.at);
  const stopCss = ordered
    .map((stop) => `${rgbaString(stop.color, stop.opacity)} ${Math.round(stop.at)}%`)
    .join(", ");
  if (type === "radial") {
    return `radial-gradient(circle at 50% 50%, ${stopCss})`;
  }
  return `linear-gradient(${Math.round(angle)}deg, ${stopCss})`;
};

export const buildLinearGradient = (
  angle: number,
  from: string,
  to: string,
  mid?: string,
) => {
  const stops: GradientStop[] = [
    { id: "a", color: from, at: 0, opacity: 100 },
    ...(mid
      ? [{ id: "b", color: mid, at: 50, opacity: 100 } satisfies GradientStop]
      : []),
    { id: "c", color: to, at: 100, opacity: 100 },
  ];
  return buildGradientCss("linear", angle, stops);
};

const parseStops = (stopParts: string[]): GradientStop[] =>
  stopParts.map((part, index) => {
    const stopMatch = part.match(
      /^(.+?)\s+(\d+(?:\.\d+)?)%$|^(.+)$/,
    );
    const colorRaw = (stopMatch?.[1] ?? stopMatch?.[3] ?? part).trim();
    const atRaw = stopMatch?.[2];
    const { color, opacity } = parseColorToHexOpacity(colorRaw);
    const at =
      atRaw != null
        ? Number(atRaw)
        : stopParts.length === 1
          ? 0
          : (index / (stopParts.length - 1)) * 100;
    return { id: uid(), color, at, opacity };
  });

export const parseGradient = (value: string): ParsedGradient | null => {
  const radial = value.match(/radial-gradient\((.+)\)/i);
  const linear = value.match(/linear-gradient\((.+)\)/i);
  if (!radial && !linear) return null;

  if (radial) {
    const parts = radial[1]
      .split(/,(?![^(]*\))/)
      .map((part) => part.trim())
      .filter(Boolean);
    let stopParts = parts;
    if (/^(circle|ellipse|at)\b/i.test(parts[0] ?? "")) {
      stopParts = parts.slice(1);
    }
    const stops = parseStops(stopParts);
    if (stops.length < 2) return null;
    return { type: "radial", angle: 135, stops };
  }

  const parts = linear![1]
    .split(/,(?![^(]*\))/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) return null;

  let angle = 135;
  let stopParts = parts;
  const anglePart = parts[0];
  const angleMatch = anglePart.match(/^(-?\d+(?:\.\d+)?)deg$/i);
  if (angleMatch) {
    angle = Number(angleMatch[1]);
    stopParts = parts.slice(1);
  } else if (/^to\s+/i.test(anglePart)) {
    const dir = anglePart.toLowerCase();
    if (dir.includes("right") && dir.includes("bottom")) angle = 135;
    else if (dir.includes("left") && dir.includes("bottom")) angle = 225;
    else if (dir.includes("right") && dir.includes("top")) angle = 45;
    else if (dir.includes("left") && dir.includes("top")) angle = 315;
    else if (dir.includes("right")) angle = 90;
    else if (dir.includes("left")) angle = 270;
    else if (dir.includes("bottom")) angle = 180;
    else if (dir.includes("top")) angle = 0;
    stopParts = parts.slice(1);
  }

  const stops = parseStops(stopParts);
  if (stops.length < 2) return null;
  return { type: "linear", angle, stops };
};

/** @deprecated prefer parseGradient */
export const parseLinearGradient = (value: string): ParsedGradient | null => {
  const parsed = parseGradient(value);
  if (!parsed) return null;
  return { ...parsed, type: "linear" };
};

export const defaultGradientStops = (): GradientStop[] => [
  { id: uid(), color: "#FFE0C2", at: 0, opacity: 100 },
  { id: uid(), color: "#FF8A4C", at: 100, opacity: 100 },
];

/** Convert CSS angle to SVG linearGradient x1/y1/x2/y2 in percent. */
export const angleToSvgCoords = (angle: number) => {
  const radians = ((angle % 360) * Math.PI) / 180;
  const x = Math.cos(radians);
  const y = Math.sin(radians);
  return {
    x1: `${((0.5 - x / 2) * 100).toFixed(2)}%`,
    y1: `${((0.5 - y / 2) * 100).toFixed(2)}%`,
    x2: `${((0.5 + x / 2) * 100).toFixed(2)}%`,
    y2: `${((0.5 + y / 2) * 100).toFixed(2)}%`,
  };
};
