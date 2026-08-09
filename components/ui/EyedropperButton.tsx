"use client";

import { Pipette } from "lucide-react";
import { useState } from "react";

type EyedropperButtonProps = {
  onPick: (hex: string) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
};

declare global {
  interface Window {
    EyeDropper?: new () => {
      open: () => Promise<{ sRGBHex: string }>;
    };
  }
}

export const EyedropperButton = ({
  onPick,
  disabled = false,
  className = "",
  label = "Pick color from screen",
}: EyedropperButtonProps) => {
  const [busy, setBusy] = useState(false);
  const supported =
    typeof window !== "undefined" && typeof window.EyeDropper === "function";

  const handleClick = async () => {
    if (disabled || busy) return;
    if (!supported || !window.EyeDropper) {
      window.alert(
        "Eyedropper isn’t supported in this browser. Use Chrome or Edge.",
      );
      return;
    }
    setBusy(true);
    try {
      const dropper = new window.EyeDropper();
      const result = await dropper.open();
      onPick(result.sRGBHex.toUpperCase());
    } catch {
      // User cancelled
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      tabIndex={0}
      disabled={disabled || busy}
      aria-label={label}
      title={label}
      className={`focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-panel text-ink-2 transition hover:border-ink/30 hover:text-ink disabled:opacity-40 ${className}`}
      onClick={() => void handleClick()}
    >
      <Pipette className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
};
