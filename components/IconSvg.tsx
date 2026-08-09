"use client";

import { useEffect, useState } from "react";
import { applyStrokeWidth, fetchIcon } from "@/lib/iconify";
import { safeSvgOrNull } from "@/lib/svg-sanitize";

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

type FetchState = {
  key: string;
  svg: string | null;
  failed: boolean;
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
  const iconKey = `${prefix}:${name}`;
  const [fetched, setFetched] = useState<FetchState>({
    key: iconKey,
    svg: null,
    failed: false,
  });

  useEffect(() => {
    if (svgProp) return;

    let cancelled = false;
    const key = `${prefix}:${name}`;

    void fetchIcon(prefix, name)
      .then((prepared) => {
        if (cancelled) return;
        setFetched({ key, svg: prepared, failed: false });
      })
      .catch(() => {
        if (cancelled) return;
        setFetched({ key, svg: null, failed: true });
      });

    return () => {
      cancelled = true;
    };
  }, [prefix, name, svgProp]);

  const customSvg = svgProp ? safeSvgOrNull(svgProp) : null;
  const svg = customSvg ?? (fetched.key === iconKey ? fetched.svg : null);
  const failed =
    Boolean(svgProp && !customSvg) ||
    (!svgProp && fetched.key === iconKey && fetched.failed);

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
