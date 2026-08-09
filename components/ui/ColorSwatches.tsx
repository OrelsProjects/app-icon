"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ChangeEvent } from "react";
import { EyedropperButton } from "@/components/ui/EyedropperButton";
import { springSnappy } from "@/lib/motion";

type ColorSwatchesProps = {
  label: string;
  colors: string[];
  value: string;
  disabled?: boolean;
  showNone?: boolean;
  noneSelected?: boolean;
  onChange: (value: string) => void;
  onNone?: () => void;
};

export const ColorSwatches = ({
  label,
  colors,
  value,
  disabled = false,
  showNone = false,
  noneSelected = false,
  onChange,
  onNone,
}: ColorSwatchesProps) => {
  const reduceMotion = useReducedMotion();

  const handleCustom = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className={`flex flex-col gap-2 ${disabled ? "opacity-45" : ""}`}>
      <span className="text-[12px] font-semibold tracking-wide text-ink-2 uppercase">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-2 px-1 py-1">
        {colors.map((color) => {
          const selected = !noneSelected && value === color;
          return (
            <motion.button
              key={color}
              type="button"
              disabled={disabled}
              aria-label={`Select ${color}`}
              title={color}
              aria-pressed={selected}
              tabIndex={0}
              className={`focus-ring h-8 w-8 shrink-0 rounded-full border ${
                selected
                  ? "border-ink ring-2 ring-ink ring-offset-2"
                  : "border-line"
              }`}
              style={{ background: color }}
              onClick={() => onChange(color)}
              whileHover={
                reduceMotion || disabled ? undefined : { scale: 1.1 }
              }
              whileTap={
                reduceMotion || disabled ? undefined : { scale: 0.92 }
              }
              animate={{ scale: selected && !reduceMotion ? 1.06 : 1 }}
              transition={springSnappy}
            />
          );
        })}
        <label
          className={`focus-ring relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-dashed border-ink-3 text-ink-2 ${disabled ? "pointer-events-none" : ""}`}
          title="Custom color"
        >
          <span aria-hidden>+</span>
          <span className="sr-only">Custom color</span>
          <input
            type="color"
            className="absolute inset-0 cursor-pointer opacity-0"
            disabled={disabled}
            value={value.startsWith("#") ? value : "#FF5A00"}
            onChange={handleCustom}
          />
        </label>
        <EyedropperButton
          disabled={disabled}
          label={`Pick ${label.toLowerCase()} from screen`}
          onPick={onChange}
        />
        {showNone ? (
          <motion.button
            type="button"
            disabled={disabled}
            tabIndex={0}
            aria-label="No shadow"
            title="No shadow"
            aria-pressed={noneSelected}
            className={`focus-ring relative h-8 w-8 shrink-0 overflow-hidden rounded-full border bg-panel ${
              noneSelected
                ? "border-ink ring-2 ring-ink ring-offset-2"
                : "border-line"
            }`}
            onClick={() => onNone?.()}
            whileHover={
              reduceMotion || disabled ? undefined : { scale: 1.1 }
            }
            whileTap={
              reduceMotion || disabled ? undefined : { scale: 0.92 }
            }
          >
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 32 32"
              fill="none"
              aria-hidden
            >
              <path
                d="M6 26L26 6"
                stroke="#DC2626"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </motion.button>
        ) : null}
      </div>
      {disabled ? (
        <p className="text-[12px] text-ink-3">
          Multi-color icons keep their original palette.
        </p>
      ) : null}
    </div>
  );
};
