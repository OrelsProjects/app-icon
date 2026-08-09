import type { LogoConfig } from "./types";
import {
  applyStrokeWidth,
  fetchIcon,
  getCachedIconSvg,
} from "./iconify";
import {
  angleToSvgCoords,
  isGradient,
  parseGradient,
  rgbaString,
} from "./gradient";
import { buildSvgDropShadow } from "./shadow";

const EXPORT_SIZE = 512;

const radiusFor = (rounded: number) => (rounded / 100) * (EXPORT_SIZE / 2);

const iconBox = (config: LogoConfig) => {
  const pad = (config.padding / 100) * EXPORT_SIZE * 0.35;
  const available = EXPORT_SIZE - pad * 2;
  const size = (config.size / 100) * available;
  const x = (EXPORT_SIZE - size) / 2;
  const y = (EXPORT_SIZE - size) / 2;
  return { size, x, y, pad };
};

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const sizeIconSvg = (svg: string, size: number, color: string | null) => {
  let next = svg
    .replace(/\swidth="100%"/gi, ` width="${size}"`)
    .replace(/\sheight="100%"/gi, ` height="${size}"`)
    .replace(
      /\sstyle="width:100%;height:100%;display:block"/gi,
      ` style="width:${size}px;height:${size}px;display:block"`,
    );

  if (color) {
    next = next
      .replace(/\sfill="currentColor"/gi, ` fill="${color}"`)
      .replace(/\sstroke="currentColor"/gi, ` stroke="${color}"`);
    if (!/fill=|stroke=/i.test(next)) {
      next = next.replace(
        /<svg\b([^>]*)>/i,
        (_full, attrs: string) =>
          `<svg${attrs} fill="${color}" stroke="${color}">`,
      );
    }
  }

  return next;
};

/** Compose the 512×512 export SVG from a cached/prepared icon SVG. */
export const tileMarkup = (config: LogoConfig, iconSvg: string) => {
  const { size, x, y } = iconBox(config);
  const radius = radiusFor(config.rounded);
  const stroked = config.icon.palette
    ? iconSvg
    : applyStrokeWidth(iconSvg, config.strokeWidth);
  const colored = sizeIconSvg(
    stroked,
    size,
    config.icon.palette ? null : config.iconColor,
  );

  const gradient = isGradient(config.background)
    ? parseGradient(config.background)
    : null;
  const solid = gradient ? null : config.background;

  let defs = "";
  if (gradient) {
    const stops = [...gradient.stops]
      .sort((a, b) => a.at - b.at)
      .map((stop) => {
        const fill = rgbaString(stop.color, stop.opacity);
        if (fill.startsWith("rgba")) {
          const match = fill.match(
            /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/,
          );
          if (match) {
            return `<stop offset="${stop.at}%" stop-color="rgb(${match[1]},${match[2]},${match[3]})" stop-opacity="${match[4]}" />`;
          }
        }
        return `<stop offset="${stop.at}%" stop-color="${escapeXml(fill)}" />`;
      })
      .join("\n          ");

    if (gradient.type === "radial") {
      defs = `<defs>
        <radialGradient id="bg" cx="50%" cy="50%" r="70%">
          ${stops}
        </radialGradient>
      </defs>`;
    } else {
      const coords = angleToSvgCoords(gradient.angle);
      defs = `<defs>
        <linearGradient id="bg" x1="${coords.x1}" y1="${coords.y1}" x2="${coords.x2}" y2="${coords.y2}">
          ${stops}
        </linearGradient>
      </defs>`;
    }
  }

  const fill = solid ? escapeXml(solid) : "url(#bg)";
  const shadowFilter = buildSvgDropShadow(config);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${EXPORT_SIZE}" height="${EXPORT_SIZE}" viewBox="0 0 ${EXPORT_SIZE} ${EXPORT_SIZE}">
  ${defs}
  ${shadowFilter}
  <rect width="${EXPORT_SIZE}" height="${EXPORT_SIZE}" rx="${radius}" ry="${radius}" fill="${fill}" ${config.shadow ? 'filter="url(#shadow)"' : ""} />
  <g transform="translate(${x} ${y}) rotate(${config.rotate} ${size / 2} ${size / 2})">
    ${colored}
  </g>
</svg>`;
};

export const composeLogoSvg = async (config: LogoConfig): Promise<string> => {
  const iconSvg =
    config.customSvg ??
    getCachedIconSvg(config.icon.prefix, config.icon.name) ??
    (await fetchIcon(config.icon.prefix, config.icon.name));
  return tileMarkup(config, iconSvg);
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const exportLogo = async (
  config: LogoConfig,
  format: "svg" | "png",
) => {
  const svg = await composeLogoSvg(config);
  const base = `${config.icon.name}-app-logo`;

  if (format === "svg") {
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${base}.svg`);
    return;
  }

  const image = new Image();
  const svgUrl = URL.createObjectURL(
    new Blob([svg], { type: "image/svg+xml" }),
  );

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("PNG render failed"));
    image.src = svgUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_SIZE;
  canvas.height = EXPORT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(image, 0, 0);
  URL.revokeObjectURL(svgUrl);

  await new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("PNG export failed"));
        return;
      }
      downloadBlob(blob, `${base}.png`);
      resolve();
    }, "image/png");
  });
};
