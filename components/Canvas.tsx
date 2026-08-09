"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Dices, Minus, Moon, Plus, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { IconSvg } from "@/components/IconSvg";
import { fadeRise, springSoft, springSnappy } from "@/lib/motion";
import { buildPreviewBoxShadow } from "@/lib/shadow";
import type { LogoConfig } from "@/lib/types";

type CanvasProps = {
  config: LogoConfig;
  zoom: number;
  darkPreview: boolean;
  onZoomChange: (zoom: number) => void;
  onToggleDark: () => void;
  onRandomize: () => void;
};

export const Canvas = ({
  config,
  zoom,
  darkPreview,
  onZoomChange,
  onToggleDark,
  onRandomize,
}: CanvasProps) => {
  const tileSize = 280;
  const radius = (config.rounded / 100) * (tileSize / 2);
  const pad = (config.padding / 100) * tileSize * 0.35;
  const iconSize = (config.size / 100) * (tileSize - pad * 2);
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? { duration: 0 } : springSoft;
  const iconKey = config.customSvg
    ? `custom:${config.icon.prefix}:${config.icon.name}:${config.customSvg.length}`
    : `${config.icon.prefix}:${config.icon.name}`;

  return (
    <motion.section
      className={`relative flex min-h-[420px] flex-1 flex-col items-center justify-center overflow-hidden ${
        darkPreview ? "dotted-canvas-dark" : "dotted-canvas"
      }`}
      animate={{ backgroundColor: darkPreview ? "#1c1c1f" : "#eef0ee" }}
      transition={transition}
    >
      <motion.div
        className="flex flex-col items-center gap-4"
        animate={{ scale: zoom / 100 }}
        transition={transition}
      >
        <motion.div
          className="relative flex items-center justify-center"
          aria-label="Logo preview"
          animate={{
            borderRadius: radius,
            boxShadow: buildPreviewBoxShadow(config),
          }}
          transition={transition}
          style={{
            width: tileSize,
            height: tileSize,
            background: config.background,
          }}
          layout
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={iconKey}
              className="flex items-center justify-center"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.86 }}
              animate={{
                opacity: 1,
                scale: 1,
                rotate: config.rotate,
                width: iconSize,
                height: iconSize,
              }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.9 }}
              transition={transition}
            >
              <IconSvg
                prefix={config.icon.prefix}
                name={config.icon.name}
                svg={config.customSvg}
                color={config.icon.palette ? undefined : config.iconColor}
                strokeWidth={
                  config.icon.palette ? undefined : config.strokeWidth
                }
                className="h-full w-full"
                title={config.icon.name}
              />
            </motion.div>
          </AnimatePresence>
        </motion.div>
        <motion.p
          key={config.icon.packName}
          className={`text-[12px] tabular ${darkPreview ? "text-white/55" : "text-ink-3"}`}
          variants={fadeRise}
          initial={reduceMotion ? false : "hidden"}
          animate="show"
        >
          SVG 512 · PNG 2048 · {config.icon.packName}
        </motion.p>
      </motion.div>

      <motion.div
        className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-ink px-2 py-1.5 text-white shadow-[var(--shadow)]"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : springSnappy}
      >
        <ToolbarButton
          label="Zoom out"
          onClick={() => onZoomChange(Math.max(50, zoom - 10))}
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>
        <span className="min-w-12 text-center text-[12px] font-semibold tabular">
          {zoom}%
        </span>
        <ToolbarButton
          label="Zoom in"
          onClick={() => onZoomChange(Math.min(160, zoom + 10))}
        >
          <Plus className="h-4 w-4" />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-white/20" aria-hidden />
        <ToolbarButton
          label={darkPreview ? "Light preview" : "Dark preview"}
          onClick={onToggleDark}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={darkPreview ? "sun" : "moon"}
              initial={
                reduceMotion ? false : { opacity: 0, rotate: -40, scale: 0.7 }
              }
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={
                reduceMotion ? undefined : { opacity: 0, rotate: 40, scale: 0.7 }
              }
              transition={springSnappy}
              className="inline-flex"
            >
              {darkPreview ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </motion.span>
          </AnimatePresence>
        </ToolbarButton>
        <ToolbarButton label="Randomize logo" onClick={onRandomize}>
          <motion.span
            whileTap={reduceMotion ? undefined : { rotate: 180, scale: 0.9 }}
            transition={springSnappy}
            className="inline-flex"
          >
            <Dices className="h-4 w-4" />
          </motion.span>
        </ToolbarButton>
      </motion.div>
    </motion.section>
  );
};

const ToolbarButton = ({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) => (
  <motion.button
    type="button"
    className="focus-ring flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10"
    aria-label={label}
    title={label}
    onClick={onClick}
    whileHover={{ scale: 1.08 }}
    whileTap={{ scale: 0.92 }}
  >
    {children}
  </motion.button>
);
