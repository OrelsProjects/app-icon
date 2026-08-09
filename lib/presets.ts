import type { LogoConfig, Preset } from "./types";

export const DEFAULT_ICON = {
  prefix: "lucide",
  name: "sparkles",
  packName: "Lucide",
  license: "ISC",
  licenseUrl: "https://lucide.dev/license",
  palette: false,
} as const;

export const DEFAULT_SHADOW = {
  shadow: true,
  shadowColor: "#FF5A00",
  shadowOpacity: 40,
  shadowBlur: 50,
  shadowOffsetX: 0,
  shadowOffsetY: 18,
  shadowSpread: -20,
} as const;

export const DEFAULT_CONFIG: LogoConfig = {
  icon: { ...DEFAULT_ICON },
  customSvg: null,
  size: 58,
  rotate: 0,
  strokeWidth: 2,
  weight: null,
  iconColor: "#FF5A00",
  background: "#F5F0E8",
  rounded: 30,
  padding: 26,
  ...DEFAULT_SHADOW,
};

export const PRESETS: Preset[] = [
  {
    id: "cream",
    name: "Cream",
    swatch: "#F5F0E8",
    background: "#F5F0E8",
    iconColor: "#FF5A00",
    rounded: 30,
    padding: 26,
    ...DEFAULT_SHADOW,
  },
  {
    id: "ink",
    name: "Ink",
    swatch: "#18181B",
    background: "#18181B",
    iconColor: "#FFFFFF",
    rounded: 28,
    padding: 28,
    shadow: true,
    shadowColor: "#000000",
    shadowOpacity: 55,
    shadowBlur: 48,
    shadowOffsetX: 0,
    shadowOffsetY: 16,
    shadowSpread: -18,
  },
  {
    id: "warm-gradient",
    name: "Warm",
    swatch: "linear-gradient(135deg, #FFE0C2 0%, #FF8A4C 100%)",
    background: "linear-gradient(135deg, #FFE0C2 0%, #FF8A4C 100%)",
    iconColor: "#18181B",
    rounded: 34,
    padding: 24,
    shadow: true,
    shadowColor: "#FF8A4C",
    shadowOpacity: 42,
    shadowBlur: 56,
    shadowOffsetX: 0,
    shadowOffsetY: 20,
    shadowSpread: -18,
  },
  {
    id: "ocean-gradient",
    name: "Ocean",
    swatch: "linear-gradient(145deg, #67E8F9 0%, #2563EB 100%)",
    background: "linear-gradient(145deg, #67E8F9 0%, #2563EB 100%)",
    iconColor: "#FFFFFF",
    rounded: 32,
    padding: 26,
    shadow: true,
    shadowColor: "#2563EB",
    shadowOpacity: 40,
    shadowBlur: 50,
    shadowOffsetX: 0,
    shadowOffsetY: 18,
    shadowSpread: -16,
  },
  {
    id: "midnight-gradient",
    name: "Midnight",
    swatch: "linear-gradient(150deg, #312E81 0%, #0F172A 100%)",
    background: "linear-gradient(150deg, #312E81 0%, #0F172A 100%)",
    iconColor: "#E0E7FF",
    rounded: 30,
    padding: 26,
    shadow: true,
    shadowColor: "#312E81",
    shadowOpacity: 50,
    shadowBlur: 54,
    shadowOffsetX: 0,
    shadowOffsetY: 18,
    shadowSpread: -18,
  },
  {
    id: "mint-gradient",
    name: "Mint",
    swatch: "linear-gradient(135deg, #BBF7D0 0%, #34D399 100%)",
    background: "linear-gradient(135deg, #BBF7D0 0%, #34D399 100%)",
    iconColor: "#064E3B",
    rounded: 30,
    padding: 26,
    shadow: true,
    shadowColor: "#059669",
    shadowOpacity: 32,
    shadowBlur: 46,
    shadowOffsetX: 0,
    shadowOffsetY: 16,
    shadowSpread: -18,
  },
  {
    id: "candy-gradient",
    name: "Candy",
    swatch: "linear-gradient(135deg, #F9A8D4 0%, #C084FC 100%)",
    background: "linear-gradient(135deg, #F9A8D4 0%, #C084FC 100%)",
    iconColor: "#FFFFFF",
    rounded: 36,
    padding: 24,
    shadow: true,
    shadowColor: "#C084FC",
    shadowOpacity: 40,
    shadowBlur: 52,
    shadowOffsetX: 0,
    shadowOffsetY: 18,
    shadowSpread: -16,
  },
  {
    id: "accent",
    name: "Accent",
    swatch: "#FF5A00",
    background: "#FF5A00",
    iconColor: "#FFFFFF",
    rounded: 32,
    padding: 24,
    shadow: true,
    shadowColor: "#FF5A00",
    shadowOpacity: 45,
    shadowBlur: 52,
    shadowOffsetX: 0,
    shadowOffsetY: 18,
    shadowSpread: -16,
  },
];

export const ICON_COLORS = [
  "#FF5A00",
  "#18181B",
  "#FFFFFF",
  "#2563EB",
  "#16A34A",
  "#DC2626",
  "#7C3AED",
  "#0F766E",
];

export const BACKGROUND_COLORS = [
  "#F5F0E8",
  "#FFFFFF",
  "#18181B",
  "#FFF1E9",
  "#EEF2FF",
  "#ECFDF5",
  "#FEF3C7",
  "#FFE4E6",
];

export const BACKGROUND_GRADIENTS = [
  {
    id: "warm",
    name: "Warm",
    value: "linear-gradient(135deg, #FFE0C2 0%, #FF8A4C 100%)",
  },
  {
    id: "sunset",
    name: "Sunset",
    value: "linear-gradient(135deg, #FF9A8B 0%, #FF6A88 55%, #FF99AC 100%)",
  },
  {
    id: "ember",
    name: "Ember",
    value: "linear-gradient(160deg, #FF5A00 0%, #FFB347 100%)",
  },
  {
    id: "peach",
    name: "Peach",
    value: "linear-gradient(120deg, #FFF1E9 0%, #FFD0B5 100%)",
  },
  {
    id: "violet",
    name: "Violet",
    value: "linear-gradient(135deg, #DDD6FE 0%, #818CF8 100%)",
  },
  {
    id: "ocean",
    name: "Ocean",
    value: "linear-gradient(145deg, #67E8F9 0%, #2563EB 100%)",
  },
  {
    id: "mint",
    name: "Mint",
    value: "linear-gradient(135deg, #BBF7D0 0%, #34D399 100%)",
  },
  {
    id: "forest",
    name: "Forest",
    value: "linear-gradient(160deg, #86EFAC 0%, #166534 100%)",
  },
  {
    id: "midnight",
    name: "Midnight",
    value: "linear-gradient(150deg, #312E81 0%, #0F172A 100%)",
  },
  {
    id: "graphite",
    name: "Graphite",
    value: "linear-gradient(135deg, #52525B 0%, #18181B 100%)",
  },
  {
    id: "aurora",
    name: "Aurora",
    value: "linear-gradient(125deg, #A78BFA 0%, #34D399 50%, #38BDF8 100%)",
  },
  {
    id: "candy",
    name: "Candy",
    value: "linear-gradient(135deg, #F9A8D4 0%, #C084FC 100%)",
  },
] as const;

export const SHADOW_COLORS = [
  "#FF5A00",
  "#18181B",
  "#000000",
  "#2563EB",
  "#16A34A",
  "#DC2626",
  "#7C3AED",
  "#0F766E",
];

export const FEATURED_PACKS = [
  { prefix: "lucide", name: "Lucide", badge: "LUC" },
  { prefix: "hugeicons", name: "Hugeicons", badge: "HUG" },
  { prefix: "tabler", name: "Tabler", badge: "TAB" },
  { prefix: "ph", name: "Phosphor", badge: "PH" },
  { prefix: "heroicons", name: "Heroicons", badge: "HER" },
  { prefix: "solar", name: "Solar", badge: "SOL" },
  { prefix: "material-symbols", name: "Material", badge: "MAT" },
] as const;

/** Top packs the AI assistant may search / apply icons from. */
export const AI_ICON_PACKS = [
  { prefix: "lucide", name: "Lucide" },
  { prefix: "ph", name: "Phosphor" },
  { prefix: "tabler", name: "Tabler" },
  { prefix: "mdi", name: "Material Design Icons" },
  { prefix: "material-symbols", name: "Material Symbols" },
  { prefix: "heroicons", name: "Heroicons" },
  { prefix: "hugeicons", name: "Hugeicons" },
  { prefix: "solar", name: "Solar" },
  { prefix: "bi", name: "Bootstrap Icons" },
  { prefix: "ri", name: "Remix Icon" },
] as const;

export const AI_ICON_PREFIXES = AI_ICON_PACKS.map((pack) => pack.prefix);

export const isAiAllowedPrefix = (prefix: string) =>
  AI_ICON_PREFIXES.some(
    (allowed) => prefix === allowed || prefix.startsWith(`${allowed}-`),
  );

export const PACK_BADGES: Record<string, string> = {
  lucide: "LUC",
  hugeicons: "HUG",
  tabler: "TAB",
  ph: "PH",
  "ph-bold": "PH",
  "ph-light": "PH",
  "ph-thin": "PH",
  "ph-fill": "PH",
  heroicons: "HER",
  "heroicons-outline": "HER",
  "heroicons-solid": "HER",
  solar: "SOL",
  "material-symbols": "MAT",
  mdi: "MDI",
  bi: "BI",
  carbon: "CAR",
  "fluent-emoji": "FLU",
  "flat-color-icons": "FCI",
  logos: "LOG",
  fa: "FA",
  "fa6-solid": "FA",
  "fa6-regular": "FA",
  "fa6-brands": "FA",
};

export const WEIGHT_OPTIONS: Record<
  string,
  { label: string; prefix: string }[]
> = {
  ph: [
    { label: "Thin", prefix: "ph-thin" },
    { label: "Light", prefix: "ph-light" },
    { label: "Regular", prefix: "ph" },
    { label: "Bold", prefix: "ph-bold" },
    { label: "Fill", prefix: "ph-fill" },
  ],
};

export const getPackBadge = (prefix: string) =>
  PACK_BADGES[prefix] ?? prefix.slice(0, 3).toUpperCase();

export const applyPresetToConfig = (
  config: LogoConfig,
  preset: Preset,
): LogoConfig => ({
  ...config,
  background: preset.background,
  iconColor: preset.iconColor,
  rounded: preset.rounded,
  padding: preset.padding,
  shadow: preset.shadow,
  shadowColor: preset.shadowColor ?? config.shadowColor,
  shadowOpacity: preset.shadowOpacity ?? config.shadowOpacity,
  shadowBlur: preset.shadowBlur ?? config.shadowBlur,
  shadowOffsetX: preset.shadowOffsetX ?? config.shadowOffsetX,
  shadowOffsetY: preset.shadowOffsetY ?? config.shadowOffsetY,
  shadowSpread: preset.shadowSpread ?? config.shadowSpread,
});

export const findActivePresetId = (config: LogoConfig): string | null => {
  const match = PRESETS.find(
    (preset) =>
      preset.background === config.background &&
      preset.iconColor === config.iconColor &&
      preset.rounded === config.rounded &&
      preset.padding === config.padding &&
      preset.shadow === config.shadow &&
      (preset.shadowColor ?? DEFAULT_SHADOW.shadowColor) ===
        config.shadowColor &&
      (preset.shadowOpacity ?? DEFAULT_SHADOW.shadowOpacity) ===
        config.shadowOpacity,
  );
  return match?.id ?? null;
};
