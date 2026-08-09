"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { collapse, springSnappy } from "@/lib/motion";

type CollapsibleSectionProps = {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
};

export const CollapsibleSection = ({
  title,
  defaultOpen = true,
  children,
  className = "",
}: CollapsibleSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();
  const reduceMotion = useReducedMotion();

  return (
    <section className={`flex flex-col ${className}`}>
      <button
        type="button"
        className="focus-ring -mx-1 flex items-center justify-between gap-2 rounded-[10px] px-1 py-1 text-left"
        aria-expanded={open}
        aria-controls={contentId}
        title={open ? `Collapse ${title}` : `Expand ${title}`}
        onClick={() => setOpen((value) => !value)}
      >
        <h2 className="text-[11px] font-bold tracking-[0.08em] text-ink-3 uppercase">
          {title}
        </h2>
        <motion.span
          animate={{ rotate: open ? 0 : -90 }}
          transition={reduceMotion ? { duration: 0 } : springSnappy}
          className="inline-flex"
        >
          <ChevronDown className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={contentId}
            key="content"
            className="overflow-hidden"
            variants={reduceMotion ? undefined : collapse}
            initial={reduceMotion ? false : "hidden"}
            animate="show"
            exit={reduceMotion ? undefined : "exit"}
          >
            <div className="mt-3 flex flex-col gap-4 px-1">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
};
