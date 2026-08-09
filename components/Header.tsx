"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, History, RotateCcw, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LogoThumb } from "@/components/LogoThumb";
import { PRESETS } from "@/lib/presets";
import { exportLogo } from "@/lib/export";
import { fadeScale, springSnappy } from "@/lib/motion";
import type { HistoryEntry } from "@/lib/session-history";
import type { LogoConfig } from "@/lib/types";

type HeaderProps = {
  config: LogoConfig;
  activePresetId: string | null;
  canUndo: boolean;
  versions: HistoryEntry[];
  versionIndex: number;
  onApplyPreset: (id: string) => void;
  onUndo: () => void;
  onRestoreVersion: (id: string) => void;
};

const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const Header = ({
  config,
  activePresetId,
  canUndo,
  versions,
  versionIndex,
  onApplyPreset,
  onUndo,
  onRestoreVersion,
}: HeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target)) setMenuOpen(false);
      if (!historyRef.current?.contains(target)) setHistoryOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, []);

  const handleExport = async (format: "svg" | "png") => {
    setExporting(true);
    setMenuOpen(false);
    try {
      await exportLogo(config, format);
    } finally {
      setExporting(false);
    }
  };

  const versionList = Array.isArray(versions) ? versions : [];
  const orderedVersions = [...versionList].reverse();

  return (
    <motion.header
      className="flex h-[60px] shrink-0 items-center justify-between gap-4 border-b border-line bg-panel px-4 md:px-5"
      initial={reduceMotion ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : springSnappy}
    >
      <div className="flex items-center gap-2.5">
        <motion.div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white"
          aria-hidden
          whileHover={reduceMotion ? undefined : { rotate: -12, scale: 1.06 }}
          whileTap={reduceMotion ? undefined : { scale: 0.94 }}
        >
          <Zap className="h-4 w-4 fill-current" />
        </motion.div>
        <span className="text-[17px] font-bold tracking-tight text-ink">
          App-Icon
        </span>
      </div>

      <div className="hidden items-center gap-3 sm:flex">
        <span className="text-[11px] font-bold tracking-[0.08em] text-ink-3 uppercase">
          Presets
        </span>
        <div
          className="flex max-w-[min(420px,46vw)] items-center gap-2.5 overflow-x-auto px-1.5 py-2"
          role="list"
        >
          {PRESETS.map((preset, index) => {
            const selected = activePresetId === preset.id;
            return (
              <motion.button
                key={preset.id}
                type="button"
                role="listitem"
                tabIndex={0}
                aria-label={`Apply ${preset.name} preset`}
                aria-pressed={selected}
                title={preset.name}
                className={`focus-ring h-8 w-8 shrink-0 rounded-full border ${
                  selected
                    ? "border-ink ring-2 ring-ink ring-offset-2"
                    : "border-line"
                }`}
                style={{ background: preset.swatch }}
                onClick={() => onApplyPreset(preset.id)}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { ...springSnappy, delay: index * 0.03 }
                }
                whileHover={reduceMotion ? undefined : { scale: 1.1 }}
                whileTap={reduceMotion ? undefined : { scale: 0.92 }}
              />
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={historyRef}>
          <motion.button
            type="button"
            className="focus-ring flex h-10 items-center gap-1.5 rounded-full border border-line bg-panel px-3 text-[13px] font-semibold text-ink"
            aria-label="Session history"
            title="Session history"
            aria-haspopup="menu"
            aria-expanded={historyOpen}
            onClick={() => {
              setHistoryOpen((open) => !open);
              setMenuOpen(false);
            }}
            whileHover={reduceMotion ? undefined : { scale: 1.03 }}
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
          >
            <History className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">History</span>
            <span className="rounded-md bg-bg px-1.5 py-0.5 text-[11px] font-bold text-ink-2 tabular-nums">
              {versionList.length}
            </span>
          </motion.button>
          <AnimatePresence>
            {historyOpen ? (
              <motion.div
                role="menu"
                aria-label="Session logo versions"
                className="absolute right-0 z-40 mt-2 max-h-[min(360px,70vh)] w-[min(320px,92vw)] overflow-y-auto rounded-[12px] border border-line bg-panel shadow-[var(--shadow-modal)]"
                variants={fadeScale}
                initial={reduceMotion ? false : "hidden"}
                animate="show"
                exit={reduceMotion ? undefined : "exit"}
              >
                <div className="border-b border-line px-3 py-2.5">
                  <p className="text-[12px] font-semibold text-ink">
                    This session
                  </p>
                  <p className="text-[11px] text-ink-3">
                    Saved in this browser · ask AI to go back
                  </p>
                </div>
                {orderedVersions.map((entry) => {
                  const index = versionList.findIndex(
                    (item) => item.id === entry.id,
                  );
                  const current = index === versionIndex;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      role="menuitem"
                      tabIndex={0}
                      aria-label={`Restore ${entry.label}`}
                      title={
                        current
                          ? `${entry.label} (current)`
                          : `Restore · ${entry.label}`
                      }
                      aria-current={current ? "true" : undefined}
                      className={`focus-ring flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-bg ${
                        current ? "bg-bg" : ""
                      }`}
                      onClick={() => {
                        onRestoreVersion(entry.id);
                        setHistoryOpen(false);
                      }}
                    >
                      <LogoThumb config={entry.config} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">
                          {entry.label}
                          {current ? " · current" : ""}
                        </span>
                        <span className="block text-[11px] text-ink-3">
                          {entry.source} · {formatTime(entry.createdAt)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <motion.button
          type="button"
          className="focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-line bg-panel text-ink disabled:opacity-40"
          aria-label="Undo"
          title="Undo"
          disabled={!canUndo}
          onClick={onUndo}
          whileHover={reduceMotion || !canUndo ? undefined : { scale: 1.05 }}
          whileTap={
            reduceMotion || !canUndo
              ? undefined
              : { scale: 0.92, rotate: -20 }
          }
        >
          <RotateCcw className="h-4 w-4" />
        </motion.button>

        <div className="relative" ref={menuRef}>
          <motion.button
            type="button"
            className="focus-ring flex h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-[14px] font-semibold text-white disabled:opacity-60"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Download logo"
            title="Download logo"
            disabled={exporting}
            onClick={() => {
              setMenuOpen((open) => !open);
              setHistoryOpen(false);
            }}
            whileHover={reduceMotion ? undefined : { scale: 1.03 }}
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
          >
            {exporting ? "Exporting…" : "Download"}
            <motion.span
              animate={{ rotate: menuOpen ? 180 : 0 }}
              transition={springSnappy}
              className="inline-flex"
            >
              <ChevronDown className="h-4 w-4 opacity-90" aria-hidden />
            </motion.span>
          </motion.button>
          <AnimatePresence>
            {menuOpen ? (
              <motion.div
                role="menu"
                className="absolute right-0 z-40 mt-2 w-40 overflow-hidden rounded-[12px] border border-line bg-panel shadow-[var(--shadow-modal)]"
                variants={fadeScale}
                initial={reduceMotion ? false : "hidden"}
                animate="show"
                exit={reduceMotion ? undefined : "exit"}
              >
                <button
                  type="button"
                  role="menuitem"
                  className="focus-ring block w-full px-3 py-2.5 text-left text-[13px] font-medium hover:bg-bg"
                  onClick={() => handleExport("svg")}
                >
                  Download SVG
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="focus-ring block w-full px-3 py-2.5 text-left text-[13px] font-medium hover:bg-bg"
                  onClick={() => handleExport("png")}
                >
                  Download PNG
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
};
