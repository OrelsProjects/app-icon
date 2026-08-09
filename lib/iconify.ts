import type { IconSearchResult, PackInfo } from "./types";
import {
  AI_ICON_PACKS,
  FEATURED_PACKS,
  getPackBadge,
  isAiAllowedPrefix,
} from "./presets";

export const ICONIFY_API = "https://api.iconify.design";

const iconCache = new Map<string, string>();

export type CollectionsResponse = Record<
  string,
  {
    name: string;
    total: number;
    author?: { name: string; url?: string };
    license?: { title?: string; spdx?: string; url?: string };
    samples?: string[];
    palette?: boolean;
    category?: string;
  }
>;

export const iconId = (prefix: string, name: string) => `${prefix}:${name}`;

export const getCachedIconSvg = (prefix: string, name: string) =>
  iconCache.get(iconId(prefix, name)) ?? null;

export const setCachedIconSvg = (prefix: string, name: string, svg: string) => {
  iconCache.set(iconId(prefix, name), svg);
};

/** Strip fixed size and force the SVG to fill its wrapper via width/height 100%. */
export const prepareIconSvg = (raw: string) =>
  raw
    .replace(/<\?xml[^>]*>/i, "")
    .replace(/<!DOCTYPE[^>]*>/i, "")
    .replace(/<svg\b([^>]*)>/i, (_full, attrs: string) => {
      const cleaned = String(attrs)
        .replace(/\swidth="[^"]*"/gi, "")
        .replace(/\sheight="[^"]*"/gi, "")
        .replace(/\sstyle="[^"]*"/gi, "");
      return `<svg${cleaned} width="100%" height="100%" style="width:100%;height:100%;display:block">`;
    });

export const applyStrokeWidth = (svg: string, strokeWidth: number) => {
  const value = String(strokeWidth);
  if (/stroke-width=/i.test(svg) || /strokeWidth=/i.test(svg)) {
    return svg
      .replace(/stroke-width="[^"]*"/gi, `stroke-width="${value}"`)
      .replace(/strokeWidth="[^"]*"/gi, `strokeWidth="${value}"`);
  }
  return svg.replace(
    /<svg\b([^>]*)>/i,
    (_full, attrs: string) =>
      `<svg${attrs} stroke-width="${value}">`,
  );
};

/** GET /{prefix}/{name}.svg?height=none → prepared SVG (cached). */
export const fetchIcon = async (prefix: string, name: string) => {
  const key = iconId(prefix, name);
  const cached = iconCache.get(key);
  if (cached) return cached;

  const res = await fetch(
    `${ICONIFY_API}/${prefix}/${name}.svg?height=none`,
  );
  if (!res.ok) throw new Error(`Failed to fetch icon ${key}`);
  const prepared = prepareIconSvg(await res.text());
  iconCache.set(key, prepared);
  return prepared;
};

export const thumbnailUrl = (prefix: string, name: string) =>
  `${ICONIFY_API}/${prefix}/${name}.svg?height=24&color=%23201e1d`;

export const fetchCollections = async (): Promise<PackInfo[]> => {
  const res = await fetch(`${ICONIFY_API}/collections`);
  if (!res.ok) throw new Error("Failed to load icon packs");
  const data = (await res.json()) as CollectionsResponse;

  return Object.entries(data)
    .map(([prefix, info]) => ({
      prefix,
      name: info.name,
      total: info.total,
      license: info.license?.spdx ?? info.license?.title,
      palette: Boolean(info.palette),
      samples: info.samples,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

const collectionToResults = (
  prefix: string,
  packName: string,
  license: string,
  palette: boolean,
  names: string[],
): IconSearchResult[] =>
  names.map((name) => ({
    prefix,
    name,
    packName,
    license,
    palette,
  }));

const namesFromCollection = (data: {
  uncategorized?: string[];
  categories?: Record<string, string[]>;
  hidden?: string[];
}) => {
  const names = [
    ...(data.uncategorized ?? []),
    ...Object.values(data.categories ?? {}).flat(),
  ];
  const hidden = new Set(data.hidden ?? []);
  return [...new Set(names.filter((name) => !hidden.has(name)))];
};

export const fetchCollectionIcons = async (
  prefix: string,
  limit: number,
): Promise<IconSearchResult[]> => {
  const res = await fetch(
    `${ICONIFY_API}/collection?prefix=${encodeURIComponent(prefix)}`,
  );
  if (!res.ok) throw new Error(`Failed to load collection ${prefix}`);
  const data = (await res.json()) as {
    name?: string;
    title?: string;
    prefix?: string;
    uncategorized?: string[];
    categories?: Record<string, string[]>;
    hidden?: string[];
    info?: {
      name?: string;
      license?: { spdx?: string; title?: string };
      palette?: boolean;
    };
  };

  const names = namesFromCollection(data).slice(0, limit);
  return collectionToResults(
    prefix,
    data.info?.name ?? data.name ?? data.title ?? prefix,
    data.info?.license?.spdx ?? data.info?.license?.title ?? "Unknown",
    Boolean(data.info?.palette),
    names,
  );
};

export const searchIcons = async (params: {
  query?: string;
  prefix?: string;
  limit?: number;
  start?: number;
}): Promise<{ icons: IconSearchResult[]; total: number }> => {
  const { query = "", prefix, limit = 96, start = 0 } = params;
  const url = new URL(`${ICONIFY_API}/search`);
  url.searchParams.set("query", query);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("start", String(start));
  if (prefix) url.searchParams.set("prefix", prefix);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Icon search failed");
  const data = (await res.json()) as {
    icons?: string[];
    total?: number;
    collections?: CollectionsResponse;
  };

  const collections = data.collections ?? {};
  const icons = (data.icons ?? []).map((id) => {
    const [iconPrefix, ...rest] = id.split(":");
    const name = rest.join(":");
    const meta = collections[iconPrefix];
    return {
      prefix: iconPrefix,
      name,
      packName: meta?.name ?? iconPrefix,
      license: meta?.license?.spdx ?? meta?.license?.title ?? "Unknown",
      palette: Boolean(meta?.palette),
    } satisfies IconSearchResult;
  });

  return { icons, total: data.total ?? icons.length };
};

const AI_FALLBACK_QUERIES = [
  "sparkles",
  "wand",
  "layers",
  "bolt",
  "star",
  "app",
  "grid",
];

/** AI-only search: top packs only, with automatic fallbacks so results are never empty. */
export const searchIconsForAi = async (params: {
  query: string;
  prefix?: string;
  limit?: number;
}): Promise<{
  icons: IconSearchResult[];
  total: number;
  queryUsed: string;
  fallback: boolean;
}> => {
  const limit = params.limit ?? 12;
  const requestedPrefix =
    params.prefix && isAiAllowedPrefix(params.prefix)
      ? params.prefix
      : undefined;

  const filterAllowed = (icons: IconSearchResult[]) =>
    icons.filter((icon) => isAiAllowedPrefix(icon.prefix)).slice(0, limit);

  const tryQuery = async (query: string) => {
    if (requestedPrefix) {
      const result = await searchIcons({
        query,
        prefix: requestedPrefix,
        limit: Math.max(limit * 2, 24),
      });
      return filterAllowed(result.icons);
    }

    // Search each top pack so we don't get drowned by obscure collections.
    const batches = await Promise.all(
      AI_ICON_PACKS.map((pack) =>
        searchIcons({
          query,
          prefix: pack.prefix,
          limit: 8,
        }).then((result) => result.icons),
      ),
    );
    const seen = new Set<string>();
    const merged: IconSearchResult[] = [];
    for (const batch of batches) {
      for (const icon of batch) {
        const key = `${icon.prefix}:${icon.name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(icon);
        if (merged.length >= limit) return merged;
      }
    }
    return merged;
  };

  const primary = params.query.trim() || "sparkles";
  let icons = await tryQuery(primary);
  if (icons.length > 0) {
    return { icons, total: icons.length, queryUsed: primary, fallback: false };
  }

  const extras = [
    ...primary
      .split(/[\s-_]+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 2),
    ...AI_FALLBACK_QUERIES,
  ];

  for (const query of extras) {
    if (query === primary) continue;
    icons = await tryQuery(query);
    if (icons.length > 0) {
      return { icons, total: icons.length, queryUsed: query, fallback: true };
    }
  }

  // Last resort: popular lucide defaults
  const defaults = ["sparkles", "zap", "star", "layers", "box"];
  for (const name of defaults) {
    icons.push({
      prefix: "lucide",
      name,
      packName: "Lucide",
      license: "ISC",
      palette: false,
    });
  }
  return {
    icons: icons.slice(0, limit),
    total: icons.length,
    queryUsed: "sparkles",
    fallback: true,
  };
};

/**
 * Picker loader:
 * - with query → /search (limit 96)
 * - empty query + pack → /collection first 96
 * - empty query + all → first 6 featured packs × 16 icons
 */
export const loadPicker = async (params: {
  query?: string;
  prefix?: string | null;
}): Promise<{ icons: IconSearchResult[]; total: number }> => {
  const query = params.query?.trim() ?? "";
  const prefix = params.prefix ?? null;

  if (query) {
    return searchIcons({
      query,
      prefix: prefix || undefined,
      limit: 96,
    });
  }

  if (prefix) {
    const icons = await fetchCollectionIcons(prefix, 96);
    return { icons, total: icons.length };
  }

  const packs = FEATURED_PACKS.slice(0, 6);
  const batches = await Promise.all(
    packs.map((pack) => fetchCollectionIcons(pack.prefix, 16)),
  );
  const icons = batches.flat();
  return { icons, total: icons.length };
};

export const resolveIconMeta = async (
  prefix: string,
  name: string,
): Promise<IconSearchResult> => {
  const featured = FEATURED_PACKS.find((pack) => pack.prefix === prefix);
  try {
    const collections = await fetchCollections();
    const pack = collections.find((item) => item.prefix === prefix);
    return {
      prefix,
      name,
      packName: pack?.name ?? featured?.name ?? prefix,
      license: pack?.license ?? "Unknown",
      palette: Boolean(pack?.palette),
    };
  } catch {
    return {
      prefix,
      name,
      packName: featured?.name ?? prefix,
      license: "Unknown",
      palette: false,
    };
  }
};

export const packLabel = (prefix: string, packName?: string) =>
  packName ??
  FEATURED_PACKS.find((pack) => pack.prefix === prefix)?.name ??
  prefix;

export { getPackBadge };
