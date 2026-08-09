"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  format?: (value: number) => string;
  parse?: (raw: string) => number | null;
  onChange: (value: number) => void;
};

const defaultParse = (raw: string): number | null => {
  const cleaned = raw.replace(/[^\d.-]/g, "").trim();
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") {
    return null;
  }
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

const snapToStep = (value: number, min: number, step: number) => {
  const snapped = Math.round((value - min) / step) * step + min;
  const decimals = String(step).includes(".")
    ? (String(step).split(".")[1]?.length ?? 0)
    : 0;
  return Number(snapped.toFixed(decimals));
};

export const Slider = ({
  label,
  value,
  min,
  max,
  step = 1,
  disabled = false,
  format = (v) => String(v),
  parse = defaultParse,
  onChange,
}: SliderProps) => {
  const pct = ((value - min) / (max - min)) * 100;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => format(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = editing && !disabled;
  const shown = isEditing ? draft : format(value);

  useEffect(() => {
    if (!isEditing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isEditing]);

  const commitDraft = () => {
    const parsed = parse(draft);
    setEditing(false);
    if (parsed == null) {
      setDraft(format(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, parsed));
    onChange(snapToStep(clamped, min, step));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitDraft();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setDraft(format(value));
      setEditing(false);
    }
  };

  return (
    <div
      className={`flex flex-col gap-2 ${disabled ? "pointer-events-none opacity-40" : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-ink">{label}</span>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            aria-label={`${label} value`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitDraft}
            onKeyDown={handleKeyDown}
            className="focus-ring tabular w-16 rounded-[8px] border border-line bg-bg px-1.5 py-0.5 text-right text-[13px] text-ink"
          />
        ) : (
          <button
            type="button"
            tabIndex={disabled ? -1 : 0}
            disabled={disabled}
            aria-label={`Edit ${label} value, currently ${shown}`}
            title={`Click to edit ${label.toLowerCase()}`}
            className="focus-ring tabular rounded-[8px] px-1.5 py-0.5 text-[13px] text-ink-2 transition hover:bg-bg hover:text-ink disabled:hover:bg-transparent"
            onClick={() => {
              if (disabled) return;
              setDraft(format(value));
              setEditing(true);
            }}
          >
            {shown}
          </button>
        )}
      </div>
      <div className="px-1.5">
        <input
          className="forge-slider focus-ring w-full"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-label={label}
          onChange={(event) => onChange(Number(event.target.value))}
          style={{
            background: `linear-gradient(to right, var(--ink) 0%, var(--ink) ${pct}%, var(--line) ${pct}%, var(--line) 100%)`,
          }}
        />
      </div>
    </div>
  );
};
