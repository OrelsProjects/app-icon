import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "App-Icon — Free app icon maker",
  description:
    "Pick an icon from any free pack, style it, and download SVG + PNG — or tell the AI what you want.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
