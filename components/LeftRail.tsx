"use client";

import { BackgroundPicker } from "@/components/BackgroundPicker";
import { IconSlot } from "@/components/IconSlot";
import { ColorSwatches } from "@/components/ui/ColorSwatches";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Slider } from "@/components/ui/Slider";
import { ICON_COLORS, SHADOW_COLORS, WEIGHT_OPTIONS } from "@/lib/presets";
import type { LogoConfig, LogoIcon } from "@/lib/types";

type LeftRailProps = {
  config: LogoConfig;
  onOpenPicker: () => void;
  onUpdate: (patch: Partial<LogoConfig>) => void;
  onSetIcon: (icon: LogoIcon) => void;
};

export const LeftRail = ({
  config,
  onOpenPicker,
  onUpdate,
  onSetIcon,
}: LeftRailProps) => {
  const phosphorFamily = config.icon.prefix.startsWith("ph");
  const weights = phosphorFamily ? WEIGHT_OPTIONS.ph : null;
  const shadowDisabled = !config.shadow;

  return (
    <aside className="flex h-full w-full flex-col gap-5 overflow-y-auto overflow-x-hidden border-r border-line bg-panel px-5 pt-4 pb-12 md:w-[328px] md:shrink-0">
      <IconSlot
        icon={config.icon}
        customSvg={config.customSvg}
        onClick={onOpenPicker}
      />

      <CollapsibleSection title="Icon settings">
        <Slider
          label="Size"
          value={config.size}
          min={20}
          max={100}
          format={(v) => `${Math.round(v)}%`}
          onChange={(size) => onUpdate({ size })}
        />
        <Slider
          label="Rotate"
          value={config.rotate}
          min={-180}
          max={180}
          format={(v) => `${Math.round(v)}°`}
          onChange={(rotate) => onUpdate({ rotate })}
        />
        {weights ? (
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-ink">Weight</span>
            <div className="flex flex-wrap items-center gap-1.5 px-1 py-1">
              {weights.map((weight) => {
                const selected = config.icon.prefix === weight.prefix;
                return (
                  <button
                    key={weight.prefix}
                    type="button"
                    tabIndex={0}
                    aria-pressed={selected}
                    className={`focus-ring rounded-full px-2.5 py-1 text-[12px] font-semibold transition ${
                      selected
                        ? "bg-ink text-white"
                        : "border border-line bg-bg text-ink-2 hover:border-ink/30"
                    }`}
                    onClick={() =>
                      onSetIcon({
                        ...config.icon,
                        prefix: weight.prefix,
                      })
                    }
                  >
                    {weight.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <Slider
            label="Stroke width"
            value={config.strokeWidth}
            min={0.5}
            max={3.5}
            step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(strokeWidth) => onUpdate({ strokeWidth })}
          />
        )}
        <ColorSwatches
          label="Icon color"
          colors={ICON_COLORS}
          value={config.iconColor}
          disabled={config.icon.palette}
          onChange={(iconColor) => onUpdate({ iconColor })}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Background" className="border-t border-line pt-5">
        <BackgroundPicker
          value={config.background}
          onChange={(background) => onUpdate({ background })}
        />
        <Slider
          label="Rounded"
          value={config.rounded}
          min={0}
          max={50}
          format={(v) => `${Math.round(v)}%`}
          onChange={(rounded) => onUpdate({ rounded })}
        />
        <Slider
          label="Padding"
          value={config.padding}
          min={8}
          max={42}
          format={(v) => `${Math.round(v)}%`}
          onChange={(padding) => onUpdate({ padding })}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Shadow" className="border-t border-line pt-5">
        <ColorSwatches
          label="Shadow color"
          colors={SHADOW_COLORS}
          value={config.shadowColor}
          noneSelected={!config.shadow}
          showNone
          onChange={(shadowColor) =>
            onUpdate({ shadow: true, shadowColor })
          }
          onNone={() => onUpdate({ shadow: false })}
        />
        <Slider
          label="Opacity"
          value={config.shadowOpacity}
          min={0}
          max={100}
          disabled={shadowDisabled}
          format={(v) => `${Math.round(v)}%`}
          onChange={(shadowOpacity) => onUpdate({ shadowOpacity })}
        />
        <Slider
          label="Blur"
          value={config.shadowBlur}
          min={0}
          max={80}
          disabled={shadowDisabled}
          format={(v) => `${Math.round(v)}`}
          onChange={(shadowBlur) => onUpdate({ shadowBlur })}
        />
        <Slider
          label="Offset X"
          value={config.shadowOffsetX}
          min={-40}
          max={40}
          disabled={shadowDisabled}
          format={(v) => `${Math.round(v)}`}
          onChange={(shadowOffsetX) => onUpdate({ shadowOffsetX })}
        />
        <Slider
          label="Offset Y"
          value={config.shadowOffsetY}
          min={-40}
          max={60}
          disabled={shadowDisabled}
          format={(v) => `${Math.round(v)}`}
          onChange={(shadowOffsetY) => onUpdate({ shadowOffsetY })}
        />
        <Slider
          label="Spread"
          value={config.shadowSpread}
          min={-40}
          max={40}
          disabled={shadowDisabled}
          format={(v) => `${Math.round(v)}`}
          onChange={(shadowSpread) => onUpdate({ shadowSpread })}
        />
      </CollapsibleSection>
    </aside>
  );
};
