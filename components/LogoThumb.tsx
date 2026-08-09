"use client";

import { IconSvg } from "@/components/IconSvg";
import type { LogoConfig } from "@/lib/types";

type LogoThumbProps = {
  config: LogoConfig;
  size?: number;
  className?: string;
};

export const LogoThumb = ({
  config,
  size = 36,
  className = "",
}: LogoThumbProps) => {
  const radius = (config.rounded / 100) * (size / 2);
  const pad = (config.padding / 100) * size * 0.35;
  const iconSize = Math.max(
    10,
    (config.size / 100) * (size - pad * 2),
  );

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-line ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: config.background,
      }}
      aria-hidden
    >
      <span
        className="inline-flex items-center justify-center"
        style={{
          width: iconSize,
          height: iconSize,
          transform: `rotate(${config.rotate}deg)`,
        }}
      >
        <IconSvg
          prefix={config.icon.prefix}
          name={config.icon.name}
          svg={config.customSvg}
          color={config.icon.palette ? undefined : config.iconColor}
          strokeWidth={config.icon.palette ? undefined : config.strokeWidth}
          className="h-full w-full"
        />
      </span>
    </span>
  );
};
