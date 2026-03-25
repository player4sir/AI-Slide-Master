/**
 * Design Strategist — AI-driven design specification generator.
 * 
 * Inspired by ppt-master's Strategist phase, this module generates a comprehensive
 * DesignSpec before slide enrichment begins. The DesignSpec governs:
 * - Color scheme (primary/secondary/accent/surface/text hierarchy)
 * - Typography (fonts, sizes, line height)
 * - Layout hints per slide (recommended layout, decoration, emphasis level)
 * - Visual style tokens (shadows, gradients, card radius, spacing)
 *
 * Based on CRAP design principles (Contrast, Repetition, Alignment, Proximity).
 */
import { deepseek, withRetry } from "./deepseek.js";
import type { PPTOutline } from "./deepseek.js";

// ─── DESIGN SPEC TYPES ─────────────────────────────────────────────────────

export interface DesignColorScheme {
  primary: string;       // Main brand/theme color (hex, no #)
  secondary: string;     // Supporting color
  accent: string;        // Highlight/CTA color
  background: string;    // Slide background
  surface: string;       // Card/panel fill
  surfaceBorder: string; // Card border
  text: string;          // Primary text
  textLight: string;     // Secondary/muted text
  chartColors: string[]; // Chart palette (5-6 colors)
}

export interface DesignTypography {
  titleFont: string;
  bodyFont: string;
  titleSize: number;     // Title font size (pt)
  subtitleSize: number;  // Subtitle font size (pt)
  bodySize: number;      // Body text size (pt)
  captionSize: number;   // Small/caption size (pt)
  lineHeight: number;    // Line spacing multiplier (e.g. 1.4)
}

export interface SlideDesignHint {
  slideNumber: number;
  recommendedLayout: string;   // contentLayout value
  decorationStyle: string;     // decoration value
  titleStyle: string;          // titleStyle value
  emphasis: "high" | "medium" | "low";
  designNote: string;          // AI reasoning for this choice
}

export interface DesignSpec {
  // Visual Identity
  colorScheme: DesignColorScheme;
  typography: DesignTypography;

  // Style Tokens
  layoutStyle: "corporate" | "creative" | "academic" | "tech" | "minimal";
  cardRadius: number;          // Card border radius in inches (e.g. 0.08)
  shadowBlur: number;          // Shadow blur radius (0 = no shadow)
  shadowOpacity: number;       // Shadow opacity (0-1)
  useGradientAccents: boolean; // Whether to apply gradient decorations
  spacingUnit: number;         // Base spacing unit in inches (e.g. 0.15)

  // Per-slide design hints
  slideHints: SlideDesignHint[];

  // Design rationale
  overallDesignNote: string;   // AI explanation of design choices
}

// ─── DEFAULT DESIGN SPEC ────────────────────────────────────────────────────

export function getDefaultDesignSpec(slideCount: number): DesignSpec {
  return {
    colorScheme: {
      primary: "1A5276",
      secondary: "2E86C1",
      accent: "E67E22",
      background: "FFFFFF",
      surface: "F8F9FA",
      surfaceBorder: "E5E7EB",
      text: "1F2937",
      textLight: "6B7280",
      chartColors: ["2E86C1", "E67E22", "27AE60", "8E44AD", "E74C3C", "F39C12"],
    },
    typography: {
      titleFont: "Calibri",
      bodyFont: "Calibri",
      titleSize: 28,
      subtitleSize: 18,
      bodySize: 14,
      captionSize: 10,
      lineHeight: 1.4,
    },
    layoutStyle: "corporate",
    cardRadius: 0.08,
    shadowBlur: 12,
    shadowOpacity: 0.06,
    useGradientAccents: true,
    spacingUnit: 0.15,
    slideHints: Array.from({ length: slideCount }, (_, i) => ({
      slideNumber: i + 1,
      recommendedLayout: i === 0 ? "full-center" : "stacked-rows",
      decorationStyle: i === 0 ? "none" : "corner-accents",
      titleStyle: i === 0 ? "centered-underline" : "left-accent",
      emphasis: i === 0 || i === slideCount - 1 ? "high" as const : "medium" as const,
      designNote: "",
    })),
    overallDesignNote: "Default corporate design spec",
  };
}

// ─── AI DESIGN SPEC GENERATION ──────────────────────────────────────────────

export async function generateDesignSpec(
  outline: PPTOutline,
  params: { topic: string; language: string; style: string },
): Promise<DesignSpec> {
  const langName = params.language === "zh" ? "Chinese" : "English";
  const slideCount = outline.slides.length;
  const slideSummary = outline.slides
    .map((s, i) => `  ${i + 1}. [${s.slideType}/${s.visualType || "text"}] ${s.title}`)
    .join("\n");

  const systemPrompt = `You are a world-class presentation design strategist applying CRAP design principles (Contrast, Repetition, Alignment, Proximity). You analyze presentation content and generate a comprehensive design specification that ensures visual excellence and consistency. Always respond with valid JSON only.`;

  const userPrompt = `Create a design specification for this ${params.style} presentation about "${params.topic}".

Title: ${outline.presentationTitle}
Slides (${slideCount} total):
${slideSummary}

Generate a DesignSpec JSON with these fields:
{
  "colorScheme": {
    "primary": "hex color without # — main theme color matching topic/style",
    "secondary": "complementary supporting color",
    "accent": "high-contrast highlight color for CTAs and emphasis",
    "background": "slide background (usually FFFFFF or very dark for dark themes)",
    "surface": "card/panel fill color (subtle contrast with background)",
    "surfaceBorder": "card border color",
    "text": "primary text color (high contrast with background)",
    "textLight": "secondary/muted text color",
    "chartColors": ["6 harmonious colors for data visualization"]
  },
  "typography": {
    "titleFont": "Font name for titles (choose from: Calibri, Arial, Microsoft YaHei, SimHei, Georgia, Helvetica)",
    "bodyFont": "Font name for body text",
    "titleSize": 28,
    "subtitleSize": 18,
    "bodySize": 14,
    "captionSize": 10,
    "lineHeight": 1.4
  },
  "layoutStyle": "corporate|creative|academic|tech|minimal — best match for the content",
  "cardRadius": 0.08,
  "shadowBlur": 12,
  "shadowOpacity": 0.06,
  "useGradientAccents": true,
  "spacingUnit": 0.15,
  "slideHints": [
    {
      "slideNumber": 1,
      "recommendedLayout": "full-center|split-left|split-right|grid-cards|timeline-horizontal|timeline-vertical|stacked-rows|hero-banner",
      "decorationStyle": "none|corner-accents|side-panel|gradient-overlay|geometric-dots|double-rules|glow-ring",
      "titleStyle": "left-accent|centered-underline|full-bar|minimal|numbered",
      "emphasis": "high|medium|low",
      "designNote": "Brief reason for this layout choice"
    }
    // ... one entry per slide
  ],
  "overallDesignNote": "Brief explanation of the overall design strategy in ${langName}"
}

Design principles to apply:
1. **CONTRAST**: Title slides and conclusion use high emphasis; data slides use accent colors for metrics
2. **REPETITION**: Consistent decoration style across content slides; vary layout but keep visual language unified
3. **ALIGNMENT**: Prefer left-accent titles for content flow; center for title/conclusion
4. **PROXIMITY**: Group related content with cards; separate sections with different decorations

Style-specific guidance:
- "corporate/business": Professional blue/navy tones, clean layouts, stacked-rows for content
- "creative": Bold accent colors, varied layouts, geometric-dots and glow-ring decorations
- "academic": Conservative colors, serif-friendly, numbered titles, minimal decorations
- "tech/technology": Dark background option, vibrant accents, gradient-overlay, split layouts
- "minimal": Monochrome + single accent, generous whitespace, minimal/no decorations

For each slide, choose layout based on its type and visual:
- title/conclusion → full-center + centered-underline + high emphasis
- section → hero-banner or full-center + medium emphasis
- chart/stats → grid-cards or stacked-rows + double-rules
- process → timeline-horizontal + corner-accents
- comparison → grid-cards + side-panel
- text-only → stacked-rows or split-left + left-accent
- icon-grid → grid-cards + geometric-dots`;

  try {
    const spec = await withRetry(() =>
      deepseek.chat.completions
        .create({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.6,
        })
        .then((response) => {
          const content = response.choices[0].message.content;
          if (!content) throw new Error("No DesignSpec returned");
          return JSON.parse(content) as DesignSpec;
        }),
    );

    // Validate and normalize
    return normalizeDesignSpec(spec, slideCount);
  } catch {
    // Fallback to default spec on failure
    console.error("DesignSpec generation failed, using defaults");
    return getDefaultDesignSpec(slideCount);
  }
}

// ─── NORMALIZATION ──────────────────────────────────────────────────────────

function normalizeDesignSpec(spec: Partial<DesignSpec>, slideCount: number): DesignSpec {
  const defaults = getDefaultDesignSpec(slideCount);

  const colorScheme: DesignColorScheme = {
    primary: validateHex(spec.colorScheme?.primary) || defaults.colorScheme.primary,
    secondary: validateHex(spec.colorScheme?.secondary) || defaults.colorScheme.secondary,
    accent: validateHex(spec.colorScheme?.accent) || defaults.colorScheme.accent,
    background: validateHex(spec.colorScheme?.background) || defaults.colorScheme.background,
    surface: validateHex(spec.colorScheme?.surface) || defaults.colorScheme.surface,
    surfaceBorder: validateHex(spec.colorScheme?.surfaceBorder) || defaults.colorScheme.surfaceBorder,
    text: validateHex(spec.colorScheme?.text) || defaults.colorScheme.text,
    textLight: validateHex(spec.colorScheme?.textLight) || defaults.colorScheme.textLight,
    chartColors: (spec.colorScheme?.chartColors || defaults.colorScheme.chartColors)
      .map(c => validateHex(c) || "2E86C1")
      .slice(0, 6),
  };

  const typography: DesignTypography = {
    titleFont: spec.typography?.titleFont || defaults.typography.titleFont,
    bodyFont: spec.typography?.bodyFont || defaults.typography.bodyFont,
    titleSize: clamp(spec.typography?.titleSize || 28, 20, 44),
    subtitleSize: clamp(spec.typography?.subtitleSize || 18, 14, 24),
    bodySize: clamp(spec.typography?.bodySize || 14, 11, 18),
    captionSize: clamp(spec.typography?.captionSize || 10, 8, 13),
    lineHeight: clamp(spec.typography?.lineHeight || 1.4, 1.1, 2.0),
  };

  // Ensure slideHints covers all slides
  const slideHints: SlideDesignHint[] = Array.from({ length: slideCount }, (_, i) => {
    const hint = spec.slideHints?.find(h => h.slideNumber === i + 1) || spec.slideHints?.[i];
    return {
      slideNumber: i + 1,
      recommendedLayout: hint?.recommendedLayout || defaults.slideHints[i]?.recommendedLayout || "stacked-rows",
      decorationStyle: hint?.decorationStyle || defaults.slideHints[i]?.decorationStyle || "corner-accents",
      titleStyle: hint?.titleStyle || defaults.slideHints[i]?.titleStyle || "left-accent",
      emphasis: hint?.emphasis || defaults.slideHints[i]?.emphasis || "medium",
      designNote: hint?.designNote || "",
    };
  });

  const VALID_STYLES = new Set(["corporate", "creative", "academic", "tech", "minimal"]);
  const layoutStyle = VALID_STYLES.has(spec.layoutStyle || "") ? spec.layoutStyle! : defaults.layoutStyle;

  return {
    colorScheme,
    typography,
    layoutStyle: layoutStyle as DesignSpec["layoutStyle"],
    cardRadius: clamp(spec.cardRadius ?? 0.08, 0, 0.2),
    shadowBlur: clamp(spec.shadowBlur ?? 12, 0, 24),
    shadowOpacity: clamp(spec.shadowOpacity ?? 0.06, 0, 0.3),
    useGradientAccents: spec.useGradientAccents ?? true,
    spacingUnit: clamp(spec.spacingUnit ?? 0.15, 0.08, 0.3),
    slideHints,
    overallDesignNote: spec.overallDesignNote || "",
  };
}

function validateHex(hex?: string): string | null {
  if (!hex) return null;
  const clean = hex.replace(/^#/, "");
  return /^[0-9A-Fa-f]{6}$/.test(clean) ? clean : null;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}
