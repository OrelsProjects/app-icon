"use client";

import posthog from "posthog-js";

type AnalyticsProps = Record<
  string,
  string | number | boolean | null | undefined | string[]
>;

const hasPostHogKey = () =>
  Boolean(
    process.env.NEXT_PUBLIC_POSTHOG_KEY ??
      process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
  );

export const track = (event: string, properties?: AnalyticsProps) => {
  if (typeof window === "undefined" || !hasPostHogKey()) return;
  posthog.capture(event, properties);
};

export const analytics = {
  iconPickerOpened: () => track("icon_picker_opened"),
  iconPickerClosed: () => track("icon_picker_closed"),
  iconSearched: (props: {
    query: string;
    prefix: string | null;
    result_count: number;
  }) => track("icon_searched", props),
  iconSelected: (props: {
    prefix: string;
    name: string;
    pack_name: string;
    source: "picker" | "ai" | "random" | "reset";
  }) => track("icon_selected", props),
  packFilterChanged: (props: { prefix: string | null }) =>
    track("pack_filter_changed", props),
  packsBrowserOpened: () => track("packs_browser_opened"),

  logoExported: (props: { format: "svg" | "png" }) =>
    track("logo_exported", props),
  logoExportFailed: (props: { format: "svg" | "png"; error: string }) =>
    track("logo_export_failed", props),

  presetApplied: (props: { preset_id: string; preset_name: string }) =>
    track("preset_applied", props),
  logoRandomized: (props: {
    preset_id: string;
    icon_prefix: string;
    icon_name: string;
  }) => track("logo_randomized", props),
  logoUpdated: (props: { fields: string[] }) => track("logo_updated", props),
  logoUndone: () => track("logo_undone"),
  logoRedone: () => track("logo_redone"),
  logoVersionRestored: (props: {
    version_id: string;
    source: "history" | "ai";
  }) => track("logo_version_restored", props),
  logoReset: () => track("logo_reset"),

  backgroundModeChanged: (props: { mode: "solid" | "gradient" }) =>
    track("background_mode_changed", props),

  canvasZoomChanged: (props: { zoom: number }) =>
    track("canvas_zoom_changed", props),
  canvasPreviewToggled: (props: { dark: boolean }) =>
    track("canvas_preview_toggled", props),
  mobileTabChanged: (props: { tab: "style" | "ai" }) =>
    track("mobile_tab_changed", props),

  aiMessageSent: (props: {
    char_count: number;
    via_suggestion: boolean;
    suggestion?: string;
  }) => track("ai_message_sent", props),
  aiResponseReceived: (props: {
    action_types: string[];
    action_count: number;
    has_applied: boolean;
  }) => track("ai_response_received", props),
  aiError: (props: { error: string }) => track("ai_error", props),
  aiStopped: () => track("ai_stopped"),
  aiChatReset: () => track("ai_chat_reset"),
  aiSuggestionClicked: (props: { suggestion: string }) =>
    track("ai_suggestion_clicked", props),

  aiActionsApplied: (props: {
    action_types: string[];
    action_count: number;
    restored: boolean;
    svg_edited: boolean;
  }) => track("ai_actions_applied", props),
};
