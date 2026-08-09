import { NextResponse } from "next/server";
import { AI_TOOLS, buildSystemPrompt } from "@/lib/ai-tools";
import { fetchIcon, resolveIconMeta, searchIconsForAi } from "@/lib/iconify";
import { isAiAllowedPrefix, PRESETS } from "@/lib/presets";
import { sanitizeIconSvg } from "@/lib/svg-sanitize";
import type { AiAction, AiApplied } from "@/lib/types";

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

type OpenRouterMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};

type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type IconContext = {
  prefix: string;
  name: string;
  customSvg: string | null;
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-v4-flash-0731";

/** Completion cap sent to OpenRouter as `max_tokens` (higher default for SVG edits). */
const MAX_TOKENS = Number(process.env.OPENROUTER_MAX_TOKENS ?? 2048);
/**
 * Approx input budget for chat turns (system prompt counted separately).
 * Oldest messages are dropped until we fit.
 */
const MAX_INPUT_TOKENS = Number(process.env.OPENROUTER_MAX_INPUT_TOKENS ?? 4000);

type StatusEvent = { type: "status"; text: string };
type DoneEvent = {
  type: "done";
  message: string;
  actions: AiAction[];
  applied: AiApplied;
};
type ErrorEvent = { type: "error"; error: string };
type StreamEvent = StatusEvent | DoneEvent | ErrorEvent;

const wittyToolStatus = (toolName: string): string | null => {
  switch (toolName) {
    case "searchIcons":
      return "Raiding the icon vault…";
    case "setIcon":
      return "Stamping a fresh mark on the canvas…";
    case "getCurrentSvg":
      return "Peeking under the SVG hood…";
    case "editIconSvg":
      return "Rewiring paths like a tiny surgeon…";
    case "applyPreset":
      return "Spinning the color dial…";
    case "setBackground":
      return "Repainting the backdrop…";
    case "setIconStyle":
      return "Twisting the style knobs…";
    case "restoreVersion":
      return "Hitting rewind on the timeline…";
    default:
      return null;
  }
};

const encodeEvent = (event: StreamEvent) =>
  `${JSON.stringify(event)}\n`;

const clampText = (value: string, max: number) =>
  value.length <= max ? value : `${value.slice(0, max - 1)}…`;

/** Rough token estimate — good enough for budget trimming (≈4 chars/token). */
const estimateTokens = (text: string) =>
  Math.max(1, Math.ceil(text.length / 4));

const messageTokens = (message: IncomingMessage) =>
  estimateTokens(message.content) + 4;

/**
 * Keep the newest messages that fit under `budgetTokens`.
 * Never drops the latest user message — truncates it if needed.
 */
const trimChatByTokens = (
  messages: IncomingMessage[],
  budgetTokens: number,
): IncomingMessage[] => {
  const normalized = messages
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }))
    .filter((message) => message.content.length > 0);

  if (normalized.length === 0) return [];

  const kept: IncomingMessage[] = [];
  let used = 0;

  for (let index = normalized.length - 1; index >= 0; index -= 1) {
    const message = normalized[index];
    const cost = messageTokens(message);

    if (kept.length === 0 && cost > budgetTokens) {
      const maxChars = Math.max(64, budgetTokens * 4);
      kept.unshift({
        role: message.role,
        content: clampText(message.content, maxChars),
      });
      break;
    }

    if (kept.length > 0 && used + cost > budgetTokens) break;

    kept.unshift(message);
    used += cost;
  }

  return kept;
};

const parseArgs = (raw: string) => {
  try {
    return JSON.parse(raw || "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
};

const runTool = async (
  name: string,
  args: Record<string, unknown>,
  collected: AiAction[],
  iconContext: IconContext,
): Promise<string> => {
  if (name === "searchIcons") {
    const query = String(args.query ?? "");
    const pack = args.pack ? String(args.pack) : undefined;
    const result = await searchIconsForAi({
      query,
      prefix: pack,
      limit: 8,
    });
    return JSON.stringify({
      total: result.total,
      queryUsed: result.queryUsed,
      fallback: result.fallback,
      note: result.fallback
        ? "No exact match for the original query — these are the closest icons. You MUST pick one with setIcon."
        : "Pick the best icon with setIcon — do not ask the user for another search term.",
      icons: result.icons.map((icon) => ({
        prefix: icon.prefix,
        name: icon.name,
        packName: icon.packName,
        license: icon.license,
      })),
    });
  }

  if (name === "setIcon") {
    const prefix = String(args.prefix ?? "");
    const iconName = String(args.name ?? "");
    if (!prefix || !iconName) {
      return JSON.stringify({ error: "prefix and name required" });
    }
    if (!isAiAllowedPrefix(prefix)) {
      return JSON.stringify({
        error: "Pack not allowed. Use an icon from the top 10 packs only.",
      });
    }
    const meta = await resolveIconMeta(prefix, iconName);
    collected.push({
      type: "setIcon",
      prefix,
      name: iconName,
      packName: meta.packName,
      license: meta.license,
      palette: meta.palette,
    });
    iconContext.prefix = prefix;
    iconContext.name = iconName;
    iconContext.customSvg = null;
    return JSON.stringify({ ok: true, icon: meta });
  }

  if (name === "getCurrentSvg") {
    try {
      const svg =
        iconContext.customSvg ??
        (await fetchIcon(iconContext.prefix, iconContext.name));
      return JSON.stringify({
        prefix: iconContext.prefix,
        name: iconContext.name,
        custom: Boolean(iconContext.customSvg),
        svg,
        note: "Return a FULL updated <svg> via editIconSvg. Keep viewBox. Prefer currentColor. Add simple shapes rather than rewriting complex paths when possible.",
      });
    } catch (error) {
      return JSON.stringify({
        error:
          error instanceof Error ? error.message : "Failed to load current SVG",
      });
    }
  }

  if (name === "editIconSvg") {
    const sanitized = sanitizeIconSvg(String(args.svg ?? ""));
    if (!sanitized.ok) {
      return JSON.stringify({ error: sanitized.error });
    }
    collected.push({ type: "editIconSvg", svg: sanitized.svg });
    iconContext.customSvg = sanitized.svg;
    return JSON.stringify({
      ok: true,
      bytes: sanitized.svg.length,
      note: "Custom SVG applied. Do not call setIcon unless the user wants a different base icon.",
    });
  }

  if (name === "setBackground") {
    const action: AiAction = {
      type: "setBackground",
      background: args.background ? String(args.background) : undefined,
      rounded: typeof args.rounded === "number" ? args.rounded : undefined,
      padding: typeof args.padding === "number" ? args.padding : undefined,
      shadow: typeof args.shadow === "boolean" ? args.shadow : undefined,
      shadowColor: args.shadowColor ? String(args.shadowColor) : undefined,
      shadowOpacity:
        typeof args.shadowOpacity === "number" ? args.shadowOpacity : undefined,
      shadowBlur:
        typeof args.shadowBlur === "number" ? args.shadowBlur : undefined,
      shadowOffsetX:
        typeof args.shadowOffsetX === "number" ? args.shadowOffsetX : undefined,
      shadowOffsetY:
        typeof args.shadowOffsetY === "number" ? args.shadowOffsetY : undefined,
      shadowSpread:
        typeof args.shadowSpread === "number" ? args.shadowSpread : undefined,
    };
    collected.push(action);
    return JSON.stringify({ ok: true, ...action });
  }

  if (name === "setIconStyle") {
    const action: AiAction = {
      type: "setIconStyle",
      size: typeof args.size === "number" ? args.size : undefined,
      rotate: typeof args.rotate === "number" ? args.rotate : undefined,
      strokeWidth:
        typeof args.strokeWidth === "number" ? args.strokeWidth : undefined,
      weight:
        args.weight === null
          ? null
          : args.weight
            ? String(args.weight)
            : undefined,
      iconColor: args.iconColor ? String(args.iconColor) : undefined,
    };
    collected.push(action);
    return JSON.stringify({ ok: true, ...action });
  }

  if (name === "applyPreset") {
    const id = String(args.id ?? "");
    const preset = PRESETS.find((item) => item.id === id);
    if (!preset) return JSON.stringify({ error: "Unknown preset" });
    collected.push({ type: "applyPreset", id });
    return JSON.stringify({ ok: true, preset });
  }

  if (name === "restoreVersion") {
    const stepsBack =
      typeof args.stepsBack === "number" ? args.stepsBack : undefined;
    const versionId = args.versionId ? String(args.versionId) : undefined;
    if (stepsBack == null && !versionId) {
      collected.push({ type: "restoreVersion", stepsBack: 1 });
      return JSON.stringify({ ok: true, stepsBack: 1 });
    }
    const action: AiAction = {
      type: "restoreVersion",
      stepsBack,
      versionId,
    };
    collected.push(action);
    return JSON.stringify({ ok: true, ...action });
  }

  return JSON.stringify({ error: `Unknown tool: ${name}` });
};

const summarizeApplied = (actions: AiAction[]): AiApplied => {
  const applied: AiApplied = {};
  for (const action of actions) {
    if (action.type === "setIcon") {
      applied.icon = {
        prefix: action.prefix,
        name: action.name,
        packName: action.prefix,
      };
    }
    if (action.type === "applyPreset") {
      const preset = PRESETS.find((item) => item.id === action.id);
      if (preset) applied.preset = { id: preset.id, name: preset.name };
    }
    if (action.type === "restoreVersion") {
      applied.restored = {
        id: action.versionId ?? `stepsBack:${action.stepsBack ?? 1}`,
        label:
          action.versionId != null
            ? `version ${action.versionId}`
            : `${action.stepsBack ?? 1} step(s) back`,
      };
    }
    if (action.type === "editIconSvg") {
      applied.svgEdited = true;
    }
  }
  return applied;
};

const lastUserText = (messages: IncomingMessage[]) => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") return messages[index].content;
  }
  return "";
};

const mentionsIconGeometry = (userText: string) =>
  /\b(svg|icons?|marks?|shapes?|paths?|pluses?|plus(?:es)?|cross(?:es)?|artwork|drawing|details?|elements?|sparkles?|dots?|lines?|accents?|triangles?|squares?|circles?|rectangles?|geometry)\b/i.test(
    userText,
  );

const isSvgEditRequest = (userText: string) => {
  const text = userText.trim();
  if (!text) return false;
  if (!mentionsIconGeometry(text)) return false;

  // Geometry + any refine / resize / remake language → edit the current SVG
  return /\b(add|remove|delete|erase|improve|edit|tweak|modify|simplify|redraw|customize|replace|convert|turn|into|make|refine|adjust|scale|grow|shrink|bigger|smaller|larger|thicker|thinner|better|majestic|bold(?:er)?|clean(?:er)?)\b/i.test(
    text,
  );
};

const isStyleOnlyRequest = (userText: string) => {
  const text = userText.trim();
  if (!text) return false;
  // Shape / SVG artwork requests are never "just colors"
  if (isSvgEditRequest(text) || mentionsIconGeometry(text)) return false;

  return (
    /\b(color|colour|background|shadow|rounded|padding|size|bigger|smaller|stroke|opacity|blur|minimal|bolder|fit[s]?|preset|simpler|matching|darker|lighter|vibrant)\b/i.test(
      text,
    ) &&
    !/\b(new icon|different icon|another icon|change (the )?icon|swap (the )?icon|replace (the )?icon|logo for|make .{0,40}logo|redesign|generate .{0,40}(logo|icon))\b/i.test(
      text,
    )
  );
};

const stripNonSvgEditActions = (collected: AiAction[]) => {
  for (let index = collected.length - 1; index >= 0; index -= 1) {
    const type = collected[index]?.type;
    if (
      type === "applyPreset" ||
      type === "setBackground" ||
      type === "setIconStyle" ||
      type === "setIcon"
    ) {
      collected.splice(index, 1);
    }
  }
};

const hasStyleAction = (actions: AiAction[]) =>
  actions.some(
    (action) =>
      action.type === "applyPreset" ||
      action.type === "setBackground" ||
      action.type === "setIconStyle",
  );

const pickStylePresetId = (userText: string, logoSummary: string) => {
  const mentioned = PRESETS.find((preset) =>
    new RegExp(`\\b${preset.id}\\b|\\b${preset.name}\\b`, "i").test(
      logoSummary,
    ),
  );
  const creative = PRESETS.filter(
    (preset) =>
      preset.id !== mentioned?.id &&
      !["ink"].includes(preset.id),
  );
  const pool = creative.length ? creative : PRESETS;
  // Prefer lively presets for generator / creative apps
  if (/generat|creat|ai|spark|magic|logo/i.test(userText + logoSummary)) {
    const preferred = pool.filter((preset) =>
      /cream|warm|candy|accent|midnight|mint|ocean/i.test(preset.id),
    );
    if (preferred.length) {
      return preferred[Math.floor(Math.random() * preferred.length)].id;
    }
  }
  return pool[Math.floor(Math.random() * pool.length)].id;
};

/** If a color/style ask left no style tools, apply a preset (never touch the icon). */
const ensureStyleApplied = (
  collected: AiAction[],
  userText: string,
  logoSummary: string,
): boolean => {
  if (!isStyleOnlyRequest(userText)) return false;
  if (hasStyleAction(collected)) return false;

  collected.push({
    type: "applyPreset",
    id: pickStylePresetId(userText, logoSummary),
  });
  return true;
};

/** Force an icon only when the user clearly asked for a new logo/icon and the model skipped setIcon. */
const ensureIconApplied = async (
  collected: AiAction[],
  userText: string,
): Promise<boolean> => {
  if (collected.some((action) => action.type === "setIcon")) return false;
  if (collected.some((action) => action.type === "restoreVersion")) return false;
  if (collected.some((action) => action.type === "editIconSvg")) return false;
  if (isStyleOnlyRequest(userText)) return false;
  if (isSvgEditRequest(userText)) return false;

  const text = userText.trim();
  const wantsNewIcon =
    /\b(something else|different|another one|not this|nah|try again)\b/i.test(
      text,
    ) ||
    (/\b(logo|icon)\b/i.test(text) &&
      /\b(make|create|design|generate|pick|choose|find|try|change|new|different|another|for|redesign)\b/i.test(
        text,
      ));

  if (!wantsNewIcon) return false;

  const result = await searchIconsForAi({
    query: text || "sparkles",
    limit: 8,
  });
  const icon = result.icons[0];
  if (!icon) return false;

  const meta = await resolveIconMeta(icon.prefix, icon.name);
  collected.push({
    type: "setIcon",
    prefix: icon.prefix,
    name: icon.name,
    packName: meta.packName,
    license: meta.license,
    palette: meta.palette,
  });
  return true;
};

const isVagueAskBack = (message: string) =>
  /tell me what kind of icon or vibe|what (kind|type) of (icon|logo|vibe)|describe (an )?app/i.test(
    message,
  );

const finalizeResponse = async (
  collected: AiAction[],
  userText: string,
  rawMessage: string | null | undefined,
  logoSummary: string,
) => {
  // Color/style tweaks must never swap the icon, even if the model tried.
  if (isStyleOnlyRequest(userText)) {
    for (let index = collected.length - 1; index >= 0; index -= 1) {
      if (collected[index]?.type === "setIcon") collected.splice(index, 1);
    }
  }

  const forcedStyle = ensureStyleApplied(collected, userText, logoSummary);
  const forced = await ensureIconApplied(collected, userText);
  const applied = summarizeApplied(collected);

  if (applied.icon) {
    const meta = await resolveIconMeta(
      applied.icon.prefix,
      applied.icon.name,
    );
    applied.icon.packName = meta.packName;
  }

  let message = rawMessage?.trim() ?? "";
  const apologetic =
    /couldn'?t find|could not find|no icons?|try (a )?different|another search|explore a different/i.test(
      message,
    );

  if (forcedStyle || (isStyleOnlyRequest(userText) && applied.preset)) {
    message = applied.preset
      ? `Kept your icon and switched to the ${applied.preset.name} colors.`
      : "Updated the colors — your icon stays the same.";
  } else if (applied.svgEdited && (!message || isVagueAskBack(message))) {
    message = "Updated the icon SVG — check the canvas.";
  } else if (applied.icon && (forced || apologetic || !message)) {
    const iconLabel = `${applied.icon.packName} · ${applied.icon.name.replaceAll("-", " ")}`;
    const presetLabel = applied.preset ? `${applied.preset.name} preset` : null;
    message = presetLabel
      ? `Went with ${presetLabel} and ${iconLabel}.`
      : `Applied ${iconLabel}.`;
  } else if (!message || (userText && isVagueAskBack(message))) {
    if (collected.length) {
      message = "Done — applied to your canvas.";
    } else if (isSvgEditRequest(userText)) {
      message =
        "I couldn't update the SVG that time — try again with something like “remove the plus signs and add a square and triangle.”";
    } else if (userText) {
      message =
        "Got it — I kept your current logo. Try something more specific like “darker colors” or “a different icon.”";
    } else {
      message = "Tell me what kind of icon or vibe you want.";
    }
  }

  return { message, actions: collected, applied };
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Missing OPENROUTER_API_KEY. Add it to .env.local to enable the AI assistant.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    messages?: IncomingMessage[];
    logoSummary?: string;
    icon?: {
      prefix?: string;
      name?: string;
      customSvg?: string | null;
    };
  };

  const logoSummary = body.logoSummary ?? "default sparkles cream";
  const systemContent = buildSystemPrompt(logoSummary);
  const systemTokens = estimateTokens(systemContent);
  const chatBudget = Math.max(
    256,
    MAX_INPUT_TOKENS - systemTokens - 600,
  );

  const messages = trimChatByTokens(body.messages ?? [], chatBudget);
  if (messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const collected: AiAction[] = [];
  const userText = lastUserText(messages);
  const wantsSvgEdit = isSvgEditRequest(userText);
  const iconContext: IconContext = {
    prefix: body.icon?.prefix?.trim() || "lucide",
    name: body.icon?.name?.trim() || "sparkles",
    customSvg:
      typeof body.icon?.customSvg === "string" && body.icon.customSvg.trim()
        ? body.icon.customSvg
        : null,
  };
  let fetchedCurrentSvg = false;
  let svgEditNudgeSent = false;
  const conversation: OpenRouterMessage[] = [
    {
      role: "system",
      content: systemContent,
    },
    ...messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];

  const completionTokens = wantsSvgEdit
    ? Math.max(MAX_TOKENS, 4096)
    : MAX_TOKENS;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(encodeEvent(event)));
      };

      send({ type: "status", text: "Thinking…" });

      try {
        for (let step = 0; step < 8; step += 1) {
          const hasSvgEdit = collected.some(
            (action) => action.type === "editIconSvg",
          );
          const forceSvgTool =
            wantsSvgEdit && !hasSvgEdit && (svgEditNudgeSent || step === 0);

          const toolChoice = forceSvgTool
            ? {
                type: "function" as const,
                function: {
                  name: fetchedCurrentSvg ? "editIconSvg" : "getCurrentSvg",
                },
              }
            : ("auto" as const);

          const res = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer":
                process.env.OPENROUTER_SITE_URL ?? "https://www.app-icon.com",
              "X-Title": "App-Icon",
            },
            body: JSON.stringify({
              model: MODEL,
              messages: conversation,
              tools: AI_TOOLS,
              tool_choice: toolChoice,
              temperature: wantsSvgEdit ? 0.2 : 0.4,
              max_tokens: completionTokens,
            }),
          });

          if (!res.ok) {
            const errText = await res.text();
            send({
              type: "error",
              error: `OpenRouter error: ${errText}`,
            });
            controller.close();
            return;
          }

          const data = (await res.json()) as {
            choices?: Array<{
              message?: OpenRouterMessage;
              finish_reason?: string;
            }>;
          };

          const message = data.choices?.[0]?.message;
          if (!message) {
            send({ type: "error", error: "Empty model response" });
            controller.close();
            return;
          }

          conversation.push(message);

          const toolCalls = message.tool_calls ?? [];
          if (toolCalls.length === 0) {
            const stillNeedsSvg =
              wantsSvgEdit &&
              !collected.some((action) => action.type === "editIconSvg");

            if (stillNeedsSvg && !svgEditNudgeSent && step < 6) {
              svgEditNudgeSent = true;
              send({
                type: "status",
                text: "Nudging the model to actually edit the SVG…",
              });
              conversation.push({
                role: "user",
                content:
                  "You must edit the CURRENT icon SVG now. Call getCurrentSvg, then editIconSvg with a full updated <svg>…</svg> that applies my request. Do not call setIcon. Do not ask clarifying questions.",
              });
              continue;
            }

            if (wantsSvgEdit) {
              stripNonSvgEditActions(collected);
            }

            send({
              type: "status",
              text: "Wrapping up…",
            });
            const final = await finalizeResponse(
              collected,
              userText,
              message.content,
              logoSummary,
            );
            send({ type: "done", ...final });
            controller.close();
            return;
          }

          for (const call of toolCalls) {
            const witty = wittyToolStatus(call.function.name);
            if (witty) send({ type: "status", text: witty });

            if (call.function.name === "getCurrentSvg") {
              fetchedCurrentSvg = true;
            }
            const result = await runTool(
              call.function.name,
              parseArgs(call.function.arguments),
              collected,
              iconContext,
            );
            conversation.push({
              role: "tool",
              tool_call_id: call.id,
              content: result,
            });
          }

          const editedSvg = collected.some(
            (action) => action.type === "editIconSvg",
          );
          if (wantsSvgEdit && !editedSvg && step < 7) {
            stripNonSvgEditActions(collected);
            if (!svgEditNudgeSent) {
              svgEditNudgeSent = true;
              send({
                type: "status",
                text: "Sticking to the artwork — skipping color-only shortcuts…",
              });
              conversation.push({
                role: "user",
                content:
                  "Do not applyPreset or setIcon. Edit the CURRENT SVG with getCurrentSvg then editIconSvg only. Make the shapes bigger / more majestic as requested.",
              });
            }
            continue;
          }
        }

        if (wantsSvgEdit) {
          stripNonSvgEditActions(collected);
        }

        send({ type: "status", text: "Wrapping up…" });
        const final = await finalizeResponse(
          collected,
          userText,
          "I made a few updates — check the canvas.",
          logoSummary,
        );
        send({ type: "done", ...final });
        controller.close();
      } catch (error) {
        send({
          type: "error",
          error: error instanceof Error ? error.message : "AI request failed",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
