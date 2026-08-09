"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { KeyboardEvent } from "react";
import { IconSvg } from "@/components/IconSvg";
import { springSnappy } from "@/lib/motion";
import type { LogoIcon } from "@/lib/types";

type IconSlotProps = {
  icon: LogoIcon;
  customSvg?: string | null;
  onClick: () => void;
};

export const IconSlot = ({ icon, customSvg, onClick }: IconSlotProps) => {
  const reduceMotion = useReducedMotion();
  const iconKey = customSvg
    ? `custom:${icon.prefix}:${icon.name}:${customSvg.length}`
    : `${icon.prefix}:${icon.name}`;

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label={`Change icon, currently ${icon.name} from ${icon.packName}`}
      title="Change icon"
      className="focus-ring group flex w-full items-center gap-3 rounded-[16px] border-2 border-dashed border-ink/80 bg-panel px-3 py-3 text-left"
      whileHover={
        reduceMotion
          ? undefined
          : {
              borderColor: "var(--accent)",
              backgroundColor: "var(--accent-soft)",
            }
      }
      whileTap={reduceMotion ? undefined : { scale: 0.985 }}
      transition={springSnappy}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-[12px] border border-line bg-white p-2.5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={iconKey}
            initial={
              reduceMotion ? false : { opacity: 0, scale: 0.7, rotate: -12 }
            }
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={
              reduceMotion ? undefined : { opacity: 0, scale: 0.7, rotate: 12 }
            }
            transition={springSnappy}
            className="inline-flex h-full w-full"
          >
            <IconSvg
              prefix={icon.prefix}
              name={icon.name}
              svg={customSvg}
              color="#201E1D"
              className="h-full w-full"
              title={icon.name}
            />
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="min-w-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={iconKey}
            className="truncate text-[15px] font-semibold capitalize text-ink"
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={springSnappy}
          >
            {icon.name.replaceAll("-", " ")}
          </motion.div>
        </AnimatePresence>
        <div className="mt-1 flex items-center gap-2">
          <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-accent uppercase">
            {icon.packName}
          </span>
          <span className="text-[12px] font-medium text-ink-2 group-hover:text-accent">
            Change <ChevronRight className="inline h-3 w-3" aria-hidden />
          </span>
        </div>
      </div>
    </motion.button>
  );
};
