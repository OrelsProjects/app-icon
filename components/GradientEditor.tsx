"use client";

import { Circle, Plus, Trash2 } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { EyedropperButton } from "@/components/ui/EyedropperButton";
import {
  buildGradientCss,
  defaultGradientStops,
  hexToHsva,
  hsvaToHex,
  parseGradient,
  type GradientStop,
  type GradientType,
} from "@/lib/gradient";

type GradientEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

const HUE_TRACK =
  "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)";

export const GradientEditor = ({ value, onChange }: GradientEditorProps) => {
  const parsed = useMemo(() => parseGradient(value), [value]);
  const [type, setType] = useState<GradientType>(parsed?.type ?? "linear");
  const [angle, setAngle] = useState(parsed?.angle ?? 135);
  const [stops, setStops] = useState<GradientStop[]>(
    parsed?.stops ?? defaultGradientStops(),
  );
  const [activeId, setActiveId] = useState(
    () => (parsed?.stops ?? defaultGradientStops())[0]?.id ?? "",
  );
  const [prevValue, setPrevValue] = useState(value);
  const [lastEmitted, setLastEmitted] = useState(value);
  const barRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef(type);
  const angleRef = useRef(angle);
  const stopsRef = useRef(stops);
  const dragFrame = useRef<number | null>(null);
  const dragId = useRef<string | null>(null);
  const dragAt = useRef<number | null>(null);

  if (value !== prevValue) {
    setPrevValue(value);
    if (value !== lastEmitted) {
      const next = parseGradient(value);
      if (next) {
        setLastEmitted(value);
        setType(next.type);
        setAngle(next.angle);
        setStops(next.stops);
        setActiveId((current) =>
          next.stops.some((stop) => stop.id === current)
            ? current
            : (next.stops[0]?.id ?? ""),
        );
      }
    }
  }

  useEffect(() => {
    typeRef.current = type;
    angleRef.current = angle;
    stopsRef.current = stops;
  }, [type, angle, stops]);

  useEffect(
    () => () => {
      if (dragFrame.current != null) cancelAnimationFrame(dragFrame.current);
    },
    [],
  );

  const active = stops.find((stop) => stop.id === activeId) ?? stops[0];
  const hsva = hexToHsva(active?.color ?? "#FF8A4C", active?.opacity ?? 100);
  const preview = buildGradientCss(type, angle, stops);

  const commit = (
    nextType = typeRef.current,
    nextAngle = angleRef.current,
    nextStops = stopsRef.current,
  ) => {
    const css = buildGradientCss(nextType, nextAngle, nextStops);
    setLastEmitted(css);
    typeRef.current = nextType;
    angleRef.current = nextAngle;
    stopsRef.current = nextStops;
    setType(nextType);
    setAngle(nextAngle);
    setStops(nextStops);
    onChange(css);
  };

  const updateActive = (patch: Partial<GradientStop>) => {
    const current = stopsRef.current.find((stop) => stop.id === activeId);
    if (!current) return;
    const nextStops = stopsRef.current.map((stop) =>
      stop.id === current.id ? { ...stop, ...patch } : stop,
    );
    commit(typeRef.current, angleRef.current, nextStops);
  };

  const handleAddStop = () => {
    if (stopsRef.current.length >= 5) return;
    const id = crypto.randomUUID();
    const source =
      stopsRef.current.find((stop) => stop.id === activeId) ??
      stopsRef.current[0];
    const nextStops = [
      ...stopsRef.current,
      {
        id,
        color: source?.color ?? "#FF8A4C",
        at: 50,
        opacity: 100,
      },
    ].sort((a, b) => a.at - b.at);
    setActiveId(id);
    commit(typeRef.current, angleRef.current, nextStops);
  };

  const handleDeleteStop = () => {
    if (stopsRef.current.length <= 2) return;
    const nextStops = stopsRef.current.filter((stop) => stop.id !== activeId);
    if (nextStops.length === stopsRef.current.length) return;
    setActiveId(nextStops[0]?.id ?? "");
    commit(typeRef.current, angleRef.current, nextStops);
  };

  const positionFromClientX = (clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return 0;
    return Math.max(
      0,
      Math.min(100, ((clientX - rect.left) / rect.width) * 100),
    );
  };

  const flushDragVisual = () => {
    dragFrame.current = null;
    if (dragId.current == null || dragAt.current == null) return;
    const id = dragId.current;
    const at = dragAt.current;
    const next = stopsRef.current.map((stop) =>
      stop.id === id ? { ...stop, at } : stop,
    );
    stopsRef.current = next;
    setStops(next);
    // Live preview on the bar without pushing undo history until pointerup
    if (barRef.current) {
      barRef.current.style.background = buildGradientCss(
        typeRef.current,
        angleRef.current,
        next,
      );
    }
  };

  const handleStopPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    id: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveId(id);
    dragId.current = id;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    const onMove = (moveEvent: PointerEvent) => {
      dragAt.current = positionFromClientX(moveEvent.clientX);
      // Direct DOM for the thumb — avoids waiting on React for position
      target.style.left = `${dragAt.current}%`;
      if (dragFrame.current == null) {
        dragFrame.current = requestAnimationFrame(flushDragVisual);
      }
    };

    const onUp = () => {
      if (dragFrame.current != null) {
        cancelAnimationFrame(dragFrame.current);
        flushDragVisual();
      }
      commit(typeRef.current, angleRef.current, stopsRef.current);
      dragId.current = null;
      dragAt.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-line bg-bg/70 p-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-0.5 rounded-[10px] border border-line bg-panel p-0.5">
          <button
            type="button"
            aria-label="Linear gradient"
            title="Linear gradient"
            aria-pressed={type === "linear"}
            className={`focus-ring flex h-7 flex-1 items-center justify-center rounded-[8px] transition ${
              type === "linear"
                ? "bg-ink text-white"
                : "text-ink-2 hover:text-ink"
            }`}
            onClick={() => commit("linear", angle, stops)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden
            >
              <path
                d="M3 11L11 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M9.5 3H11V4.5M4.5 11H3V9.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Radial gradient"
            title="Radial gradient"
            aria-pressed={type === "radial"}
            className={`focus-ring flex h-7 flex-1 items-center justify-center rounded-[8px] transition ${
              type === "radial"
                ? "bg-ink text-white"
                : "text-ink-2 hover:text-ink"
            }`}
            onClick={() => commit("radial", angle, stops)}
          >
            <Circle className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>

        {type === "linear" ? (
          <label className="flex h-8 items-center gap-1.5 rounded-[10px] border border-line bg-panel px-2 text-[12px] text-ink-2">
            <span aria-hidden>∠</span>
            <input
              type="number"
              min={0}
              max={360}
              value={Math.round(angle)}
              aria-label="Gradient angle"
              className="tabular w-9 bg-transparent text-ink outline-none"
              onChange={(event) => {
                const next = Number(event.target.value);
                if (!Number.isFinite(next)) return;
                commit(type, Math.max(0, Math.min(360, next)), stops);
              }}
            />
          </label>
        ) : (
          <div className="h-8 min-w-14 rounded-[10px] border border-transparent" />
        )}

        <EyedropperButton
          label="Pick stop color from screen"
          onPick={(hex) => updateActive({ color: hex })}
        />

        <button
          type="button"
          aria-label="Add stop"
          title="Add color stop"
          className="focus-ring flex h-8 w-8 items-center justify-center rounded-full border border-line bg-panel text-ink-2 hover:text-ink disabled:opacity-35"
          disabled={stops.length >= 5}
          onClick={handleAddStop}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Delete stop"
          title="Delete color stop"
          className="focus-ring flex h-8 w-8 items-center justify-center rounded-full border border-line bg-panel text-ink-2 hover:text-ink disabled:opacity-35"
          disabled={stops.length <= 2}
          onClick={handleDeleteStop}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        ref={barRef}
        className="relative h-3 touch-none cursor-pointer rounded-full border border-line"
        style={{ background: preview }}
        onClick={(event) => {
          if (stopsRef.current.length >= 5) return;
          const at = positionFromClientX(event.clientX);
          const id = crypto.randomUUID();
          const source =
            stopsRef.current.find((stop) => stop.id === activeId) ??
            stopsRef.current[0];
          const nextStops = [
            ...stopsRef.current,
            {
              id,
              color: source?.color ?? "#FF8A4C",
              at,
              opacity: source?.opacity ?? 100,
            },
          ].sort((a, b) => a.at - b.at);
          setActiveId(id);
          commit(typeRef.current, angleRef.current, nextStops);
        }}
      >
        {stops.map((stop) => {
          const selected = stop.id === active?.id;
          return (
            <button
              key={stop.id}
              type="button"
              aria-label={`Gradient stop at ${Math.round(stop.at)}%`}
              title={`Stop · ${Math.round(stop.at)}% · ${stop.color}`}
              aria-pressed={selected}
              className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border border-white shadow-[0_0_0_1px_rgba(24,24,27,0.35)] ${
                selected
                  ? "ring-2 ring-accent/70 ring-offset-1 ring-offset-bg"
                  : ""
              }`}
              style={{
                left: `${stop.at}%`,
                background: stop.color,
              }}
              onPointerDown={(event) => handleStopPointerDown(event, stop.id)}
              onClick={(event) => {
                event.stopPropagation();
                setActiveId(stop.id);
              }}
            />
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <label className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-line">
          <span
            className="absolute inset-0"
            style={{ background: active?.color ?? "#FF8A4C" }}
            aria-hidden
          />
          <input
            type="color"
            aria-label="Stop color"
            className="absolute inset-0 cursor-pointer opacity-0"
            value={active?.color ?? "#FF8A4C"}
            onChange={(event) =>
              updateActive({ color: event.target.value.toUpperCase() })
            }
          />
        </label>
        <input
          type="text"
          aria-label="Stop hex color"
          value={active?.color ?? "#FF8A4C"}
          className="focus-ring h-8 min-w-0 flex-1 rounded-[10px] border border-line bg-panel px-2.5 text-[12px] tabular text-ink"
          onChange={(event) => {
            const next = event.target.value.toUpperCase();
            if (/^#[0-9A-F]{6}$/.test(next)) updateActive({ color: next });
          }}
        />
        <EyedropperButton
          label="Pick stop color"
          onPick={(hex) => updateActive({ color: hex })}
        />
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
          Hue
        </span>
        <input
          type="range"
          min={0}
          max={360}
          value={Math.round(hsva.h)}
          aria-label="Hue"
          className="forge-slider focus-ring"
          style={{ background: HUE_TRACK }}
          onChange={(event) => {
            const h = Number(event.target.value);
            updateActive({ color: hsvaToHex(h, hsva.s || 70, hsva.v || 90) });
          }}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
            Opacity
          </span>
          <span className="tabular text-[12px] text-ink-2">
            {Math.round(active?.opacity ?? 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={active?.opacity ?? 100}
          aria-label="Opacity"
          className="forge-slider focus-ring"
          style={{
            background: `linear-gradient(to right, transparent, ${active?.color ?? "#FF8A4C"}),
              repeating-conic-gradient(#e5e5e5 0% 25%, #fff 0% 50%) 50% / 10px 10px`,
          }}
          onChange={(event) =>
            updateActive({ opacity: Number(event.target.value) })
          }
        />
      </label>

      <p className="text-[11px] text-ink-3">
        Drag stops · click bar to add · max 5
      </p>
    </div>
  );
};
