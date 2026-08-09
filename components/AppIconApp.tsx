"use client";

import { useEffect, useState } from "react";
import { AiAssistant } from "@/components/AiAssistant";
import { Canvas } from "@/components/Canvas";
import { Header } from "@/components/Header";
import { IconPickerModal } from "@/components/IconPickerModal";
import { LeftRail } from "@/components/LeftRail";
import { analytics } from "@/lib/analytics";
import { fetchIcon } from "@/lib/iconify";
import { springSnappy } from "@/lib/motion";
import { useLogoStore } from "@/lib/use-logo-store";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback } from "react";

export const AppIconApp = () => {
  const store = useLogoStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [darkPreview, setDarkPreview] = useState(false);
  const [mobileTab, setMobileTab] = useState<"style" | "ai">("style");
  const reduceMotion = useReducedMotion();

  const handleCaptureFocus = useCallback(() => {
    setMobileTab("ai");
  }, []);

  useEffect(() => {
    void fetchIcon(store.config.icon.prefix, store.config.icon.name);
  }, [store.config.icon.prefix, store.config.icon.name]);

  return (
    <motion.div
      className="flex h-dvh flex-col overflow-hidden bg-bg text-ink"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28 }}
    >
      <Header
        config={store.config}
        activePresetId={store.activePresetId}
        canUndo={store.canUndo}
        versions={store.history}
        versionIndex={store.historyIndex}
        onApplyPreset={store.applyPreset}
        onUndo={store.undo}
        onRestoreVersion={store.restoreVersion}
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <motion.div
          className={`order-2 min-h-0 w-full lg:order-1 lg:flex lg:w-auto ${
            mobileTab === "style" ? "flex" : "hidden lg:flex"
          }`}
          initial={reduceMotion ? false : { opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={
            reduceMotion ? { duration: 0 } : { ...springSnappy, delay: 0.05 }
          }
        >
          <LeftRail
            config={store.config}
            onOpenPicker={() => setPickerOpen(true)}
            onUpdate={store.update}
            onSetIcon={store.setIcon}
          />
        </motion.div>

        <div className="relative order-1 flex min-h-0 min-w-0 flex-1 flex-col lg:order-2">
          <Canvas
            config={store.config}
            zoom={zoom}
            darkPreview={darkPreview}
            onZoomChange={(next) => {
              setZoom(next);
              analytics.canvasZoomChanged({ zoom: next });
            }}
            onToggleDark={() => {
              setDarkPreview((value) => {
                const next = !value;
                analytics.canvasPreviewToggled({ dark: next });
                return next;
              });
            }}
            onRandomize={store.randomize}
          />

          <div className="relative flex border-t border-line bg-panel lg:hidden">
            <button
              type="button"
              className={`focus-ring relative z-10 flex-1 py-3 text-[13px] font-semibold ${
                mobileTab === "style" ? "text-ink" : "text-ink-2"
              }`}
              onClick={() => {
                setMobileTab("style");
                analytics.mobileTabChanged({ tab: "style" });
              }}
            >
              Style
            </button>
            <button
              type="button"
              className={`focus-ring relative z-10 flex-1 py-3 text-[13px] font-semibold ${
                mobileTab === "ai" ? "text-ink" : "text-ink-2"
              }`}
              onClick={() => {
                setMobileTab("ai");
                analytics.mobileTabChanged({ tab: "ai" });
              }}
            >
              AI
            </button>
            <motion.div
              className="absolute bottom-0 h-0.5 w-1/2"
              style={{
                background:
                  mobileTab === "ai" ? "var(--ai)" : "var(--accent)",
              }}
              animate={{ x: mobileTab === "ai" ? "100%" : "0%" }}
              transition={reduceMotion ? { duration: 0 } : springSnappy}
            />
          </div>
        </div>

        <motion.div
          className={`order-3 min-h-0 w-full lg:flex lg:w-auto ${
            mobileTab === "ai" ? "flex" : "hidden lg:flex"
          }`}
          initial={reduceMotion ? false : { opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={
            reduceMotion ? { duration: 0 } : { ...springSnappy, delay: 0.08 }
          }
        >
          <AiAssistant
            config={store.config}
            historySummary={store.historySummary}
            onApplyActions={store.applyAiActions}
            captureTyping={!pickerOpen}
            onCaptureFocus={handleCaptureFocus}
          />
        </motion.div>
      </div>

      <IconPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={store.setIcon}
      />
    </motion.div>
  );
};
