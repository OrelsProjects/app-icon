import posthog from "posthog-js";

const token =
  process.env.NEXT_PUBLIC_POSTHOG_KEY ??
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

if (token) {
  posthog.init(token, {
    api_host: "/ingest",
    ui_host: host.includes("eu.")
      ? "https://eu.posthog.com"
      : "https://us.posthog.com",
    defaults: "2026-05-30",
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    persistence: "localStorage+cookie",
    person_profiles: "identified_only",
    // Link client sessions to /api/* so server events join the same person/replay.
    tracing_headers: [
      "localhost",
      "www.app-logo.com",
      "app-logo.com",
      "app-icon-rose.vercel.app",
      "app-icon-orelsportfolio.vercel.app",
    ],
    session_recording: {
      maskAllInputs: false,
      maskInputOptions: {
        password: true,
      },
      recordCrossOriginIframes: false,
    },
    loaded: (client) => {
      if (process.env.NODE_ENV === "development") {
        client.debug(false);
      }
      // Ensure replay starts even if project defaults are conservative.
      if (typeof client.startSessionRecording === "function") {
        client.startSessionRecording();
      }
    },
  });
}
