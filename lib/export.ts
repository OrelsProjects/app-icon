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

/** Vector SVG download size (scales cleanly in any tool). */
export const SVG_EXPORT_SIZE = 512;
/** Raster PNG at high native resolution (App Store / retina-ready). */
export const PNG_EXPORT_SIZE = 2048;

const radiusFor = (rounded: number, exportSize: number) =>
  (rounded / 100) * (exportSize / 2);

const iconBox = (config: LogoConfig, exportSize: number) => {
  const pad = (config.padding / 100) * exportSize * 0.35;
  const available = exportSize - pad * 2;
  const size = (config.size / 100) * available;
  const x = (exportSize - size) / 2;
  const y = (exportSize - size) / 2;
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

/** Compose an export SVG from a cached/prepared icon SVG. */
export const tileMarkup = (
  config: LogoConfig,
  iconSvg: string,
  exportSize: number = SVG_EXPORT_SIZE,
) => {
  const { size, x, y } = iconBox(config, exportSize);
  const radius = radiusFor(config.rounded, exportSize);
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
  const shadowFilter = buildSvgDropShadow(
    config,
    exportSize / SVG_EXPORT_SIZE,
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${exportSize}" height="${exportSize}" viewBox="0 0 ${exportSize} ${exportSize}">
  ${defs}
  ${shadowFilter}
  <rect width="${exportSize}" height="${exportSize}" rx="${radius}" ry="${radius}" fill="${fill}" ${config.shadow ? 'filter="url(#shadow)"' : ""} />
  <g transform="translate(${x} ${y}) rotate(${config.rotate} ${size / 2} ${size / 2})">
    ${colored}
  </g>
</svg>`;
};

export const composeLogoSvg = async (
  config: LogoConfig,
  exportSize: number = SVG_EXPORT_SIZE,
): Promise<string> => {
  const { safeSvgOrNull } = await import("@/lib/svg-sanitize");
  const iconSvg =
    safeSvgOrNull(config.customSvg) ??
    getCachedIconSvg(config.icon.prefix, config.icon.name) ??
    (await fetchIcon(config.icon.prefix, config.icon.name));
  return tileMarkup(config, iconSvg, exportSize);
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const loadSvgImage = async (svg: string) => {
  const svgUrl = URL.createObjectURL(
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
  );

  try {
    const image = new Image();
    image.decoding = "sync";
    // Helps some browsers honor crisp vector rasterization.
    image.setAttribute("decoding", "sync");

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("PNG render failed"));
      image.src = svgUrl;
    });

    if ("decode" in image) {
      await image.decode().catch(() => undefined);
    }

    return image;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
};

export const exportLogo = async (
  config: LogoConfig,
  format: "svg" | "png",
) => {
  const base = `${config.icon.name}-app-logo`;

  if (format === "svg") {
    const svg = await composeLogoSvg(config, SVG_EXPORT_SIZE);
    downloadBlob(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
      `${base}.svg`,
    );
    return;
  }

  // Rasterize from a native high-res SVG — never upscale a small bitmap.
  const svg = await composeLogoSvg(config, PNG_EXPORT_SIZE);
  const image = await loadSvgImage(svg);

  const canvas = document.createElement("canvas");
  canvas.width = PNG_EXPORT_SIZE;
  canvas.height = PNG_EXPORT_SIZE;
  const ctx = canvas.getContext("2d", {
    alpha: true,
    colorSpace: "srgb",
  });
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, PNG_EXPORT_SIZE, PNG_EXPORT_SIZE);
  ctx.drawImage(image, 0, 0, PNG_EXPORT_SIZE, PNG_EXPORT_SIZE);

  await new Promise<void>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("PNG export failed"));
          return;
        }
        downloadBlob(blob, `${base}.png`);
        resolve();
      },
      "image/png",
      // PNG is lossless; 1 asks browsers for maximum fidelity where applicable.
      1,
    );
  });
};
