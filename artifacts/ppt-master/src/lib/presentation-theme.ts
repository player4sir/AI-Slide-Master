export const themePresetOptions = [
  { value: "professional", label: "\u5546\u52a1\u4e13\u4e1a" },
  { value: "creative", label: "\u521b\u610f\u8868\u8fbe" },
  { value: "minimal", label: "\u6781\u7b80\u9ad8\u7ea7" },
  { value: "academic", label: "\u5b66\u672f\u7814\u7a76" },
  { value: "dark-tech", label: "\u6df1\u8272\u79d1\u6280" },
  { value: "corporate-blue", label: "\u4f01\u4e1a\u84dd" },
  { value: "warm", label: "\u6696\u8272\u63d0\u6848" },
  { value: "modern-dark", label: "\u73b0\u4ee3\u6df1\u8272" },
] as const;

export const DEFAULT_TEMPLATE_ID = "minimal-corporate";

const presetMap = {
  professional: {
    background: "#F8FAFC",
    primary: "#1E3A5F",
    secondary: "#2E86AB",
    accent: "#E85D75",
    text: "#1A1A2E",
    card: "#FFFFFF",
  },
  creative: {
    background: "#0F0E17",
    primary: "#FF8906",
    secondary: "#F25F4C",
    accent: "#E53170",
    text: "#FFFFFE",
    card: "#1A1926",
  },
  minimal: {
    background: "#FAFAFA",
    primary: "#111111",
    secondary: "#444444",
    accent: "#0066FF",
    text: "#111111",
    card: "#FFFFFF",
  },
  academic: {
    background: "#FAFFF8",
    primary: "#1B4332",
    secondary: "#2D6A4F",
    accent: "#40916C",
    text: "#1B4332",
    card: "#FFFFFF",
  },
  "dark-tech": {
    background: "#050D1A",
    primary: "#0A1628",
    secondary: "#00C2FF",
    accent: "#00FFB3",
    text: "#E8F4FD",
    card: "#0D1F35",
  },
  "corporate-blue": {
    background: "#FFFFFF",
    primary: "#003087",
    secondary: "#0057B8",
    accent: "#FF6600",
    text: "#1A1A1A",
    card: "#F5F8FF",
  },
  warm: {
    background: "#FFFBF5",
    primary: "#7C3810",
    secondary: "#C4622D",
    accent: "#E8A838",
    text: "#3D1F0D",
    card: "#FFFFFF",
  },
  "modern-dark": {
    background: "#0A0A0A",
    primary: "#141414",
    secondary: "#6C63FF",
    accent: "#FF3CAC",
    text: "#F0F0F0",
    card: "#1A1A1A",
  },
} as const;

const templatePreviewMap = {
  "minimal-corporate": presetMap.professional,
  "tech-pitch": presetMap.creative,
  "annual-review": presetMap.warm,
  "dark-tech": presetMap["dark-tech"],
  academic: presetMap.academic,
} as const;

function clamp(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function parseHex(hex: string) {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function toHex(rgb: { r: number; g: number; b: number }) {
  return `#${[rgb.r, rgb.g, rgb.b]
    .map((channel) => clamp(channel).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function mix(hexA: string, hexB: string, ratio: number) {
  const a = parseHex(hexA);
  const b = parseHex(hexB);
  if (!a || !b) return hexA;
  return toHex({
    r: a.r + (b.r - a.r) * ratio,
    g: a.g + (b.g - a.g) * ratio,
    b: a.b + (b.b - a.b) * ratio,
  });
}

export function normalizePrimaryColor(value: string | undefined) {
  if (!value) return "";
  const normalized = value.trim().replace(/^#/, "").toUpperCase();
  return /^[0-9A-F]{6}$/.test(normalized) ? `#${normalized}` : "";
}

export function getThemePreview(themePreset?: string, primaryColor?: string) {
  const preset =
    templatePreviewMap[themePreset as keyof typeof templatePreviewMap] ??
    presetMap[themePreset as keyof typeof presetMap] ??
    templatePreviewMap[DEFAULT_TEMPLATE_ID];
  const normalizedPrimary = normalizePrimaryColor(primaryColor);

  if (!normalizedPrimary) {
    return preset;
  }

  const isDarkBase = ["#0F0E17", "#050D1A", "#0A0A0A"].includes(preset.background);

  return {
    ...preset,
    primary: isDarkBase ? mix(normalizedPrimary, "#000000", 0.82) : mix(normalizedPrimary, "#111827", 0.58),
    secondary: mix(normalizedPrimary, "#FFFFFF", isDarkBase ? 0.1 : 0.14),
    accent: mix(normalizedPrimary, isDarkBase ? "#7C3AED" : "#F97316", 0.2),
    card: isDarkBase ? mix(normalizedPrimary, "#0B1220", 0.9) : mix(normalizedPrimary, "#FFFFFF", 0.92),
  };
}

export const primaryColorSwatches = [
  "#0EA5E9",
  "#2563EB",
  "#7C3AED",
  "#EC4899",
  "#F97316",
  "#10B981",
];
