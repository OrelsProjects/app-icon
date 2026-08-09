"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { GradientEditor } from "@/components/GradientEditor";
import { ColorSwatches } from "@/components/ui/ColorSwatches";
import { EyedropperButton } from "@/components/ui/EyedropperButton";
import {
  BACKGROUND_COLORS,
  BACKGROUND_GRADIENTS,
} from "@/lib/presets";
import {
  buildGradientCss,
  defaultGradientStops,
  isGradient,
  parseGradient,
} from "@/lib/gradient";
import { fadeRise, springSnappy } from "@/lib/motion";

type BackgroundPickerProps = {
  value: string;
  onChange: (value: string) => void;
};

type Mode = "solid" | "gradient";

export const BackgroundPicker = ({ value, onChange }: BackgroundPickerProps) => {
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState<Mode>(
    isGradient(value) ? "gradient" : "solid",
  );

  useEffect(() => {
    setMode(isGradient(value) ? "gradient" : "solid");
  }, [value]);

  const handleMode = (next: Mode) => {
    setMode(next);
    if (next === "solid" && isGradient(value)) {
      const parsed = parseGradient(value);
      onChange(parsed?.stops[0]?.color ?? BACKGROUND_COLORS[0]);
      return;
    }
    if (next === "gradient" && !isGradient(value)) {
      const solid = value.startsWith("#") ? value : "#FF8A4C";
      onChange(
        buildGradientCss("linear", 135, [
          { ...defaultGradientStops()[0], color: "#FFE0C2" },
          { ...defaultGradientStops()[1], color: solid },
        ]),
      );
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1 rounded-full border border-line bg-bg p-1">
          <button
            type="button"
            className={`focus-ring flex-1 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
              mode === "solid"
                ? "bg-ink text-white"
                : "text-ink-2 hover:text-ink"
            }`}
            aria-pressed={mode === "solid"}
            onClick={() => handleMode("solid")}
          >
            Solid
          </button>
          <button
            type="button"
            className={`focus-ring flex-1 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
              mode === "gradient"
                ? "bg-ink text-white"
                : "text-ink-2 hover:text-ink"
            }`}
            aria-pressed={mode === "gradient"}
            onClick={() => handleMode("gradient")}
          >
            Gradient
          </button>
        </div>
        {mode === "solid" ? (
          <EyedropperButton
            label="Pick background color from screen"
            onPick={onChange}
          />
        ) : null}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {mode === "solid" ? (
          <motion.div
            key="solid"
            variants={fadeRise}
            initial={reduceMotion ? false : "hidden"}
            animate="show"
            exit={reduceMotion ? undefined : "exit"}
          >
            <ColorSwatches
              label="Background color"
              colors={[...BACKGROUND_COLORS]}
              value={isGradient(value) ? BACKGROUND_COLORS[0] : value}
              onChange={onChange}
            />
          </motion.div>
        ) : (
          <motion.div
            key="gradient"
            className="flex flex-col gap-3"
            variants={fadeRise}
            initial={reduceMotion ? false : "hidden"}
            animate="show"
            exit={reduceMotion ? undefined : "exit"}
          >
            <div className="flex flex-col gap-2">
              <span className="text-[12px] font-semibold tracking-wide text-ink-2 uppercase">
                Gradient presets
              </span>
              <div className="grid grid-cols-4 gap-2 px-1 py-1">
                {BACKGROUND_GRADIENTS.map((gradient) => {
                  const selected = value === gradient.value;
                  return (
                    <motion.button
                      key={gradient.id}
                      type="button"
                      tabIndex={0}
                      aria-label={gradient.name}
                      aria-pressed={selected}
                      title={gradient.name}
                      className={`focus-ring h-9 rounded-[10px] border ${
                        selected
                          ? "border-ink ring-2 ring-ink ring-offset-2"
                          : "border-line"
                      }`}
                      style={{ background: gradient.value }}
                      onClick={() => onChange(gradient.value)}
                      whileHover={
                        reduceMotion ? undefined : { scale: 1.04 }
                      }
                      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                      transition={springSnappy}
                    />
                  );
                })}
              </div>
            </div>

            <GradientEditor value={value} onChange={onChange} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
