"use client";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useRef } from "react";

type CaptchaModalProps = {
  open: boolean;
  onCancel: () => void;
  onSuccess: (token: string) => void;
};

export const CaptchaModal = ({
  open,
  onCancel,
  onSuccess,
}: CaptchaModalProps) => {
  const ref = useRef<TurnstileInstance | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  if (!open || !siteKey) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Security check"
        className="w-full max-w-sm rounded-[20px] border border-line bg-panel p-5 shadow-[var(--shadow-modal)]"
      >
        <h2 className="text-[16px] font-bold text-ink">Quick security check</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
          One-time check for this network, then you can use the AI assistant
          freely.
        </p>
        <div className="mt-4 flex justify-center">
          <Turnstile
            ref={ref}
            siteKey={siteKey}
            onSuccess={onSuccess}
            onExpire={() => ref.current?.reset()}
            options={{
              theme: "light",
              size: "normal",
            }}
          />
        </div>
        <button
          type="button"
          className="focus-ring mt-4 w-full rounded-full border border-line px-4 py-2.5 text-[13px] font-semibold text-ink-2 hover:bg-bg"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
