"use client";

import { CaptchaModal } from "@/components/CaptchaModal";
import { IconSvg } from "@/components/IconSvg";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp, Square, SquarePen, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { analytics } from "@/lib/analytics";
import { fadeRise, popIn, springSnappy } from "@/lib/motion";
import type {
  AiAction,
  AiApplied,
  ChatMessage,
  LogoConfig,
} from "@/lib/types";

type AiAssistantProps = {
  config: LogoConfig;
  historySummary: string;
  onApplyActions: (actions: AiAction[]) => Promise<AiApplied>;
  captureTyping?: boolean;
  onCaptureFocus?: () => void;
};

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
};

const isPrintableKey = (event: KeyboardEvent) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  if (typeof event.key !== "string" || event.key.length !== 1) return false;
  return true;
};

const StatusOrb = ({ reduceMotion }: { reduceMotion: boolean | null }) => (
  <span
    className="relative mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center"
    aria-hidden
  >
    <motion.span
      className="absolute inset-0 rounded-full bg-ai/15"
      animate={
        reduceMotion
          ? undefined
          : { scale: [0.85, 1.15, 0.85], opacity: [0.35, 0.7, 0.35] }
      }
      transition={
        reduceMotion
          ? undefined
          : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }
      }
    />
    <motion.span
      className="absolute inset-[3px] rounded-full bg-ai/40"
      animate={
        reduceMotion ? undefined : { opacity: [0.45, 0.9, 0.45], scale: [0.9, 1, 0.9] }
      }
      transition={
        reduceMotion
          ? undefined
          : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
      }
    />
    <motion.svg
      viewBox="0 0 16 16"
      className="absolute inset-0 h-4 w-4 text-ai"
      animate={reduceMotion ? undefined : { rotate: 360 }}
      transition={
        reduceMotion
          ? undefined
          : { duration: 3.6, repeat: Infinity, ease: "linear" }
      }
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="10 28"
        opacity="0.95"
      />
    </motion.svg>
  </span>
);

const SUGGESTIONS = [
  "Try a wallet icon",
  "More minimal",
  "Go back to previous",
];

const INTRO_MESSAGE: ChatMessage = {
  id: "intro",
  role: "assistant",
  content:
    "Describe an app, vibe, or icon — I'll pick a free pack, icon, and style for you.",
};

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const AiAssistant = ({
  config,
  historySummary,
  onApplyActions,
  captureTyping = true,
  onCaptureFocus,
}: AiAssistantProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([INTRO_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusSteps, setStatusSteps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const captchaResolverRef = useRef<((token: string | null) => void) | null>(
    null,
  );
  const reduceMotion = useReducedMotion();

  const requestCaptchaToken = () =>
    new Promise<string | null>((resolve) => {
      if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
        resolve(null);
        return;
      }
      captchaResolverRef.current = resolve;
      setCaptchaOpen(true);
    });

  const handleCaptchaSuccess = (token: string) => {
    setCaptchaOpen(false);
    captchaResolverRef.current?.(token);
    captchaResolverRef.current = null;
  };

  const handleCaptchaCancel = () => {
    setCaptchaOpen(false);
    captchaResolverRef.current?.(null);
    captchaResolverRef.current = null;
  };

  const canStartNew = messages.length > 1 || Boolean(input.trim()) || loading;

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading, statusSteps]);

  useEffect(() => {
    if (!captureTyping) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isPrintableKey(event)) return;
      if (isEditableTarget(event.target)) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;

      event.preventDefault();
      onCaptureFocus?.();
      setInput((prev) => prev + event.key);
      requestAnimationFrame(() => {
        const field = inputRef.current;
        if (!field) return;
        field.focus();
        const cursor = field.value.length;
        field.setSelectionRange(cursor, cursor);
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [captureTyping, onCaptureFocus]);

  const logoSummary = [
    `Current: ${config.icon.prefix}:${config.icon.name}`,
    `customSvg=${config.customSvg ? "yes" : "no"}`,
    `bg=${config.background}`,
    `iconColor=${config.iconColor}`,
    `rounded=${config.rounded}`,
    `padding=${config.padding}`,
    `size=${config.size}`,
    `stroke=${config.strokeWidth}`,
    `shadow=${config.shadow ? `${config.shadowColor}/${config.shadowOpacity}% blur=${config.shadowBlur} offset=${config.shadowOffsetX},${config.shadowOffsetY} spread=${config.shadowSpread}` : "off"}`,
    "",
    historySummary,
  ].join("\n");

  const send = async (text: string, viaSuggestion = false) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = {
      id: uid(),
      role: "user",
      content: trimmed,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);
    setStatusSteps(["Thinking…"]);
    analytics.aiMessageSent({
      char_count: trimmed.length,
      via_suggestion: viaSuggestion,
      suggestion: viaSuggestion ? trimmed : undefined,
    });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const payloadMessages = nextMessages
        .filter((message) => message.id !== "intro")
        .map((message) => ({
          role: message.role,
          content: message.content,
        }));

      const body = JSON.stringify({
        messages: payloadMessages,
        logoSummary,
        icon: {
          prefix: config.icon.prefix,
          name: config.icon.name,
          customSvg: config.customSvg,
        },
      });

      const postAi = (captchaToken?: string) =>
        fetch("/api/ai", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(captchaToken ? { "x-captcha-token": captchaToken } : {}),
          },
          body,
          signal: controller.signal,
        });

      let res = await postAi();

      if (res.status === 403) {
        const errData = (await res.json().catch(() => null)) as {
          error?: string;
          code?: string;
        } | null;
        if (
          errData?.code === "captcha_required" ||
          errData?.code === "captcha_failed"
        ) {
          setStatusSteps(["Security check…"]);
          const captchaToken = await requestCaptchaToken();
          if (!captchaToken) {
            throw new Error("Security check cancelled");
          }
          setStatusSteps(["Thinking…"]);
          res = await postAi(captchaToken);
        } else {
          throw new Error(errData?.error ?? "AI request failed");
        }
      }

      if (!res.ok) {
        const errData = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(errData?.error ?? "AI request failed");
      }

      if (!res.body) {
        throw new Error("No response stream");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let donePayload: {
        message?: string;
        actions?: AiAction[];
        applied?: AiApplied;
      } | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          let event: {
            type?: string;
            text?: string;
            message?: string;
            actions?: AiAction[];
            applied?: AiApplied;
            error?: string;
          };
          try {
            event = JSON.parse(trimmedLine) as typeof event;
          } catch {
            continue;
          }

          if (event.type === "status" && event.text) {
            setStatusSteps((prev) =>
              prev[prev.length - 1] === event.text
                ? prev
                : [...prev, event.text!],
            );
            continue;
          }

          if (event.type === "error") {
            throw new Error(event.error ?? "AI request failed");
          }

          if (event.type === "done") {
            donePayload = {
              message: event.message,
              actions: event.actions,
              applied: event.applied,
            };
          }
        }
      }

      if (!donePayload) {
        throw new Error("Stream ended without a result");
      }

      let applied = donePayload.applied;
      if (donePayload.actions?.length) {
        applied = await onApplyActions(donePayload.actions);
      }

      const actionTypes = (donePayload.actions ?? []).map(
        (action) => action.type,
      );
      analytics.aiResponseReceived({
        action_types: actionTypes,
        action_count: actionTypes.length,
        has_applied: Boolean(donePayload.actions?.length),
      });

      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          content: donePayload?.message ?? "Updated your canvas.",
          applied: donePayload?.actions?.length ? applied : undefined,
        },
      ]);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            content: "Stopped.",
          },
        ]);
      } else {
        const message =
          err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        analytics.aiError({ error: message });
      }
    } finally {
      setLoading(false);
      setStatusSteps([]);
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    analytics.aiStopped();
    handleCaptchaCancel();
    abortRef.current?.abort();
  };

  const handleNewChat = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    handleCaptchaCancel();
    setLoading(false);
    setStatusSteps([]);
    setError(null);
    setInput("");
    setMessages([{ ...INTRO_MESSAGE, id: "intro" }]);
    analytics.aiChatReset();
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send(input);
  };

  return (
    <motion.aside
      className="flex h-full w-full flex-col border-l border-line bg-panel md:w-[384px] md:shrink-0"
      initial={reduceMotion ? false : { opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={reduceMotion ? { duration: 0 } : springSnappy}
    >
      <div className="border-b border-line px-4 py-4">
        <div className="flex items-center gap-2">
          <motion.span
            animate={reduceMotion ? undefined : { rotate: [0, -8, 8, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex"
          >
            <Sparkles className="h-4 w-4 text-ai" aria-hidden />
          </motion.span>
          <h2 className="text-[15px] font-bold text-ink">AI Assistant</h2>
          <span className="rounded-md bg-ai-soft px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-ai uppercase">
            Beta
          </span>
          <motion.button
            type="button"
            className="focus-ring ml-auto flex h-8 items-center gap-1.5 rounded-full border border-line bg-panel px-2.5 text-[12px] font-semibold text-ink-2 disabled:opacity-40"
            aria-label="Start new chat"
            title="New chat"
            disabled={!canStartNew}
            onClick={handleNewChat}
            whileHover={
              reduceMotion || !canStartNew ? undefined : { scale: 1.03 }
            }
            whileTap={
              reduceMotion || !canStartNew ? undefined : { scale: 0.97 }
            }
          >
            <SquarePen className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">New chat</span>
          </motion.button>
        </div>
        <p className="mt-1 text-[13px] text-ink-2">
          Describe it — I&apos;ll pick the pack, icon &amp; style.
        </p>
      </div>

      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              variants={fadeRise}
              initial={reduceMotion ? false : "hidden"}
              animate="show"
            >
              <div
                className={`ph-mask max-w-[92%] rounded-[16px] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  message.role === "user"
                    ? "ml-auto bg-ink text-white"
                    : "bg-ai-soft text-ink"
                }`}
              >
                {message.content}
              </div>
              {message.applied ? (
                <motion.div
                  className="mt-2 max-w-[92%] rounded-[14px] border border-line bg-panel p-3 shadow-[var(--shadow)]"
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={springSnappy}
                >
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-ink-2 uppercase">
                    <motion.span
                      className="text-emerald-600"
                      variants={popIn}
                      initial={reduceMotion ? false : "hidden"}
                      animate="show"
                    >
                      ✓
                    </motion.span>
                    Applied to canvas
                  </div>
                  {message.applied.icon ? (
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-line bg-white p-1.5">
                        <IconSvg
                          prefix={message.applied.icon.prefix}
                          name={message.applied.icon.name}
                          color="#201E1D"
                          className="h-full w-full"
                          title={message.applied.icon.name}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-semibold capitalize">
                          {message.applied.icon.name.replaceAll("-", " ")}
                        </div>
                        <span className="rounded bg-accent-soft px-1 py-0.5 text-[10px] font-bold text-accent uppercase">
                          {message.applied.icon.packName}
                        </span>
                      </div>
                    </div>
                  ) : null}
                  {message.applied.preset ? (
                    <div className="mt-2 border-t border-line pt-2 text-[12px] text-ink-2">
                      Preset · {message.applied.preset.name}
                    </div>
                  ) : null}
                  {message.applied.restored ? (
                    <div className="mt-2 border-t border-line pt-2 text-[12px] text-ink-2">
                      Restored · {message.applied.restored.label}
                    </div>
                  ) : null}
                  {message.applied.svgEdited ? (
                    <div className="mt-2 border-t border-line pt-2 text-[12px] text-ink-2">
                      SVG edited
                    </div>
                  ) : null}
                </motion.div>
              ) : null}
            </motion.div>
          ))}
        </AnimatePresence>
        <AnimatePresence>
          {loading ? (
            <motion.div
              key="status"
              className="max-w-[92%] rounded-[16px] border border-line bg-panel px-3.5 py-3 shadow-[var(--shadow)]"
              variants={fadeRise}
              initial={reduceMotion ? false : "hidden"}
              animate="show"
              exit={reduceMotion ? undefined : "exit"}
            >
              <ul className="space-y-2" aria-live="polite" aria-busy="true">
                {statusSteps.map((step, index) => {
                  const current = index === statusSteps.length - 1;
                  return (
                    <li
                      key={`${step}-${index}`}
                      className="flex items-start gap-2 text-[13px] leading-snug text-ink"
                    >
                      {current ? (
                        <StatusOrb reduceMotion={reduceMotion} />
                      ) : (
                        <span
                          className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center text-[12px] font-bold text-emerald-600"
                          aria-hidden
                        >
                          ✓
                        </span>
                      )}
                      <span className={current ? "text-ink-2" : "text-ink"}>
                        {step}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <AnimatePresence>
          {error ? (
            <motion.div
              key="error"
              className="rounded-[12px] border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700"
              variants={fadeRise}
              initial={reduceMotion ? false : "hidden"}
              animate="show"
              exit={reduceMotion ? undefined : "exit"}
            >
              {error}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="border-t border-line px-4 pt-3 pb-2">
        <div className="mb-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <motion.button
              key={suggestion}
              type="button"
              className="focus-ring rounded-full bg-ai-soft px-3 py-1.5 text-[12px] font-semibold text-ai"
              onClick={() => {
                analytics.aiSuggestionClicked({ suggestion });
                void send(suggestion, true);
              }}
              disabled={loading}
              whileHover={reduceMotion ? undefined : { scale: 1.04 }}
              whileTap={reduceMotion ? undefined : { scale: 0.96 }}
            >
              {suggestion}
            </motion.button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <label className="sr-only" htmlFor="ai-input">
            Ask AI to help with your icon
          </label>
          <input
            id="ai-input"
            ref={inputRef}
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask AI to help with your icon…"
            className="ph-mask focus-ring min-w-0 flex-1 rounded-full border border-line bg-bg px-4 py-2.5 text-[13px] text-ink placeholder:text-ink-3"
            disabled={loading}
            autoComplete="off"
            maxLength={2000}
          />
          <AnimatePresence mode="wait" initial={false}>
            {loading ? (
              <motion.button
                key="stop"
                type="button"
                className="focus-ring flex h-10 w-10 items-center justify-center rounded-full bg-ink text-white"
                aria-label="Stop generating"
                title="Stop generating"
                onClick={handleStop}
                initial={reduceMotion ? false : { scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={reduceMotion ? undefined : { scale: 0.8, opacity: 0 }}
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </motion.button>
            ) : (
              <motion.button
                key="send"
                type="submit"
                className="focus-ring flex h-10 w-10 items-center justify-center rounded-full bg-ai text-white disabled:opacity-40"
                aria-label="Send message"
                title="Send message"
                disabled={!input.trim()}
                whileHover={reduceMotion ? undefined : { scale: 1.06 }}
                whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                initial={reduceMotion ? false : { scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={reduceMotion ? undefined : { scale: 0.8, opacity: 0 }}
              >
                <ArrowUp className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </form>

        <p className="mt-2 pb-2 text-center text-[11px] text-ink-3">
          {config.icon.packName} · {config.icon.license} · free for commercial
          use
        </p>
      </div>

      <CaptchaModal
        open={captchaOpen}
        onCancel={handleCaptchaCancel}
        onSuccess={handleCaptchaSuccess}
      />
    </motion.aside>
  );
};
