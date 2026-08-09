import { DEFAULT_CONFIG } from "./presets";
import type { LogoConfig } from "./types";

export type HistorySource =
  | "start"
  | "manual"
  | "preset"
  | "ai"
  | "random"
  | "restore";

export type HistoryEntry = {
  id: string;
  label: string;
  createdAt: number;
  source: HistorySource;
  config: LogoConfig;
};

export type SessionState = {
  entries: HistoryEntry[];
  index: number;
};

const STORAGE_KEY = "app-logo-session-v1";
const MAX_ENTRIES = 20;

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `ver-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const createHistoryEntry = (
  config: LogoConfig,
  source: HistorySource,
  label?: string,
): HistoryEntry => ({
  id: uid(),
  label: label ?? labelForConfig(config, source),
  createdAt: Date.now(),
  source,
  config,
});

export const labelForConfig = (
  config: LogoConfig,
  source: HistorySource = "manual",
) => {
  const icon = config.icon.name.replaceAll("-", " ");
  const titled = icon.replace(/\b\w/g, (c) => c.toUpperCase());
  if (source === "ai") return `AI · ${titled}`;
  if (source === "preset") return `Preset · ${titled}`;
  if (source === "random") return `Random · ${titled}`;
  if (source === "restore") return `Restored · ${titled}`;
  return titled;
};

export const defaultSession = (): SessionState => {
  const entry = createHistoryEntry(DEFAULT_CONFIG, "start", "Start · Sparkles");
  return { entries: [entry], index: 0 };
};

export const loadSession = (): SessionState => {
  if (typeof window === "undefined") return defaultSession();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSession();
    const parsed = JSON.parse(raw) as SessionState;
    if (
      !parsed ||
      !Array.isArray(parsed.entries) ||
      parsed.entries.length === 0 ||
      typeof parsed.index !== "number"
    ) {
      return defaultSession();
    }
    const entries = parsed.entries
      .filter(
        (entry) =>
          entry &&
          typeof entry.id === "string" &&
          entry.config &&
          typeof entry.config === "object",
      )
      .map((entry) => ({
        ...entry,
        config: {
          ...DEFAULT_CONFIG,
          ...entry.config,
          icon: { ...DEFAULT_CONFIG.icon, ...entry.config.icon },
          customSvg:
            typeof entry.config.customSvg === "string"
              ? entry.config.customSvg
              : null,
        },
      }))
      .slice(-MAX_ENTRIES);
    if (entries.length === 0) return defaultSession();
    const index = Math.max(0, Math.min(entries.length - 1, parsed.index));
    return { entries, index };
  } catch {
    return defaultSession();
  }
};

export const saveSession = (session: SessionState) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Quota / private mode — ignore
  }
};

export const pushEntry = (
  session: SessionState,
  entry: HistoryEntry,
): SessionState => {
  const trimmed = session.entries.slice(0, session.index + 1);
  const entries = [...trimmed, entry].slice(-MAX_ENTRIES);
  return { entries, index: entries.length - 1 };
};

export const summarizeHistoryForAi = (
  session: SessionState,
  maxEntries = 8,
) => {
  if (session.entries.length <= 1) {
    return "Session history: only the starting logo (nothing to restore yet).";
  }

  const start = Math.max(0, session.entries.length - maxEntries);
  const slice = session.entries.slice(start);
  const lines = slice.map((entry, offset) => {
    const index = start + offset;
    const current = index === session.index ? " ← current" : "";
    const when = new Date(entry.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${index + 1}. [${entry.id.slice(0, 8)}] ${entry.label} (${entry.source}, ${when})${current}`;
  });
  const omitted =
    start > 0 ? ` (showing last ${slice.length} of ${session.entries.length})` : "";
  return `Session history (oldest → newest${omitted}, index ${session.index + 1}):\n${lines.join("\n")}\nTo go back, call restoreVersion with stepsBack (1 = previous) or versionId.`;
};
