import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.name} — ${siteConfig.tagline}. Design and download free app icons with AI.`;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export const createOgImage = async () => {
  const logoData = await readFile(join(process.cwd(), "public/logo.png"));
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background:
            "linear-gradient(135deg, #0f0f12 0%, #1a1a1f 48%, #141418 100%)",
          color: "#f6f6f5",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -120,
            left: -80,
            width: 520,
            height: 520,
            borderRadius: 999,
            background:
              "radial-gradient(circle, rgba(255,90,0,0.32) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -60,
            bottom: -100,
            width: 480,
            height: 480,
            borderRadius: 999,
            background:
              "radial-gradient(circle, rgba(109,94,246,0.26) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            width: "100%",
            height: "100%",
            padding: "64px 72px",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxWidth: 640,
              gap: 28,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#ff8a4c",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: "#ff5a00",
                  display: "flex",
                }}
              />
              <span>Free · AI · SVG + PNG</span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 92,
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                  lineHeight: 0.95,
                  color: "#fafafa",
                }}
              >
                {siteConfig.name}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 34,
                  fontWeight: 500,
                  lineHeight: 1.3,
                  color: "rgba(246,246,245,0.78)",
                  maxWidth: 560,
                }}
              >
                {siteConfig.tagline}. Style any icon, use AI to help and export in
                seconds.
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 18px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  fontSize: 20,
                  fontWeight: 600,
                  color: "rgba(246,246,245,0.9)",
                }}
              >
                100s of packs
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 18px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  fontSize: 20,
                  fontWeight: 600,
                  color: "rgba(246,246,245,0.9)",
                }}
              >
                AI assistant
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 18px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  fontSize: 20,
                  fontWeight: 600,
                  color: "rgba(246,246,245,0.9)",
                }}
              >
                Instant export
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 360,
              height: 360,
              borderRadius: 88,
              background:
                "linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow:
                "0 40px 80px -24px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          >
            {/* ImageResponse/Satori requires a raw img, not next/image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc}
              width={280}
              height={280}
              alt=""
              style={{
                borderRadius: 64,
                boxShadow: "0 24px 48px -16px rgba(0,0,0,0.55)",
              }}
            />

          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
};
