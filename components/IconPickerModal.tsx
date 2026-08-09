"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { fadeScale, springSnappy } from "@/lib/motion";
import { fetchIcon, thumbnailUrl } from "@/lib/iconify";
import { FEATURED_PACKS, getPackBadge } from "@/lib/presets";
import type { IconSearchResult, LogoIcon, PackInfo } from "@/lib/types";

type IconPickerModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (icon: LogoIcon) => void;
};

export const IconPickerModal = ({
  open,
  onClose,
  onSelect,
}: IconPickerModalProps) => {
  const titleId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [prefix, setPrefix] = useState<string | null>(null);
  const [icons, setIcons] = useState<IconSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [packsOpen, setPacksOpen] = useState(false);
  const [allPacks, setAllPacks] = useState<PackInfo[]>([]);
  const [packFilter, setPackFilter] = useState("");
  const [focusIndex, setFocusIndex] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 320);
    return () => window.clearTimeout(timer);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (packsOpen) setPacksOpen(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose, packsOpen]);

  const loadIcons = useCallback(
    async (start = 0, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams({
          query: debouncedQuery,
          start: String(start),
        });
        if (prefix) params.set("prefix", prefix);
        if (append || start > 0) params.set("mode", "search");
        const res = await fetch(`/api/icons/search?${params}`);
        const data = (await res.json()) as {
          icons: IconSearchResult[];
          total: number;
          error?: string;
        };
        if (data.error) throw new Error(data.error);
        setIcons((prev) => (append ? [...prev, ...data.icons] : data.icons));
        setTotal(data.total);
        if (!append) setFocusIndex(0);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [debouncedQuery, prefix],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      await loadIcons(0, false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, loadIcons]);

  const loadAllPacks = async () => {
    if (allPacks.length) {
      setPacksOpen(true);
      return;
    }
    const res = await fetch("/api/packs");
    const data = (await res.json()) as { packs: PackInfo[] };
    setAllPacks(data.packs ?? []);
    setPacksOpen(true);
  };

  const handleSelect = (icon: IconSearchResult) => {
    void fetchIcon(icon.prefix, icon.name);
    onSelect({
      prefix: icon.prefix,
      name: icon.name,
      packName: icon.packName,
      license: icon.license,
      palette: icon.palette,
    });
    onClose();
  };

  const handleGridKeyDown = (event: ReactKeyboardEvent) => {
    if (!icons.length) return;
    const cols = 9;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setFocusIndex((i) => Math.min(icons.length - 1, i + 1));
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setFocusIndex((i) => Math.max(0, i - 1));
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setFocusIndex((i) => Math.min(icons.length - 1, i + cols));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setFocusIndex((i) => Math.max(0, i - cols));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      handleSelect(icons[focusIndex]);
    }
  };

  const filteredPacks = allPacks.filter((pack) => {
    const q = packFilter.toLowerCase();
    return (
      pack.name.toLowerCase().includes(q) ||
      pack.prefix.toLowerCase().includes(q)
    );
  });

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="icon-picker"
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
        >
          <motion.button
            type="button"
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
            aria-label="Close icon picker"
            onClick={onClose}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col rounded-t-[20px] border border-line bg-panel shadow-[var(--shadow-modal)] sm:mx-4 sm:rounded-[20px]"
            variants={fadeScale}
            initial={reduceMotion ? false : "hidden"}
            animate="show"
            exit={reduceMotion ? undefined : "exit"}
          >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id={titleId} className="text-[18px] font-bold text-ink">
            Pick an icon
          </h2>
          <button
            type="button"
            className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink hover:bg-bg"
            aria-label="Close"
            title="Close"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 border-b border-line px-5 py-4">
          <label className="relative block">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-3"
              aria-hidden
            />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search icons across every pack…"
              className="focus-ring w-full rounded-[12px] border border-line bg-bg py-2.5 pr-3 pl-10 text-[14px] text-ink placeholder:text-ink-3"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-semibold text-ink-2">Pack:</span>
            <button
              type="button"
              className={`focus-ring rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                prefix === null
                  ? "bg-ink text-white"
                  : "border border-line bg-bg text-ink-2"
              }`}
              onClick={() => setPrefix(null)}
            >
              All packs
            </button>
            {FEATURED_PACKS.map((pack) => (
              <button
                key={pack.prefix}
                type="button"
                className={`focus-ring rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                  prefix === pack.prefix
                    ? "bg-ink text-white"
                    : "border border-line bg-bg text-ink-2"
                }`}
                onClick={() => setPrefix(pack.prefix)}
              >
                {pack.name}
              </button>
            ))}
            <button
              type="button"
              className="focus-ring rounded-full border border-line bg-bg px-3 py-1.5 text-[12px] font-semibold text-ink-2"
              onClick={() => void loadAllPacks()}
            >
              +193 more
            </button>
          </div>

          <p className="text-[12px] text-ink-3">
            {debouncedQuery
              ? `${total.toLocaleString()} results`
              : prefix
                ? `Showing ${total.toLocaleString()} icons from ${prefix}`
                : "Showing popular icons · 312,000+ across 200+ packs"}
          </p>
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto p-4"
          onKeyDown={handleGridKeyDown}
        >
          {loading ? (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-9">
              {Array.from({ length: 36 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-square animate-pulse rounded-[12px] bg-bg"
                />
              ))}
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-9"
              role="listbox"
              aria-label="Icon results"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: {
                  transition: { staggerChildren: reduceMotion ? 0 : 0.012 },
                },
              }}
            >
              {icons.map((icon, index) => (
                <motion.button
                  key={`${icon.prefix}:${icon.name}:${index}`}
                  type="button"
                  role="option"
                  aria-selected={focusIndex === index}
                  tabIndex={focusIndex === index ? 0 : -1}
                  className={`focus-ring relative flex aspect-square items-center justify-center rounded-[12px] bg-bg text-ink ${
                    focusIndex === index ? "ring-2 ring-ink" : ""
                  }`}
                  onClick={() => handleSelect(icon)}
                  onFocus={() => setFocusIndex(index)}
                  title={`${icon.name} · ${icon.packName}`}
                  variants={{
                    hidden: { opacity: 0, scale: 0.88 },
                    show: { opacity: 1, scale: 1, transition: springSnappy },
                  }}
                  whileHover={
                    reduceMotion
                      ? undefined
                      : { backgroundColor: "var(--accent-soft)", scale: 1.04 }
                  }
                  whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                >
                  <span
                    className="h-6 w-6 bg-center bg-no-repeat"
                    style={{
                      backgroundImage: `url("${thumbnailUrl(icon.prefix, icon.name)}")`,
                      backgroundSize: "contain",
                    }}
                    aria-hidden
                  />
                  {!prefix ? (
                    <span className="absolute right-1 bottom-1 rounded bg-panel/90 px-1 text-[8px] font-bold tracking-wide text-ink-3">
                      {getPackBadge(icon.prefix)}
                    </span>
                  ) : null}
                </motion.button>
              ))}
            </motion.div>
          )}

          {!loading && debouncedQuery && icons.length < total ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                className="focus-ring rounded-full border border-line px-4 py-2 text-[13px] font-semibold text-ink hover:bg-bg disabled:opacity-50"
                disabled={loadingMore}
                onClick={() => void loadIcons(icons.length, true)}
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          ) : null}
        </div>

        <AnimatePresence>
          {packsOpen ? (
            <motion.div
              className="absolute inset-0 z-20 flex flex-col rounded-[20px] bg-panel"
              initial={reduceMotion ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, x: 24 }}
              transition={springSnappy}
            >
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <h3 className="text-[16px] font-bold">All packs</h3>
                <button
                  type="button"
                  className="focus-ring rounded-full border border-line px-3 py-1.5 text-[12px] font-semibold"
                  onClick={() => setPacksOpen(false)}
                >
                  Back
                </button>
              </div>
              <div className="border-b border-line px-5 py-3">
                <input
                  type="search"
                  value={packFilter}
                  onChange={(event) => setPackFilter(event.target.value)}
                  placeholder="Search packs…"
                  className="focus-ring w-full rounded-[12px] border border-line bg-bg px-3 py-2.5 text-[14px]"
                />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {filteredPacks.map((pack) => (
                    <button
                      key={pack.prefix}
                      type="button"
                      className="focus-ring flex items-center justify-between rounded-[12px] px-3 py-2.5 text-left hover:bg-bg"
                      onClick={() => {
                        setPrefix(pack.prefix);
                        setPacksOpen(false);
                      }}
                    >
                      <span className="font-medium text-ink">{pack.name}</span>
                      <span className="text-[12px] text-ink-3">
                        {pack.total.toLocaleString()} · {pack.prefix}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
