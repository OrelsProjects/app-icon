"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AI_ICON_PACKS,
  DEFAULT_CONFIG,
  FEATURED_PACKS,
  PRESETS,
  applyPresetToConfig,
  findActivePresetId,
} from "./presets";
import { fetchIcon, searchIcons } from "./iconify";
import {
  createHistoryEntry,
  defaultSession,
  labelForConfig,
  loadSession,
  pushEntry,
  saveSession,
  summarizeHistoryForAi,
  type HistoryEntry,
  type HistorySource,
  type SessionState,
} from "./session-history";
import type { AiAction, AiApplied, LogoConfig, LogoIcon } from "./types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const packNameFor = (prefix: string, fallback?: string) =>
  fallback ??
  FEATURED_PACKS.find((pack) => prefix.startsWith(pack.prefix))?.name ??
  prefix;

const RANDOM_ICON_QUERIES = [
  "app",
  "star",
  "bolt",
  "sparkles",
  "layers",
  "hexagon",
  "rocket",
  "wand",
  "shapes",
  "grid",
  "atom",
  "flame",
  "compass",
  "cube",
  "orbit",
] as const;

const FALLBACK_RANDOM_ICONS: LogoIcon[] = [
  {
    prefix: "lucide",
    name: "sparkles",
    packName: "Lucide",
    license: "ISC",
    palette: false,
  },
  {
    prefix: "lucide",
    name: "zap",
    packName: "Lucide",
    license: "ISC",
    palette: false,
  },
  {
    prefix: "lucide",
    name: "hexagon",
    packName: "Lucide",
    license: "ISC",
    palette: false,
  },
  {
    prefix: "tabler",
    name: "rocket",
    packName: "Tabler",
    license: "MIT",
    palette: false,
  },
  {
    prefix: "ph",
    name: "planet",
    packName: "Phosphor",
    license: "MIT",
    palette: false,
  },
  {
    prefix: "mdi",
    name: "creation",
    packName: "Material Design Icons",
    license: "Apache-2.0",
    palette: false,
  },
];

const pickRandomIcon = async (): Promise<LogoIcon> => {
  const query =
    RANDOM_ICON_QUERIES[
      Math.floor(Math.random() * RANDOM_ICON_QUERIES.length)
    ];
  const pack =
    AI_ICON_PACKS[Math.floor(Math.random() * AI_ICON_PACKS.length)];

  try {
    const { icons } = await searchIcons({
      query,
      prefix: pack.prefix,
      limit: 32,
    });
    if (icons.length > 0) {
      const pick = icons[Math.floor(Math.random() * icons.length)];
      return {
        prefix: pick.prefix,
        name: pick.name,
        packName: pick.packName,
        license: pick.license,
        palette: pick.palette,
      };
    }
  } catch {
    // fall through
  }

  return FALLBACK_RANDOM_ICONS[
    Math.floor(Math.random() * FALLBACK_RANDOM_ICONS.length)
  ];
};

const configsEqual = (a: LogoConfig, b: LogoConfig) =>
  JSON.stringify(a) === JSON.stringify(b);

export const useLogoStore = () => {
  const [session, setSession] = useState<SessionState>(() => defaultSession());
  const [config, setConfig] = useState<LogoConfig>(DEFAULT_CONFIG);
  const [ready, setReady] = useState(false);
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    const loaded = loadSession();
    setSession(loaded);
    setConfig(loaded.entries[loaded.index]?.config ?? DEFAULT_CONFIG);
    setReady(true);
  }, []);

  const persist = useCallback((next: SessionState, nextConfig: LogoConfig) => {
    sessionRef.current = next;
    setSession(next);
    setConfig(nextConfig);
    saveSession(next);
  }, []);

  const commit = useCallback(
    (next: LogoConfig, source: HistorySource, label?: string) => {
      const current = sessionRef.current;
      const currentConfig = current.entries[current.index]?.config;
      if (currentConfig && configsEqual(currentConfig, next)) return;

      const entry = createHistoryEntry(next, source, label);
      const updated = pushEntry(current, entry);
      persist(updated, next);
    },
    [persist],
  );

  const undo = useCallback(() => {
    const current = sessionRef.current;
    if (current.index <= 0) return;
    const index = current.index - 1;
    const updated = { ...current, index };
    persist(updated, updated.entries[index].config);
  }, [persist]);

  const redo = useCallback(() => {
    const current = sessionRef.current;
    if (current.index >= current.entries.length - 1) return;
    const index = current.index + 1;
    const updated = { ...current, index };
    persist(updated, updated.entries[index].config);
  }, [persist]);

  const restoreVersion = useCallback(
    (id: string) => {
      const current = sessionRef.current;
      const index = current.entries.findIndex((entry) => entry.id === id);
      if (index < 0) return false;
      const updated = { ...current, index };
      persist(updated, updated.entries[index].config);
      return true;
    },
    [persist],
  );

  const setIcon = useCallback(
    (icon: LogoIcon) => {
      void fetchIcon(icon.prefix, icon.name);
      const current = sessionRef.current;
      const prev = current.entries[current.index]?.config ?? DEFAULT_CONFIG;
      const next = {
        ...prev,
        icon,
        customSvg: null,
        weight: icon.prefix.startsWith("ph") ? icon.prefix : null,
      };
      commit(next, "manual");
    },
    [commit],
  );

  const update = useCallback(
    (patch: Partial<LogoConfig>) => {
      const current = sessionRef.current;
      const prev = current.entries[current.index]?.config ?? DEFAULT_CONFIG;
      commit({ ...prev, ...patch }, "manual");
    },
    [commit],
  );

  const applyPreset = useCallback(
    (id: string) => {
      const preset = PRESETS.find((item) => item.id === id);
      if (!preset) return;
      const current = sessionRef.current;
      const prev = current.entries[current.index]?.config ?? DEFAULT_CONFIG;
      const next = applyPresetToConfig(prev, preset);
      commit(next, "preset", `Preset · ${preset.name}`);
    },
    [commit],
  );

  const randomize = useCallback(() => {
    void (async () => {
      const current = sessionRef.current;
      const prev = current.entries[current.index]?.config ?? DEFAULT_CONFIG;
      const preset = PRESETS[Math.floor(Math.random() * PRESETS.length)];
      const icon = await pickRandomIcon();
      void fetchIcon(icon.prefix, icon.name);
      const next = {
        ...applyPresetToConfig(prev, preset),
        icon,
        customSvg: null,
        weight: icon.prefix.startsWith("ph") ? icon.prefix : null,
        size: 48 + Math.floor(Math.random() * 20),
        rotate:
          Math.random() > 0.7
            ? [-15, -8, 8, 15][Math.floor(Math.random() * 4)]
            : 0,
        strokeWidth: Number((1.5 + Math.random() * 1.2).toFixed(2)),
      };
      commit(next, "random", labelForConfig(next, "random"));
    })();
  }, [commit]);

  const applyAiActions = useCallback(
    async (actions: AiAction[]): Promise<AiApplied> => {
      const applied: AiApplied = {};
      const current = sessionRef.current;
      let workingSession = current;
      let next =
        current.entries[current.index]?.config ?? DEFAULT_CONFIG;
      let restoredOnly = false;

      for (const action of actions) {
        if (action.type === "restoreVersion") {
          let targetIndex = -1;
          if (action.versionId) {
            targetIndex = workingSession.entries.findIndex(
              (entry) =>
                entry.id === action.versionId ||
                entry.id.startsWith(action.versionId ?? ""),
            );
          } else if (action.stepsBack != null && action.stepsBack > 0) {
            targetIndex = workingSession.index - action.stepsBack;
          } else {
            targetIndex = workingSession.index - 1;
          }

          if (
            targetIndex < 0 ||
            targetIndex >= workingSession.entries.length
          ) {
            continue;
          }

          workingSession = { ...workingSession, index: targetIndex };
          next = workingSession.entries[targetIndex].config;
          applied.restored = {
            id: workingSession.entries[targetIndex].id,
            label: workingSession.entries[targetIndex].label,
          };
          restoredOnly = true;
          continue;
        }

        restoredOnly = false;

        if (action.type === "setIcon") {
          void fetchIcon(action.prefix, action.name);
          next = {
            ...next,
            icon: {
              prefix: action.prefix,
              name: action.name,
              packName: packNameFor(action.prefix, action.packName),
              license: action.license ?? "Unknown",
              palette: Boolean(action.palette),
            },
            customSvg: null,
            weight: action.prefix.startsWith("ph")
              ? action.prefix
              : next.weight,
          };
          applied.icon = {
            prefix: action.prefix,
            name: action.name,
            packName: packNameFor(action.prefix, action.packName),
          };
        }

        if (action.type === "editIconSvg") {
          next = {
            ...next,
            customSvg: action.svg,
          };
          applied.svgEdited = true;
        }

        if (action.type === "setBackground") {
          next = {
            ...next,
            background: action.background ?? next.background,
            rounded:
              action.rounded != null
                ? clamp(action.rounded, 0, 50)
                : next.rounded,
            padding:
              action.padding != null
                ? clamp(action.padding, 0, 45)
                : next.padding,
            shadow: action.shadow ?? next.shadow,
            shadowColor: action.shadowColor ?? next.shadowColor,
            shadowOpacity:
              action.shadowOpacity != null
                ? clamp(action.shadowOpacity, 0, 100)
                : next.shadowOpacity,
            shadowBlur:
              action.shadowBlur != null
                ? clamp(action.shadowBlur, 0, 80)
                : next.shadowBlur,
            shadowOffsetX:
              action.shadowOffsetX != null
                ? clamp(action.shadowOffsetX, -40, 40)
                : next.shadowOffsetX,
            shadowOffsetY:
              action.shadowOffsetY != null
                ? clamp(action.shadowOffsetY, -40, 60)
                : next.shadowOffsetY,
            shadowSpread:
              action.shadowSpread != null
                ? clamp(action.shadowSpread, -40, 40)
                : next.shadowSpread,
          };
        }

        if (action.type === "setIconStyle") {
          next = {
            ...next,
            size:
              action.size != null ? clamp(action.size, 20, 90) : next.size,
            rotate:
              action.rotate != null
                ? clamp(action.rotate, -180, 180)
                : next.rotate,
            strokeWidth:
              action.strokeWidth != null
                ? clamp(action.strokeWidth, 0.5, 3.5)
                : next.strokeWidth,
            weight: action.weight !== undefined ? action.weight : next.weight,
            iconColor: action.iconColor ?? next.iconColor,
          };
        }

        if (action.type === "applyPreset") {
          const preset = PRESETS.find((item) => item.id === action.id);
          if (preset) {
            next = applyPresetToConfig(next, preset);
            applied.preset = { id: preset.id, name: preset.name };
          }
        }
      }

      if (!applied.preset && !applied.restored) {
        const active = findActivePresetId(next);
        if (active) {
          const preset = PRESETS.find((item) => item.id === active);
          if (preset) {
            applied.preset = { id: preset.id, name: preset.name };
          }
        }
      }

      if (restoredOnly && applied.restored) {
        persist(workingSession, next);
        return applied;
      }

      const label = applied.svgEdited
        ? `AI · SVG edit · ${next.icon.name.replaceAll("-", " ")}`
        : applied.preset && applied.icon
          ? `AI · ${applied.preset.name} · ${applied.icon.name.replaceAll("-", " ")}`
          : labelForConfig(next, "ai");
      const entry = createHistoryEntry(next, "ai", label);
      const updated = pushEntry(workingSession, entry);
      persist(updated, next);
      return applied;
    },
    [persist],
  );

  const historySummary = summarizeHistoryForAi(session);

  return {
    config,
    ready,
    activePresetId: findActivePresetId(config),
    history: Array.isArray(session.entries)
      ? (session.entries as HistoryEntry[])
      : [],
    historyIndex: session.index,
    historySummary,
    canUndo: session.index > 0,
    canRedo: session.index < session.entries.length - 1,
    undo,
    redo,
    restoreVersion,
    reset: () => commit(DEFAULT_CONFIG, "manual", "Reset · Sparkles"),
    setIcon,
    update,
    applyPreset,
    randomize,
    applyAiActions,
  };
};

export type LogoStore = ReturnType<typeof useLogoStore>;
