import { prepareIconSvg } from "./iconify";

export const MAX_SVG_BYTES = 28_000;

const FORBIDDEN_TAGS =
  /<\/?(?:script|foreignObject|iframe|object|embed|link|meta|style|animate|animateTransform|animateMotion|set|handler|listener)\b[^>]*>/gi;

const EVENT_HANDLER_ATTR = /\s+on[a-z]+\s*=\s*(["']).*?\1/gi;
const EVENT_HANDLER_UNQUOTED = /\s+on[a-z]+\s*=\s*[^\s>]+/gi;
const HTML_COMMENTS = /<!--[\s\S]*?-->/g;
const CDATA = /<!\[CDATA\[[\s\S]*?\]\]>/gi;

/** Keep only fragment refs (#id); block javascript:/data:/http(s): urls. */
const UNSAFE_URL_ATTR =
  /\s(?:href|xlink:href|src|from|to)\s*=\s*(["'])\s*(?!#)[^"']*\1/gi;
const UNSAFE_URL_UNQUOTED =
  /\s(?:href|xlink:href|src|from|to)\s*=\s*(?!#)[^\s>]+/gi;

const EXTERNAL_IMAGE =
  /<image\b[^>]*(?:href|xlink:href)\s*=\s*(["'])\s*(?:https?:|data:)[^"']*\1[^>]*>/gi;

export type SanitizeSvgResult =
  | { ok: true; svg: string }
  | { ok: false; error: string };

/** Strip dangerous markup and normalize for App-Logo rendering. */
export const sanitizeIconSvg = (raw: string): SanitizeSvgResult => {
  if (typeof raw !== "string" || !raw.trim()) {
    return { ok: false, error: "SVG is empty" };
  }

  let svg = raw.trim();
  if (svg.length > MAX_SVG_BYTES) {
    return { ok: false, error: `SVG too large (max ${MAX_SVG_BYTES} bytes)` };
  }

  // Unwrap markdown fences if the model wrapped the SVG
  svg = svg
    .replace(/^```(?:svg|xml)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  if (!/<svg\b/i.test(svg)) {
    return { ok: false, error: "SVG must contain a root <svg> element" };
  }

  svg = svg
    .replace(HTML_COMMENTS, "")
    .replace(CDATA, "")
    .replace(FORBIDDEN_TAGS, "")
    .replace(EVENT_HANDLER_ATTR, "")
    .replace(EVENT_HANDLER_UNQUOTED, "")
    .replace(EXTERNAL_IMAGE, "")
    .replace(UNSAFE_URL_ATTR, ' href="#" data-blocked="url" ')
    .replace(UNSAFE_URL_UNQUOTED, ' href="#" data-blocked="url" ');

  // Keep only the first <svg>...</svg> document
  const match = svg.match(/<svg\b[\s\S]*<\/svg>/i);
  if (!match) {
    return { ok: false, error: "Could not find a complete <svg>...</svg>" };
  }
  svg = match[0];

  // Prefer currentColor so icon color controls still work
  if (!/currentColor/i.test(svg) && !/\sfill=/i.test(svg)) {
    svg = svg.replace(/<svg\b([^>]*)>/i, (_full, attrs: string) => {
      if (/\sfill=/i.test(attrs)) return `<svg${attrs}>`;
      return `<svg${attrs} fill="currentColor">`;
    });
  }

  const prepared = prepareIconSvg(svg);
  if (!/<svg\b/i.test(prepared)) {
    return { ok: false, error: "Prepared SVG is invalid" };
  }

  if (prepared.length > MAX_SVG_BYTES) {
    return { ok: false, error: `SVG too large (max ${MAX_SVG_BYTES} bytes)` };
  }

  return { ok: true, svg: prepared };
};

/** Best-effort sanitize for render/load paths — drops unsafe SVG instead of throwing. */
export const safeSvgOrNull = (raw: string | null | undefined): string | null => {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const result = sanitizeIconSvg(raw);
  return result.ok ? result.svg : null;
};
