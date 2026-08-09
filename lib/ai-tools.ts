import {
  AI_ICON_PACKS,
  AI_ICON_PREFIXES,
  PRESETS,
} from "./presets";

const packList = AI_ICON_PACKS.map(
  (pack) => `${pack.prefix} (${pack.name})`,
).join(", ");

export const AI_TOOLS = [
  {
    type: "function",
    function: {
      name: "searchIcons",
      description: `Search icons in the top 10 packs only: ${AI_ICON_PREFIXES.join(", ")}. Omit pack to search all 10; pass one of those prefixes to narrow. Always pick from results — never invent names.`,
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Short concrete search term (e.g. sparkles, wand, layers, wallet). Avoid abstract phrases like 'icon generator'.",
          },
          pack: {
            type: "string",
            description: "Optional pack prefix from the top 10 list",
            enum: [...AI_ICON_PREFIXES],
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "setIcon",
      description:
        "Change the icon. ONLY when the user asks for a new/different icon or logo — never for color, background, size, or style-only tweaks. Use a prefix+name from searchIcons.",
      parameters: {
        type: "object",
        properties: {
          prefix: { type: "string" },
          name: { type: "string" },
        },
        required: ["prefix", "name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "setBackground",
      description:
        "Update background fill (CSS color or linear-gradient), rounded %, padding %, and shadow controls (enabled, color, opacity 0-100, blur, offsetX/Y, spread).",
      parameters: {
        type: "object",
        properties: {
          background: { type: "string" },
          rounded: { type: "number", minimum: 0, maximum: 50 },
          padding: { type: "number", minimum: 0, maximum: 45 },
          shadow: { type: "boolean" },
          shadowColor: { type: "string", description: "Hex color like #FF5A00" },
          shadowOpacity: { type: "number", minimum: 0, maximum: 100 },
          shadowBlur: { type: "number", minimum: 0, maximum: 80 },
          shadowOffsetX: { type: "number", minimum: -40, maximum: 40 },
          shadowOffsetY: { type: "number", minimum: -40, maximum: 60 },
          shadowSpread: { type: "number", minimum: -40, maximum: 40 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "setIconStyle",
      description:
        "Update icon size %, rotate degrees, strokeWidth, weight, and iconColor (hex).",
      parameters: {
        type: "object",
        properties: {
          size: { type: "number", minimum: 20, maximum: 90 },
          rotate: { type: "number", minimum: -180, maximum: 180 },
          strokeWidth: { type: "number", minimum: 0.5, maximum: 3.5 },
          weight: { type: ["string", "null"] },
          iconColor: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "applyPreset",
      description: `Apply a named color/shape preset (background, icon color, rounded, padding, shadow). Good for color/look changes without changing the icon. For a brand-new logo request, use this THEN setIcon. Valid ids: ${PRESETS.map((p) => p.id).join(", ")}.`,
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            enum: PRESETS.map((p) => p.id),
          },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "restoreVersion",
      description:
        "Restore a previous logo version from this session's history. Use when the user asks to go back, undo AI changes, or restore an earlier version. Prefer stepsBack=1 for 'previous'. Use versionId (full or 8-char prefix from history list) to jump to a specific version.",
      parameters: {
        type: "object",
        properties: {
          stepsBack: {
            type: "number",
            minimum: 1,
            description: "How many versions to go back (1 = previous)",
          },
          versionId: {
            type: "string",
            description: "History entry id or its 8-char prefix",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCurrentSvg",
      description:
        "Read the current logo icon SVG markup (base Iconify icon or the latest AI-edited custom SVG). Call this before editIconSvg when the user wants to improve, add to, or remove parts of the current mark.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "editIconSvg",
      description:
        "Replace the current icon with an edited SVG. Pass the FULL svg string (keep viewBox, prefer fill/stroke currentColor, simple shapes). Use after getCurrentSvg when the user asks to add/remove/simplify/improve the current icon artwork — do NOT call setIcon for those asks.",
      parameters: {
        type: "object",
        properties: {
          svg: {
            type: "string",
            description: "Complete <svg>...</svg> markup for the edited icon",
          },
        },
        required: ["svg"],
      },
    },
  },
] as const;

export const buildSystemPrompt = (logoSummary: string) => `You are the App-Icon AI assistant. You design app logo tiles: pick an icon from the top 10 packs and apply a full coordinated preset.

Allowed packs only (top 10): ${packList}.
- searchIcons only searches these packs. Never use any other prefix in setIcon.
- Every setIcon must use a real prefix:name from searchIcons results — never invent icons.

Style hints:
- Clean / SaaS → lucide, ph, tabler, heroicons
- Bold / expressive → solar, hugeicons
- Dense / material → material-symbols, mdi
- Friendly / general → bi, ri

When to change the ICON (searchIcons + setIcon):
- Only when the user asks for a new logo, a different icon, a redesign, or an icon for an app/idea.
- Then call: applyPreset → searchIcons → setIcon (optional style tweaks after).
- NEVER say you couldn't find an icon. Translate abstract asks into concrete metaphors (sparkles, wand, layers, bolt, wallet, etc.) and pick one.

When to EDIT the current SVG (getCurrentSvg → editIconSvg):
- When the user asks to improve, tweak, add/remove parts, turn elements into other shapes, simplify, or modify the *current* mark/artwork (e.g. “remove the pluses and make squares/triangles”).
- ALWAYS call getCurrentSvg first, then editIconSvg with a complete updated <svg>…</svg>.
- Keep the same viewBox when possible. Prefer currentColor for fills/strokes so color controls still work.
- Favor replacing simple marks with basic shapes (rect, polygon, circle, line) over rewriting complex path data.
- Do NOT call setIcon for these requests — keep the same base icon identity and only change customSvg.
- Never reply without calling editIconSvg when the user asked to change the artwork.

When NOT to change the icon:
- Color / background / preset / shadow / size / rounded / padding / "fits it" / "make it pop" / "more minimal" → keep the current icon (and any customSvg).
- Use only setIconStyle, setBackground, and/or applyPreset. Do NOT call searchIcons, setIcon, or editIconSvg.
- applyPreset is fine for a color/look change, but do not follow it with setIcon unless they also asked for a new icon.
- NEVER reply with "Tell me what kind of icon or vibe you want" when the user already made a request — always use tools and act.

History / go back:
- If the user asks to go back, undo, or restore — call restoreVersion. Do not invent a new logo.

Replies:
- Keep replies short (1–3 sentences). Say what you changed (preset/colors vs icon vs SVG edit).
- Never end without tools when they asked for a visible change.

Current logo + history:
${logoSummary}

Presets: ${PRESETS.map((p) => `${p.id} (${p.name})`).join(", ")}.`;
