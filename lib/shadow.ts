import type { LogoConfig } from "./types";

const hexToRgb = (hex: string) => {
  const cleaned = hex.replace("#", "").trim();
  const full =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((char) => char + char)
          .join("")
      : cleaned.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return { r: 24, g: 24, b: 27 };
  }
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
};

export const shadowRgba = (config: Pick<LogoConfig, "shadowColor" | "shadowOpacity">) => {
  const { r, g, b } = hexToRgb(config.shadowColor);
  const alpha = Math.min(1, Math.max(0, config.shadowOpacity / 100));
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
};

export const buildPreviewBoxShadow = (config: LogoConfig) => {
  if (!config.shadow) return "none";
  return `${config.shadowOffsetX}px ${config.shadowOffsetY}px ${config.shadowBlur}px ${config.shadowSpread}px ${shadowRgba(config)}`;
};

export type ShadowPadding = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

const unitScaleOrOne = (unitScale: number) =>
  Number.isFinite(unitScale) && unitScale > 0 ? unitScale : 1;

/** Extra canvas needed so offset / blur / spread are not clipped. */
export const shadowExportPadding = (
  config: LogoConfig,
  unitScale = 1,
): ShadowPadding => {
  if (!config.shadow) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  const scale = unitScaleOrOne(unitScale);
  const dx = config.shadowOffsetX * scale;
  const dy = config.shadowOffsetY * scale;
  const spread = config.shadowSpread * scale;
  // CSS blur radius ≈ 2 * stdDeviation; visible gaussian extent ≈ 3 * stdDeviation.
  const blurExtent = Math.max(0, config.shadowBlur * scale) * 1.5;
  const extent = spread + blurExtent;
  return {
    left: Math.ceil(Math.max(0, -dx + extent)),
    right: Math.ceil(Math.max(0, dx + extent)),
    top: Math.ceil(Math.max(0, -dy + extent)),
    bottom: Math.ceil(Math.max(0, dy + extent)),
  };
};

export const buildSvgDropShadow = (
  config: LogoConfig,
  /** Scale filter units when exporting larger than the 512 preview (e.g. 4 for 2048 PNG). */
  unitScale = 1,
) => {
  if (!config.shadow) return "";
  const { r, g, b } = hexToRgb(config.shadowColor);
  const opacity = Math.min(1, Math.max(0, config.shadowOpacity / 100));
  const scale = unitScaleOrOne(unitScale);
  const deviation = Math.max(0, (config.shadowBlur / 2) * scale);
  const dx = config.shadowOffsetX * scale;
  const dy = config.shadowOffsetY * scale;
  const spread = config.shadowSpread * scale;
  const spreadAbs = Math.abs(spread);
  const hasSpread = spreadAbs > 0.01;

  if (!hasSpread) {
    return `<defs>
  <filter id="shadow" x="-80%" y="-80%" width="260%" height="260%" color-interpolation-filters="sRGB">
    <feDropShadow dx="${dx}" dy="${dy}" stdDeviation="${deviation}" flood-color="rgb(${r},${g},${b})" flood-opacity="${opacity.toFixed(3)}" />
  </filter>
</defs>`;
  }

  return `<defs>
  <filter id="shadow" x="-80%" y="-80%" width="260%" height="260%" color-interpolation-filters="sRGB">
    <feMorphology in="SourceAlpha" operator="${spread >= 0 ? "dilate" : "erode"}" radius="${spreadAbs}" result="spread"/>
    <feOffset in="spread" dx="${dx}" dy="${dy}" result="offset"/>
    <feGaussianBlur in="offset" stdDeviation="${deviation}" result="blur"/>
    <feFlood flood-color="rgb(${r},${g},${b})" flood-opacity="${opacity.toFixed(3)}" result="color"/>
    <feComposite in="color" in2="blur" operator="in" result="shadow"/>
    <feMerge>
      <feMergeNode in="shadow"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>
</defs>`;
};
