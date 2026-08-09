import { prepareIconSvg } from "./iconify";

const MAX_SVG_BYTES = 28_000;

const FORBIDDEN_TAGS =
  /<\/?(?:script|foreignObject|iframe|object|embed|link|meta|style)\b[^>]*>/gi;

const EVENT_HANDLER_ATTR = /\s+on[a-z]+\s*=\s*(["']).*?\1/gi;
const EVENT_HANDLER_UNQUOTED = /\s+on[a-z]+\s*=\s*[^\s>]+/gi;
const JS_URL = /(?:href|xlink:href|src)\s*=\s*(["'])\s*javascript:/gi;

const EXTERNAL_IMAGE =
  /<image\b[^>]*(?:href|xlink:href)\s*=\s*(["'])\s*https?:\/\/[^"']*\1[^>]*>/gi;

export type SanitizeSvgResult =
  | { ok: true; svg: string }
  | { ok: false; error: string };

/** Strip dangerous markup and normalize for App-Icon rendering. */
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
    .replace(FORBIDDEN_TAGS, "")
    .replace(EVENT_HANDLER_ATTR, "")
    .replace(EVENT_HANDLER_UNQUOTED, "")
    .replace(JS_URL, 'href="#" data-blocked="javascript" ')
    .replace(EXTERNAL_IMAGE, "");

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

  return { ok: true, svg: prepared };
};
