/**
 * Layout Components — reusable building blocks for AI-driven layout composition.
 * Each component renders a specific visual element (decoration, title, content area)
 * without knowledge of the overall slide composition. The Layout Resolver in
 * pptx-builder.ts orchestrates these components based on AI-generated LayoutDirectives.
 */
import PptxGenJS from "pptxgenjs";
import type { SlideContent, CardStyle } from "./deepseek.js";
import type { PresentationTheme } from "./ppt-theme.js";
import type { DesignSpec } from "./design-strategist.js";

const SW = 13.33;
const SH = 7.5;

// Font helpers — read from theme with Calibri fallback
const tf = (theme: PresentationTheme) => theme.titleFont || "Calibri";
const bf = (theme: PresentationTheme) => theme.bodyFont || "Calibri";

// ─── CONTENT AREA RECT ──────────────────────────────────────────────────────
// Passed to content renderers so they know where to draw
export interface ContentArea {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ─── DECORATION RENDERERS ───────────────────────────────────────────────────

export function applyNoDecoration() { /* intentionally empty */ }

export function applyCornerAccents(slide: PptxGenJS.Slide, theme: PresentationTheme) {
  const len = 1.8;
  const t = 0.04;
  // Top-left
  slide.addShape("rect", { x: 0, y: 0, w: len, h: t, fill: { color: theme.primary }, line: { type: "none" } });
  slide.addShape("rect", { x: 0, y: 0, w: t, h: len * 0.8, fill: { color: theme.primary }, line: { type: "none" } });
  // Bottom-right
  slide.addShape("rect", { x: SW - len, y: SH - t, w: len, h: t, fill: { color: theme.primary }, line: { type: "none" } });
  slide.addShape("rect", { x: SW - t, y: SH - len * 0.8, w: t, h: len * 0.8, fill: { color: theme.primary }, line: { type: "none" } });
}

export function applySidePanel(slide: PptxGenJS.Slide, theme: PresentationTheme, side: "left" | "right" = "left", width = 0.12) {
  const x = side === "left" ? 0 : SW - width;
  slide.addShape("rect", { x, y: 0, w: width, h: SH, fill: { color: theme.primary }, line: { type: "none" } });
}

export function applyGradientOverlay(slide: PptxGenJS.Slide, theme: PresentationTheme) {
  slide.addShape("rect", {
    x: 0, y: 0, w: SW * 0.4, h: SH,
    fill: { color: theme.primary, transparency: 92 }, line: { type: "none" },
  });
  slide.addShape("rect", {
    x: SW * 0.4, y: 0, w: SW * 0.3, h: SH,
    fill: { color: theme.primary, transparency: 96 }, line: { type: "none" },
  });
}

export function applyGeometricDots(slide: PptxGenJS.Slide, theme: PresentationTheme) {
  const dots = [
    { x: SW - 2.5, y: 0.8, r: 0.35 }, { x: SW - 1.2, y: 1.6, r: 0.2 },
    { x: 1.5, y: SH - 1.5, r: 0.25 }, { x: 0.5, y: SH - 2.5, r: 0.15 },
    { x: SW - 0.8, y: SH - 1.0, r: 0.18 },
  ];
  dots.forEach(d => {
    slide.addShape("ellipse", {
      x: d.x, y: d.y, w: d.r * 2, h: d.r * 2,
      fill: { color: theme.accent, transparency: 82 }, line: { type: "none" },
    });
  });
}

export function applyDoubleRules(slide: PptxGenJS.Slide, theme: PresentationTheme) {
  slide.addShape("rect", { x: 0, y: 0, w: SW, h: 0.04, fill: { color: theme.primary }, line: { type: "none" } });
  slide.addShape("rect", { x: 0, y: 0.08, w: SW, h: 0.015, fill: { color: theme.primary, transparency: 50 }, line: { type: "none" } });
  slide.addShape("rect", { x: 0, y: SH - 0.04, w: SW, h: 0.04, fill: { color: theme.primary }, line: { type: "none" } });
  slide.addShape("rect", { x: 0, y: SH - 0.095, w: SW, h: 0.015, fill: { color: theme.primary, transparency: 50 }, line: { type: "none" } });
}

export function applyGlowRing(slide: PptxGenJS.Slide, theme: PresentationTheme, cx = SW / 2, cy = SH / 2) {
  slide.addShape("ellipse", { x: cx - 4, y: cy - 4, w: 8, h: 8, fill: { color: theme.primary, transparency: 92 }, line: { type: "none" } });
  slide.addShape("ellipse", { x: cx - 3, y: cy - 3, w: 6, h: 6, fill: { type: "none" }, line: { color: theme.primary, width: 0.5 } });
}

// ─── TITLE STYLE RENDERERS ──────────────────────────────────────────────────
// Each returns the Y coordinate where content should start below the title

export function renderTitleLeftAccent(slide: PptxGenJS.Slide, title: string, theme: PresentationTheme, pad: number, cw: number): number {
  const h = 0.8;
  slide.addShape("rect", { x: pad, y: 0.25, w: 0.1, h: 0.55, fill: { color: theme.primary }, line: { type: "none" } });
  slide.addText(title, { x: pad + 0.3, y: 0.2, w: cw - 0.3, h, fontSize: 28, bold: true, color: theme.text, align: "left", valign: "middle", fontFace: tf(theme) });
  slide.addShape("rect", { x: pad, y: h + 0.25, w: cw, h: 0.02, fill: { color: theme.cardBorder }, line: { type: "none" } });
  return h + 0.4;
}

export function renderTitleCenteredUnderline(slide: PptxGenJS.Slide, title: string, theme: PresentationTheme, pad: number, cw: number): number {
  const h = 0.9;
  slide.addText(title, { x: pad, y: 0.15, w: cw, h, fontSize: 30, bold: true, color: theme.text, align: "center", valign: "middle", fontFace: tf(theme) });
  const lineW = 2.0;
  slide.addShape("rect", { x: (SW - lineW) / 2, y: h + 0.2, w: lineW, h: 0.04, fill: { color: theme.primary }, line: { type: "none" } });
  return h + 0.4;
}

export function renderTitleFullBar(slide: PptxGenJS.Slide, title: string, theme: PresentationTheme, pad: number, cw: number): number {
  const h = 0.9;
  slide.addShape("rect", { x: 0, y: 0, w: SW, h, fill: { color: theme.primary }, line: { type: "none" } });
  slide.addText(title, { x: pad + 0.2, y: 0, w: cw, h, fontSize: 24, bold: true, color: "FFFFFF", align: "left", valign: "middle", fontFace: tf(theme) });
  return h + 0.2;
}

export function renderTitleMinimal(slide: PptxGenJS.Slide, title: string, theme: PresentationTheme, pad: number, cw: number): number {
  const h = 0.8;
  slide.addText(title, { x: pad, y: 0.2, w: cw, h, fontSize: 28, bold: true, color: theme.text, align: "left", valign: "middle", fontFace: tf(theme) });
  return h + 0.3;
}

export function renderTitleNumbered(slide: PptxGenJS.Slide, title: string, theme: PresentationTheme, pad: number, cw: number, num: number): number {
  const h = 0.9;
  const badge = 0.7;
  slide.addShape("ellipse", { x: pad, y: 0.2, w: badge, h: badge, fill: { color: theme.primary }, line: { type: "none" } });
  slide.addText(`${num}`, { x: pad, y: 0.2, w: badge, h: badge, fontSize: 18, bold: true, color: "FFFFFF", align: "center", valign: "middle", fontFace: "Arial" });
  slide.addText(title, { x: pad + badge + 0.2, y: 0.15, w: cw - badge - 0.2, h, fontSize: 28, bold: true, color: theme.text, align: "left", valign: "middle", fontFace: tf(theme) });
  return h + 0.3;
}

// ─── CONTENT LAYOUT RENDERERS ──────────────────────────────────────────────

export function renderFullCenter(slide: PptxGenJS.Slide, content: SlideContent, theme: PresentationTheme, area: ContentArea, cardStyle: CardStyle = "ghost") {
  const pts = content.keyPoints;
  if (pts.length === 0) return;
  const rows = pts.map((pt, i) => ({
    text: pt,
    options: {
      bullet: { type: "bullet" as const, code: "25CF", color: theme.chart[i % theme.chart.length] },
      fontSize: 16, color: theme.text, fontFace: bf(theme), paraSpaceAfter: 14, indentLevel: 0,
    },
  }));
  slide.addText(rows, { x: area.x + 0.5, y: area.y, w: area.w - 1, h: area.h, align: "center", valign: "middle", wrap: true });
}

export function renderSplitLayout(slide: PptxGenJS.Slide, content: SlideContent, theme: PresentationTheme, area: ContentArea, direction: "left" | "right", cardStyle: CardStyle = "bordered") {
  const panelW = area.w * 0.38;
  const contentW = area.w - panelW - 0.5;
  const panelX = direction === "left" ? area.x : area.x + contentW + 0.5;
  const textX = direction === "left" ? area.x + panelW + 0.5 : area.x;

  // Decorative panel
  slide.addShape("rect", { x: panelX, y: area.y, w: panelW, h: area.h, fill: { color: theme.primary, transparency: 85 }, line: { type: "none" } });
  // Circles on panel
  slide.addShape("ellipse", { x: panelX + panelW / 2 - 1, y: area.y + area.h / 2 - 1, w: 2, h: 2, fill: { color: theme.accent, transparency: 75 }, line: { type: "none" } });
  slide.addShape("ellipse", { x: panelX + panelW / 2 - 0.5, y: area.y + area.h / 2 - 0.5, w: 1, h: 1, fill: { color: "FFFFFF", transparency: 85 }, line: { type: "none" } });

  // Content
  renderStackedRows(slide, content, theme, { x: textX, y: area.y, w: contentW, h: area.h }, cardStyle);
}

export function renderGridCards(slide: PptxGenJS.Slide, content: SlideContent, theme: PresentationTheme, area: ContentArea, cardStyle: CardStyle = "accent-top", designSpec?: DesignSpec) {
  const pts = content.keyPoints;
  if (pts.length === 0) return;
  const cols = pts.length <= 3 ? pts.length : Math.min(Math.ceil(pts.length / 2), 3);
  const rows = Math.ceil(pts.length / cols);
  const gap = designSpec ? designSpec.spacingUnit * 2 : 0.3;
  const cW = (area.w - gap * (cols - 1)) / cols;
  const cH = (area.h - gap * (rows - 1)) / rows;
  const bodySize = designSpec?.typography.bodySize || 13;

  pts.forEach((pt, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const x = area.x + c * (cW + gap), y = area.y + r * (cH + gap);
    const col = theme.chart[i % theme.chart.length];
    drawCard(slide, theme, { x, y, w: cW, h: cH }, cardStyle, col, designSpec);
    const pad = 0.25;
    const topOffset = cardStyle === "accent-top" ? 0.2 : 0.1;
    slide.addText(pt, {
      x: x + pad, y: y + topOffset + 0.1,
      w: cW - pad * 2, h: cH - topOffset - 0.2,
      fontSize: bodySize, color: theme.text, align: "left", valign: "middle", wrap: true,
      fontFace: bf(theme), lineSpacingMultiple: designSpec?.typography.lineHeight || 1.3,
    });
  });
}

export function renderHorizontalTimeline(slide: PptxGenJS.Slide, content: SlideContent, theme: PresentationTheme, area: ContentArea) {
  const pts = content.keyPoints;
  if (pts.length === 0) return;
  const stepW = area.w / pts.length;
  const lineY = area.y + 0.8;

  slide.addShape("rect", { x: area.x + stepW / 2, y: lineY - 0.015, w: area.w - stepW, h: 0.03, fill: { color: theme.primary, transparency: 40 }, line: { type: "none" } });

  pts.forEach((pt, i) => {
    const cx = area.x + stepW * i + stepW / 2;
    const col = theme.chart[i % theme.chart.length];
    // Node
    slide.addShape("ellipse", { x: cx - 0.35, y: lineY - 0.35, w: 0.7, h: 0.7, fill: { color: col }, line: { type: "none" } });
    slide.addText(`${i + 1}`, { x: cx - 0.35, y: lineY - 0.35, w: 0.7, h: 0.7, fontSize: 16, bold: true, color: "FFFFFF", align: "center", valign: "middle", fontFace: tf(theme) });
    // Text below
    slide.addText(pt, { x: cx - stepW / 2 + 0.05, y: lineY + 0.5, w: stepW - 0.1, h: area.h - 1.5, fontSize: 11, color: theme.text, align: "center", valign: "top", wrap: true, fontFace: bf(theme) });
  });
}

export function renderVerticalTimeline(slide: PptxGenJS.Slide, content: SlideContent, theme: PresentationTheme, area: ContentArea) {
  const pts = content.keyPoints;
  if (pts.length === 0) return;
  const stepH = area.h / pts.length;
  const lineX = area.x + 1.0;

  slide.addShape("rect", { x: lineX - 0.015, y: area.y, w: 0.03, h: area.h, fill: { color: theme.primary }, line: { type: "none" } });

  pts.forEach((pt, i) => {
    const y = area.y + i * stepH;
    const col = theme.chart[i % theme.chart.length];
    slide.addShape("ellipse", { x: lineX - 0.2, y: y + stepH / 2 - 0.2, w: 0.4, h: 0.4, fill: { color: col }, line: { type: "none" } });
    slide.addText(pt, { x: lineX + 0.5, y, w: area.w - 1.7, h: stepH, fontSize: 14, color: theme.text, align: "left", valign: "middle", wrap: true, fontFace: bf(theme) });
  });
}

export function renderStackedRows(slide: PptxGenJS.Slide, content: SlideContent, theme: PresentationTheme, area: ContentArea, cardStyle: CardStyle = "accent-left", designSpec?: DesignSpec) {
  const pts = content.keyPoints;
  if (pts.length === 0) return;
  const gap = designSpec ? designSpec.spacingUnit * 1.4 : 0.2;
  const cH = (area.h - gap * (pts.length - 1)) / pts.length;
  const bodySize = designSpec?.typography.bodySize ? designSpec.typography.bodySize + 1 : 15;

  pts.forEach((pt, i) => {
    const y = area.y + i * (cH + gap);
    const col = theme.chart[i % theme.chart.length];
    drawCard(slide, theme, { x: area.x, y, w: area.w, h: cH }, cardStyle, col, designSpec);
    const textX = cardStyle === "accent-left" ? area.x + 0.35 : area.x + 0.2;
    const textW = cardStyle === "accent-left" ? area.w - 0.55 : area.w - 0.4;
    slide.addText(pt, {
      x: textX, y, w: textW, h: cH,
      fontSize: bodySize, color: theme.text, align: "left", valign: "middle", wrap: true,
      fontFace: bf(theme), lineSpacingMultiple: designSpec?.typography.lineHeight || 1.3,
    });
  });
}

export function renderHeroBanner(slide: PptxGenJS.Slide, content: SlideContent, theme: PresentationTheme, area: ContentArea) {
  // Full-width banner with large centered text
  slide.addShape("rect", { x: 0, y: area.y, w: SW, h: area.h, fill: { color: theme.primary, transparency: 88 }, line: { type: "none" } });
  const textH = Math.min(area.h * 0.5, 2.5);
  const bulletY = area.y + textH + 0.3;
  if (content.keyPoints.length > 0) {
    slide.addText(content.keyPoints[0], {
      x: 1.5, y: area.y + 0.2, w: SW - 3, h: textH,
      fontSize: 20, color: theme.text, align: "center", valign: "middle", wrap: true, fontFace: bf(theme), lineSpacingMultiple: 1.4,
    });
    if (content.keyPoints.length > 1) {
      const rows = content.keyPoints.slice(1).map((pt, i) => ({
        text: pt,
        options: { bullet: { type: "bullet" as const, code: "25AA", color: theme.accent }, fontSize: 14, color: theme.textLight, fontFace: bf(theme), paraSpaceAfter: 8 },
      }));
      slide.addText(rows, { x: 2, y: bulletY, w: SW - 4, h: area.h - textH - 0.5, align: "center", valign: "top", wrap: true });
    }
  }
}

// ─── CARD SHAPE HELPER (DesignSpec-aware) ───────────────────────────────────

function drawCard(slide: PptxGenJS.Slide, theme: PresentationTheme, rect: ContentArea, style: CardStyle, accentColor: string, designSpec?: DesignSpec) {
  const radius = designSpec?.cardRadius ?? 0.08;
  const shadowOpts = designSpec && designSpec.shadowBlur > 0 ? {
    shadow: {
      type: "outer" as const, blur: designSpec.shadowBlur,
      offset: Math.max(2, designSpec.shadowBlur / 4),
      angle: 270, color: "000000", opacity: designSpec.shadowOpacity,
    },
  } : {};

  switch (style) {
    case "bordered":
      slide.addShape("roundRect", {
        x: rect.x, y: rect.y, w: rect.w, h: rect.h,
        fill: { color: theme.card }, line: { color: theme.cardBorder, width: 1 },
        rectRadius: radius, ...shadowOpts,
      });
      break;
    case "filled":
      slide.addShape("roundRect", {
        x: rect.x, y: rect.y, w: rect.w, h: rect.h,
        fill: { color: theme.card }, line: { type: "none" },
        rectRadius: radius, ...shadowOpts,
      });
      break;
    case "accent-left":
      slide.addShape("roundRect", {
        x: rect.x, y: rect.y, w: rect.w, h: rect.h,
        fill: { color: theme.card }, line: { color: theme.cardBorder, width: 0.8 },
        rectRadius: radius, ...shadowOpts,
      });
      slide.addShape("roundRect", {
        x: rect.x, y: rect.y + 0.02, w: 0.12, h: rect.h - 0.04,
        fill: { color: accentColor }, line: { type: "none" }, rectRadius: radius / 2,
      });
      break;
    case "accent-top":
      slide.addShape("roundRect", {
        x: rect.x, y: rect.y, w: rect.w, h: rect.h,
        fill: { color: theme.card }, line: { color: theme.cardBorder, width: 0.8 },
        rectRadius: radius, ...shadowOpts,
      });
      // Gradient-like accent top bar
      slide.addShape("roundRect", {
        x: rect.x + 0.02, y: rect.y, w: rect.w - 0.04, h: 0.1,
        fill: { color: accentColor }, line: { type: "none" }, rectRadius: radius,
      });
      break;
    case "ghost":
    default:
      break;
  }
}
