/**
 * Brand Kit System (Phase 5)
 * 
 * Allows users to upload brand assets (logo, colors, fonts, watermark)
 * and apply them consistently across all slides. The BrandKit overrides
 * theme defaults when provided.
 */
import type { PresentationTheme } from "./ppt-theme.js";

// ─── TYPES ──────────────────────────────────────────────────────────────────

export type LogoPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface BrandKit {
  id: string;
  name: string;
  /** Base64 data URI or URL for logo image */
  logoData?: string;
  logoPosition: LogoPosition;
  logoScale: number;            // 0.3 - 1.5 (multiplier for default size)
  /** Brand colors — override theme */
  primaryColor?: string;        // hex without #
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  /** Font overrides */
  titleFont?: string;           // e.g. "Microsoft YaHei", "Helvetica"
  bodyFont?: string;
  /** Watermark */
  watermarkText?: string;
  watermarkOpacity?: number;    // 0-100 (transparency percentage)
  /** Company name shown in footer */
  companyName?: string;
}

// ─── DEFAULT BRAND KIT ──────────────────────────────────────────────────────

export const DEFAULT_BRAND_KIT: BrandKit = {
  id: "default",
  name: "默认",
  logoPosition: "bottom-right",
  logoScale: 1.0,
};

// ─── THEME COLOR OVERRIDE ──────────────────────────────────────────────────

/**
 * Applies BrandKit color overrides on top of a resolved PresentationTheme.
 * Returns a new theme object — does not mutate the original.
 */
export function applyBrandColors(theme: PresentationTheme, kit: BrandKit): PresentationTheme {
  return {
    ...theme,
    ...(kit.primaryColor ? { primary: kit.primaryColor } : {}),
    ...(kit.secondaryColor ? { secondary: kit.secondaryColor } : {}),
    ...(kit.accentColor ? { accent: kit.accentColor } : {}),
    ...(kit.backgroundColor ? { background: kit.backgroundColor } : {}),
    ...(kit.titleFont ? { titleFont: kit.titleFont } : {}),
    ...(kit.bodyFont ? { bodyFont: kit.bodyFont } : {}),
  };
}

// ─── LOGO COORDINATES ──────────────────────────────────────────────────────

const SW = 13.33;
const SH = 7.5;
const BASE_LOGO_W = 1.0;
const BASE_LOGO_H = 0.5;
const MARGIN = 0.25;

export interface LogoRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function getLogoRect(position: LogoPosition, scale: number): LogoRect {
  const w = BASE_LOGO_W * scale;
  const h = BASE_LOGO_H * scale;

  switch (position) {
    case "top-left":
      return { x: MARGIN, y: MARGIN, w, h };
    case "top-right":
      return { x: SW - w - MARGIN, y: MARGIN, w, h };
    case "bottom-left":
      return { x: MARGIN, y: SH - h - MARGIN, w, h };
    case "bottom-right":
    default:
      return { x: SW - w - MARGIN, y: SH - h - MARGIN, w, h };
  }
}

// ─── SLIDE APPLICATION ──────────────────────────────────────────────────────

import PptxGenJS from "pptxgenjs";

/**
 * Apply brand kit elements to a single slide.
 * Call this after all content has been rendered.
 */
export function applyBrandToSlide(
  slide: PptxGenJS.Slide,
  kit: BrandKit,
  options?: {
    skipLogo?: boolean;
    skipWatermark?: boolean;
    skipCompanyName?: boolean;
  }
) {
  const { skipLogo, skipWatermark, skipCompanyName } = options || {};

  // 1. Logo
  if (!skipLogo && kit.logoData) {
    const rect = getLogoRect(kit.logoPosition, kit.logoScale);
    slide.addImage({
      data: kit.logoData,
      x: rect.x,
      y: rect.y,
      w: rect.w,
      h: rect.h,
    });
  }

  // 2. Watermark (large, centered, semi-transparent)
  if (!skipWatermark && kit.watermarkText) {
    slide.addText(kit.watermarkText, {
      x: 0,
      y: SH / 2 - 1,
      w: SW,
      h: 2,
      fontSize: 60,
      bold: true,
      color: "000000",
      transparency: kit.watermarkOpacity ?? 92,
      align: "center",
      valign: "middle",
      fontFace: kit.titleFont || "Arial",
      rotate: -30,
    });
  }

  // 3. Company name in footer
  if (!skipCompanyName && kit.companyName) {
    slide.addText(kit.companyName, {
      x: SW / 2 - 2,
      y: SH - 0.4,
      w: 4,
      h: 0.3,
      fontSize: 8,
      color: "999999",
      align: "center",
      valign: "middle",
      fontFace: kit.bodyFont || "Calibri",
    });
  }
}

/**
 * Get the font face to use based on brand kit and context.
 */
export function getBrandFont(kit: BrandKit | undefined, context: "title" | "body"): string {
  if (!kit) return "Calibri";
  if (context === "title") return kit.titleFont || "Calibri";
  return kit.bodyFont || "Calibri";
}
