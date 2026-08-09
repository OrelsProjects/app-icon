export type LogoIcon = {
  prefix: string;
  name: string;
  packName: string;
  license: string;
  licenseUrl?: string;
  palette: boolean;
};

export type LogoConfig = {
  icon: LogoIcon;
  /** AI-edited (or custom) SVG override; null = use Iconify icon as-is. */
  customSvg: string | null;
  size: number;
  rotate: number;
  strokeWidth: number;
  weight: string | null;
  iconColor: string;
  background: string;
  rounded: number;
  padding: number;
  shadow: boolean;
  shadowColor: string;
  shadowOpacity: number;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowSpread: number;
};

export type Preset = {
  id: string;
  name: string;
  swatch: string;
  background: string;
  iconColor: string;
  rounded: number;
  padding: number;
  shadow: boolean;
  shadowColor?: string;
  shadowOpacity?: number;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowSpread?: number;
};

export type IconSearchResult = {
  prefix: string;
  name: string;
  packName: string;
  license: string;
  palette: boolean;
};

export type PackInfo = {
  prefix: string;
  name: string;
  total: number;
  license?: string;
  palette?: boolean;
  samples?: string[];
};

export type AiAction =
  | {
      type: "setIcon";
      prefix: string;
      name: string;
      packName?: string;
      license?: string;
      palette?: boolean;
    }
  | {
      type: "setBackground";
      background?: string;
      rounded?: number;
      padding?: number;
      shadow?: boolean;
      shadowColor?: string;
      shadowOpacity?: number;
      shadowBlur?: number;
      shadowOffsetX?: number;
      shadowOffsetY?: number;
      shadowSpread?: number;
    }
  | {
      type: "setIconStyle";
      size?: number;
      rotate?: number;
      strokeWidth?: number;
      weight?: string | null;
      iconColor?: string;
    }
  | { type: "applyPreset"; id: string }
  | {
      type: "restoreVersion";
      stepsBack?: number;
      versionId?: string;
    }
  | { type: "editIconSvg"; svg: string };

export type AiApplied = {
  icon?: { prefix: string; name: string; packName: string };
  preset?: { id: string; name: string };
  restored?: { id: string; label: string };
  svgEdited?: boolean;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  applied?: AiApplied;
};
