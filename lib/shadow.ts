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

export const buildSvgDropShadow = (config: LogoConfig) => {
  if (!config.shadow) return "";
  const { r, g, b } = hexToRgb(config.shadowColor);
  const opacity = Math.min(1, Math.max(0, config.shadowOpacity / 100));
  const deviation = Math.max(0, config.shadowBlur / 2);
  return `<defs>
  <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
    <feDropShadow dx="${config.shadowOffsetX}" dy="${config.shadowOffsetY}" stdDeviation="${deviation}" flood-color="rgb(${r},${g},${b})" flood-opacity="${opacity.toFixed(3)}" />
  </filter>
</defs>`;
};
