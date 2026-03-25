export const THEME_PRESETS = {
  professional: {
    background: "F8FAFC",
    primary: "1E293B",     // Slate 800
    secondary: "334155",   // Slate 700
    accent: "3B82F6",      // Blue 500
    text: "0F172A",        // Slate 900
    textLight: "64748B",   // Slate 500
    card: "FFFFFF",
    cardBorder: "E2E8F0",
    chart: ["3B82F6", "0EA5E9", "10B981", "8B5CF6", "1E293B", "64748B"],
  },
  creative: { // The "Stone & Gold" Liquid Glass equivalent
    background: "0C0A09",  // Stone 950
    primary: "EAB308",     // Yellow 500 (Gold)
    secondary: "A8A29E",   // Stone 400
    accent: "F59E0B",      // Amber 500
    text: "FAFAF9",        // Stone 50
    textLight: "A8A29E",
    card: "1C1917",        // Stone 900
    cardBorder: "292524",  // Stone 800
    chart: ["EAB308", "D97706", "A8A29E", "F59E0B", "FDE047", "78716C"],
  },
  minimal: {
    background: "FFFFFF",
    primary: "09090B",     // Zinc 950
    secondary: "52525B",   // Zinc 500
    accent: "18181B",      // Zinc 900
    text: "09090B",
    textLight: "71717A",
    card: "FFFFFF",
    cardBorder: "E4E4E7",
    chart: ["09090B", "52525B", "A1A1AA", "D4D4D8", "27272A", "71717A"],
  },
  academic: {
    background: "FAFAF9",  // Stone 50
    primary: "064E3B",     // Emerald 900
    secondary: "047857",   // Emerald 600
    accent: "059669",      // Emerald 500
    text: "1C1917",        // Stone 900
    textLight: "57534E",   // Stone 500
    card: "FFFFFF",
    cardBorder: "D1FAE5",  // Emerald 100
    chart: ["047857", "059669", "10B981", "34D399", "064E3B", "0F766E"],
  },
  "dark-tech": {
    background: "020617",  // Slate 950
    primary: "0EA5E9",     // Sky 500
    secondary: "38BDF8",   // Sky 400
    accent: "0284C7",      // Sky 600
    text: "F8FAFC",        // Slate 50
    textLight: "94A3B8",   // Slate 400
    card: "0F172A",        // Slate 900
    cardBorder: "1E293B",  // Slate 800
    chart: ["0EA5E9", "38BDF8", "0284C7", "7DD3FC", "0369A1", "3B82F6"],
  },
  "corporate-blue": {
    background: "FFFFFF",
    primary: "1D4ED8",     // Blue 700
    secondary: "2563EB",   // Blue 600
    accent: "3B82F6",      // Blue 500
    text: "1E293B",
    textLight: "64748B",
    card: "F8FAFC",        // Slate 50
    cardBorder: "E2E8F0",
    chart: ["1D4ED8", "2563EB", "3B82F6", "0369A1", "60A5FA", "1E40AF"],
  },
  warm: {
    background: "FFFDF5",
    primary: "9A3412",     // Orange 900
    secondary: "C2410C",   // Orange 800
    accent: "EA580C",      // Orange 600
    text: "431407",        // Orange 950
    textLight: "9A3412",
    card: "FFFFFF",
    cardBorder: "FFEDD5",  // Orange 100
    chart: ["C2410C", "EA580C", "F97316", "9A3412", "FDBA74", "7C2D12"],
  },
  "modern-dark": {
    background: "09090B",  // Zinc 950
    primary: "71717A",     // Zinc 500
    secondary: "A1A1AA",   // Zinc 400
    accent: "FAFAFA",      // Zinc 50
    text: "FAFAFA",
    textLight: "A1A1AA",
    card: "18181B",        // Zinc 900
    cardBorder: "27272A",
    chart: ["D4D4D8", "A1A1AA", "71717A", "52525B", "FAFAFA", "3F3F46"],
  },
};

export type ThemePreset = keyof typeof THEME_PRESETS;
export type PresentationTheme = (typeof THEME_PRESETS)[ThemePreset] & {
  titleFont?: string;
  bodyFont?: string;
};

function clamp(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function parseHex(hex: string) {
  const normalized = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function toHex(value: { r: number; g: number; b: number }) {
  return [value.r, value.g, value.b]
    .map((channel) => clamp(channel).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
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
  if (!value) return undefined;
  const normalized = value.trim().replace(/^#/, "").toUpperCase();
  return /^[0-9A-F]{6}$/.test(normalized) ? `#${normalized}` : undefined;
}

export function resolvePresentationTheme(
  themePreset?: string,
  primaryColor?: string,
): PresentationTheme {
  const preset = THEME_PRESETS[(themePreset as ThemePreset) ?? "professional"] ?? THEME_PRESETS.professional;
  const normalizedPrimary = normalizePrimaryColor(primaryColor);

  if (!normalizedPrimary) return preset;

  const base = normalizedPrimary.replace("#", "");
  const isDarkBase = ["0F0E17", "050D1A", "0A0A0A"].includes(preset.background);

  return {
    ...preset,
    primary: isDarkBase ? mix(base, "000000", 0.82) : mix(base, "111827", 0.58),
    secondary: mix(base, "FFFFFF", isDarkBase ? 0.1 : 0.14),
    accent: mix(base, isDarkBase ? "7C3AED" : "F97316", 0.2),
    card: isDarkBase ? mix(base, "0B1220", 0.9) : mix(base, "FFFFFF", 0.92),
    cardBorder: isDarkBase ? mix(base, "1F2937", 0.7) : mix(base, "CBD5E1", 0.65),
    chart: [
      base,
      mix(base, "FFFFFF", 0.18),
      mix(base, "22C55E", 0.28),
      mix(base, "F59E0B", 0.28),
      mix(base, "8B5CF6", 0.24),
      mix(base, "EF4444", 0.22),
    ],
  };
}
