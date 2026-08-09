"use client";

import { useEffect, useState } from "react";
import { applyStrokeWidth, fetchIcon } from "@/lib/iconify";

type IconSvgProps = {
  prefix: string;
  name: string;
  /** When set, skip Iconify fetch and render this prepared SVG. */
  svg?: string | null;
  color?: string;
  strokeWidth?: number;
  className?: string;
  title?: string;
};

export const IconSvg = ({
  prefix,
  name,
  svg: svgProp,
  color,
  strokeWidth,
  className = "",
  title,
}: IconSvgProps) => {
  const [svg, setSvg] = useState<string | null>(svgProp ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (svgProp) {
      setFailed(false);
      setSvg(svgProp);
      return;
    }

    let cancelled = false;
    setFailed(false);
    setSvg(null);

    void fetchIcon(prefix, name)
      .then((prepared) => {
        if (!cancelled) setSvg(prepared);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [prefix, name, svgProp]);

  if (failed) {
    return (
      <span
        className={`inline-block ${className}`}
        style={{ color }}
        title={title ?? `${prefix}:${name}`}
        aria-hidden
      />
    );
  }

  if (!svg) {
    return (
      <span
        className={`inline-block animate-pulse rounded bg-black/5 ${className}`}
        aria-hidden
      />
    );
  }

  const markup =
    strokeWidth != null ? applyStrokeWidth(svg, strokeWidth) : svg;

  return (
    <span
      className={`inline-flex items-center justify-center [&>svg]:h-full [&>svg]:w-full ${className}`}
      style={{ color }}
      title={title}
      role="img"
      aria-label={title ?? `${prefix}:${name}`}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
};
