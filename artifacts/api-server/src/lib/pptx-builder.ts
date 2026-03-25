import PptxGenJS from "pptxgenjs";
import type { SlideContent, PPTOutline, LayoutDirective } from "./deepseek.js";
import path from "path";
import fs from "fs";
import { resolvePresentationTheme, PresentationTheme as Theme } from "./ppt-theme.js";
import { getTemplate, getDefaultTemplate } from "./templates/index.js";
import { SlideLayoutConfig } from "./templates/types.js";
import { type BrandKit, applyBrandColors, applyBrandToSlide } from "./brand-kit.js";
import { autoInjectTransitions, type SlideType } from "./pptx-animation-injector.js";
import type { DesignSpec } from "./design-strategist.js";
import {
  applyCornerAccents, applySidePanel, applyGradientOverlay, applyGeometricDots,
  applyDoubleRules, applyGlowRing,
  renderTitleLeftAccent, renderTitleCenteredUnderline, renderTitleFullBar,
  renderTitleMinimal, renderTitleNumbered,
  renderFullCenter, renderSplitLayout, renderGridCards, renderHorizontalTimeline,
  renderVerticalTimeline, renderStackedRows, renderHeroBanner,
  type ContentArea,
} from "./layout-components.js";

// Persistent output directory for generated PPTX files
const OUTPUT_DIR = path.resolve(process.cwd(), "output");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ─── SLIDE CONSTANTS (LAYOUT_WIDE = 13.33" × 7.5") ──────────────────────────
const SLIDE_W = 13.33;
const SLIDE_H = 7.5;

// Removed redundant Theme type alias

export async function buildPPTX(outline: PPTOutline, templateId?: string, brandKit?: BrandKit, designSpec?: DesignSpec): Promise<string> {
  const template = getTemplate(templateId || outline.themePreset || "minimal-corporate") || getDefaultTemplate();
  let theme = resolvePresentationTheme(template.baseTheme, outline.primaryColor);
  const layout = template.layout;

  // Apply DesignSpec typography and colors to theme
  if (designSpec) {
    theme = {
      ...theme,
      titleFont: designSpec.typography.titleFont || theme.titleFont,
      bodyFont: designSpec.typography.bodyFont || theme.bodyFont,
      chart: designSpec.colorScheme.chartColors.length >= 3 ? designSpec.colorScheme.chartColors : theme.chart,
    };
    // Apply DesignSpec surface colors if not using brand kit
    if (!brandKit) {
      theme = {
        ...theme,
        card: designSpec.colorScheme.surface || theme.card,
        cardBorder: designSpec.colorScheme.surfaceBorder || theme.cardBorder,
        text: designSpec.colorScheme.text || theme.text,
        textLight: designSpec.colorScheme.textLight || theme.textLight,
        accent: designSpec.colorScheme.accent || theme.accent,
      };
    }
  }

  // Apply brand colors over theme
  if (brandKit) {
    theme = applyBrandColors(theme, brandKit);
  }

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = outline.presentationTitle;
  pptx.author = brandKit?.companyName || "AI PPT 生成平台";

  // Set brand fonts if provided
  if (brandKit?.titleFont || brandKit?.bodyFont) {
    pptx.theme = {
      headFontFace: brandKit.titleFont || "Calibri",
      bodyFontFace: brandKit.bodyFont || "Calibri",
    };
  }

  for (const slide of outline.slides) {
    const pSlide = pptx.addSlide();
    pSlide.background = { color: theme.background };

    try {
      if (template.renderBackground) {
        template.renderBackground(pSlide, theme, layout);
      } else {
        pSlide.background = { color: theme.background };
      }

      if (slide.slideType === "title") {
        if (template.renderTitleSlide) template.renderTitleSlide(pptx, pSlide, slide, theme, layout);
        else buildTitleSlide(pptx, pSlide, slide, theme, layout);
      } else if (slide.slideType === "section") {
        if (template.renderSectionSlide) template.renderSectionSlide(pSlide, slide, theme, layout);
        else buildSectionSlide(pSlide, slide, theme, layout);
      } else if (slide.slideType === "conclusion" || slide.slideType === "qa") {
        if (template.renderConclusionSlide) template.renderConclusionSlide(pSlide, slide, theme, layout);
        else buildConclusionSlide(pSlide, slide, theme, layout);
      } else {
        buildContentSlide(pptx, pSlide, slide, theme, layout, template, designSpec);
      }
    } catch (renderError) {
      // Non-fatal: render a simple error placeholder instead of crashing
      console.error(`Slide ${slide.slideNumber} render failed:`, renderError);
      pSlide.addText(`⚠ 第${slide.slideNumber}页渲染异常\n${slide.title}`, {
        x: 1, y: 2.5, w: SLIDE_W - 2, h: 2.5,
        fontSize: 20, color: theme.textLight, align: "center", valign: "middle",
        fontFace: (theme.bodyFont || "Calibri"), wrap: true,
      });
    }

    // Apply brand kit elements (logo, watermark, company name)
    if (brandKit) {
      applyBrandToSlide(pSlide, brandKit, {
        skipLogo: slide.slideType === "title",
      });
    }

    if (slide.notes) {
      pSlide.addNotes(slide.notes);
    }
  }

  const fileName = `ppt_${Date.now()}.pptx`;
  const filePath = path.join(OUTPUT_DIR, fileName);

  await pptx.writeFile({ fileName: filePath });

  // Post-process: inject slide transitions (entry animations disabled — see injector notes)
  try {
    await autoInjectTransitions(
      filePath,
      outline.slides.map(s => ({
        slideType: s.slideType as SlideType,
        visualType: s.visualType,
      })),
      false, // entry animations disabled — causes PPTX corruption
    );
  } catch {
    // Non-fatal: if injection fails, the PPTX is still valid without transitions
  }

  return filePath;
}

// ─── SHARED HELPERS ───────────────────────────────────────────────────────────

function addSlideNumber(slide: PptxGenJS.Slide, number: number, theme: Theme, layout: SlideLayoutConfig) {
  const { pad: PAD, contentW: CW, headerH: HEADER_H, contentY: CONTENT_Y, footerY: FOOTER_Y } = layout;

  slide.addText(`${number}`, {
    x: SLIDE_W - 1.2, y: FOOTER_Y + 0.15, w: 0.8, h: 0.3,
    fontSize: 10, color: theme.textLight, align: "right", fontFace: theme.bodyFont || "Calibri",
  });
  slide.addText("AI PPT 生成平台  ·  Powered by DeepSeek", {
    x: PAD, y: FOOTER_Y + 0.15, w: 4, h: 0.3,
    fontSize: 9, color: theme.textLight, align: "left", fontFace: theme.bodyFont || "Calibri",
    transparency: 40,
  });
}

function addHeaderBar(slide: PptxGenJS.Slide, title: string, theme: Theme, layout: SlideLayoutConfig) {
  const { pad: PAD, contentW: CW, headerH: HEADER_H, contentY: CONTENT_Y, footerY: FOOTER_Y } = layout;

  slide.addShape("roundRect", {
    x: PAD, y: 0.35, w: 0.08, h: 0.45,
    fill: { color: theme.primary }, rectRadius: 0.04,
  });
  slide.addText(title, {
    x: PAD + 0.25, y: 0.25, w: CW - 0.25, h: 0.65,
    fontSize: 28, bold: true, color: theme.text,
    align: "left", valign: "middle", fontFace: theme.titleFont || "Calibri",
  });
}

function addFooterBar(slide: PptxGenJS.Slide, theme: Theme, layout: SlideLayoutConfig) {
  const { pad: PAD, contentW: CW, headerH: HEADER_H, contentY: CONTENT_Y, footerY: FOOTER_Y } = layout;

  slide.addShape("line", {
    x: PAD, y: FOOTER_Y, w: CW, h: 0,
    line: { color: theme.cardBorder, width: 1 },
  });
}

// ─── TITLE SLIDE ──────────────────────────────────────────────────────────────

function buildTitleSlide(pptx: PptxGenJS, slide: PptxGenJS.Slide, content: SlideContent, theme: Theme, layout: SlideLayoutConfig) {
  const { pad: PAD, contentW: CW, headerH: HEADER_H, contentY: CONTENT_Y, footerY: FOOTER_Y } = layout;

  // Delicate background accent
  slide.addShape("ellipse", {
    x: SLIDE_W - 4, y: -2, w: 6, h: 6,
    fill: { color: theme.primary, transparency: 94 }, line: { type: "none" },
  });
  slide.addShape("ellipse", {
    x: -2, y: SLIDE_H - 4, w: 6, h: 6,
    fill: { color: theme.accent, transparency: 96 }, line: { type: "none" },
  });

  const textW = CW * 0.65;
  const startX = PAD;

  // Title
  slide.addText(content.title, {
    x: startX, y: 2.2, w: textW, h: 2.5,
    fontSize: 44, bold: true, color: theme.text,
    align: "left", valign: "bottom", wrap: true, fontFace: (theme.bodyFont || "Calibri"),
    lineSpacingMultiple: 1.15,
  });

  // Highlight line
  slide.addShape("line", {
    x: startX, y: 4.9, w: textW * 0.3, h: 0,
    line: { color: theme.primary, width: 3 },
  });

  if (content.keyPoints?.length > 0) {
    slide.addText(content.keyPoints[0], {
      x: startX, y: 5.2, w: textW, h: 1.0,
      fontSize: 16, color: theme.textLight,
      align: "left", valign: "top", wrap: true, fontFace: (theme.bodyFont || "Calibri"),
      lineSpacingMultiple: 1.2,
    });
  }

  // Branding
  slide.addText("AI PPT 生成平台  ·  Powered by DeepSeek", {
    x: startX, y: FOOTER_Y + 0.1, w: 4, h: 0.4,
    fontSize: 10, color: theme.textLight, align: "left", fontFace: (theme.bodyFont || "Calibri"),
    transparency: 30,
  });

  addDecorativeIllustration(slide, theme, startX + textW + 0.5, 1.5, CW - textW - 0.5, SLIDE_H - 3.0);
}

// ─── SECTION SLIDE ────────────────────────────────────────────────────────────

function buildSectionSlide(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme, layout: SlideLayoutConfig) {
  const { pad: PAD, contentW: CW, headerH: HEADER_H, contentY: CONTENT_Y, footerY: FOOTER_Y } = layout;

  slide.addShape("rect", {
    x: 0, y: "25%", w: "100%", h: "50%",
    fill: { color: theme.primary, transparency: 95 }, line: { type: "none" },
  });
  slide.addShape("line", {
    x: 0, y: "25%", w: "100%", h: 0,
    line: { color: theme.primary, width: 1 },
  });
  slide.addShape("line", {
    x: 0, y: "75%", w: "100%", h: 0,
    line: { color: theme.primary, width: 1 },
  });

  slide.addText(`PART ${content.slideNumber}`, {
    x: PAD, y: 2.2, w: CW, h: 0.6,
    fontSize: 16, bold: true, color: theme.accent,
    align: "center", valign: "bottom", fontFace: (theme.bodyFont || "Calibri"), charSpacing: 2,
  });

  slide.addText(content.title, {
    x: PAD, y: 2.8, w: CW, h: 1.2,
    fontSize: 40, bold: true, color: theme.text,
    align: "center", valign: "middle", wrap: true, fontFace: (theme.bodyFont || "Calibri"),
  });

  if (content.keyPoints?.length > 0) {
    slide.addText(content.keyPoints[0], {
      x: PAD, y: 4.1, w: CW, h: 1.0,
      fontSize: 18, color: theme.textLight,
      align: "center", valign: "top", wrap: true, fontFace: (theme.bodyFont || "Calibri"),
    });
  }
}

// ─── CONTENT SLIDE ROUTER ─────────────────────────────────────────────────────

function buildContentSlide(pptx: PptxGenJS, slide: PptxGenJS.Slide, content: SlideContent, theme: Theme, layout: SlideLayoutConfig, template?: import("./templates/types.js").PPTXTemplate, designSpec?: DesignSpec) {
  const vt = content.visualType;

  // 1. Magazine Layouts skip standard headers/footers
  if (vt === "hero") {
    return template?.renderHeroSlide ? template.renderHeroSlide(slide, content, theme, layout) : buildHeroSlide(slide, content, theme, layout);
  }
  if (vt === "quote") {
    return template?.renderQuoteSlide ? template.renderQuoteSlide(slide, content, theme, layout) : buildQuoteSlide(slide, content, theme, layout);
  }

  // 2. AI-driven Layout Directive (highest priority for non-magazine slides)
  if (content.layoutDirective) {
    return resolveLayoutDirective(slide, content, theme, layout, designSpec);
  }

  // 3. Static template overrides
  const { pad: PAD, contentW: CW, headerH: HEADER_H, contentY: CONTENT_Y, footerY: FOOTER_Y } = layout;

  if (template?.renderContentSlideHeader) template.renderContentSlideHeader(slide, content, theme, layout);
  else addHeaderBar(slide, content.title, theme, layout);
  
  if (template?.renderContentSlideFooter) template.renderContentSlideFooter(slide, content, theme, layout);
  else addFooterBar(slide, theme, layout);
  
  addSlideNumber(slide, content.slideNumber, theme, layout);

  if (vt === "chart" && content.chartData) {
    template?.renderChartSlide ? template.renderChartSlide(pptx, slide, content, theme, layout) : buildChartSlide(pptx, slide, content, theme, layout);
  } else if (vt === "stats" && content.stats?.length) {
    template?.renderStatsSlide ? template.renderStatsSlide(slide, content, theme, layout) : buildStatsSlide(slide, content, theme, layout);
  } else if (vt === "process" && content.processSteps?.length) {
    template?.renderProcessSlide ? template.renderProcessSlide(slide, content, theme, layout) : buildProcessSlide(slide, content, theme, layout);
  } else if (vt === "comparison" && content.comparison?.length) {
    template?.renderComparisonSlide ? template.renderComparisonSlide(slide, content, theme, layout) : buildComparisonSlide(slide, content, theme, layout);
  } else if (vt === "icon-grid" && content.icons?.length) {
    template?.renderIconGridSlide ? template.renderIconGridSlide(slide, content, theme, layout) : buildIconGridSlide(slide, content, theme, layout);
  } else {
    template?.renderTextSlide ? template.renderTextSlide(slide, content, theme, layout) : buildTextSlide(slide, content, theme, layout);
  }
}

// ─── LAYOUT RESOLVER ──────────────────────────────────────────────────────────
// Composes decoration, title, and content components from AI-generated directive

function resolveLayoutDirective(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme, layout: SlideLayoutConfig, designSpec?: DesignSpec) {
  const dir = content.layoutDirective!;
  const { pad: PAD, contentW: CW } = layout;

  // Step 1: Apply decoration
  switch (dir.decoration) {
    case "corner-accents":    applyCornerAccents(slide, theme); break;
    case "side-panel":        applySidePanel(slide, theme); break;
    case "gradient-overlay":  applyGradientOverlay(slide, theme); break;
    case "geometric-dots":    applyGeometricDots(slide, theme); break;
    case "double-rules":      applyDoubleRules(slide, theme); break;
    case "glow-ring":         applyGlowRing(slide, theme); break;
    case "none":              break;
    default:                  break;
  }

  // Step 2: Render title and get content start Y
  let contentY: number;
  switch (dir.titleStyle) {
    case "left-accent":        contentY = renderTitleLeftAccent(slide, content.title, theme, PAD, CW); break;
    case "centered-underline":  contentY = renderTitleCenteredUnderline(slide, content.title, theme, PAD, CW); break;
    case "full-bar":           contentY = renderTitleFullBar(slide, content.title, theme, PAD, CW); break;
    case "numbered":           contentY = renderTitleNumbered(slide, content.title, theme, PAD, CW, content.slideNumber); break;
    case "minimal":
    default:                   contentY = renderTitleMinimal(slide, content.title, theme, PAD, CW); break;
  }

  // Step 3: Add slide number and footer
  addSlideNumber(slide, content.slideNumber, theme, layout);
  addFooterBar(slide, theme, layout);

  // Step 4: Compute content area
  const footerY = layout.footerY;
  const area: ContentArea = { x: PAD, y: contentY, w: CW, h: footerY - contentY };
  const cs = dir.cardStyle ?? "ghost";

  // Step 5: Render content layout (pass designSpec for enhanced rendering)
  switch (dir.contentLayout) {
    case "full-center":          renderFullCenter(slide, content, theme, area, cs); break;
    case "split-left":           renderSplitLayout(slide, content, theme, area, "left", cs); break;
    case "split-right":          renderSplitLayout(slide, content, theme, area, "right", cs); break;
    case "grid-cards":           renderGridCards(slide, content, theme, area, cs === "ghost" ? "accent-top" : cs, designSpec); break;
    case "timeline-horizontal":  renderHorizontalTimeline(slide, content, theme, area); break;
    case "timeline-vertical":    renderVerticalTimeline(slide, content, theme, area); break;
    case "stacked-rows":         renderStackedRows(slide, content, theme, area, cs === "ghost" ? "accent-left" : cs, designSpec); break;
    case "hero-banner":          renderHeroBanner(slide, content, theme, area); break;
    case "top-bottom":
    default:                     renderStackedRows(slide, content, theme, area, cs, designSpec); break;
  }
}

// ─── CHART SLIDE ──────────────────────────────────────────────────────────────

function buildChartSlide(pptx: PptxGenJS, slide: PptxGenJS.Slide, content: SlideContent, theme: Theme, layout: SlideLayoutConfig) {
  const { pad: PAD, contentW: CW, headerH: HEADER_H, contentY: CONTENT_Y, footerY: FOOTER_Y } = layout;

  const chart = content.chartData!;
  const chartColors = theme.chart;
  const isFullChart = content.keyPoints.length <= 2;

  if (!isFullChart) {
    const bulletW = 4.8;
    const bulletRows = content.keyPoints.map((pt, i) => ({
      text: pt,
      options: {
        bullet: { type: "bullet" as const, code: "25A0", color: chartColors[i % chartColors.length] },
        fontSize: 13, color: theme.text, fontFace: (theme.bodyFont || "Calibri"), paraSpaceAfter: 14,
      },
    }));
    slide.addText(bulletRows, {
      x: PAD, y: CONTENT_Y, w: bulletW, h: FOOTER_Y - CONTENT_Y,
      align: "left", valign: "top", wrap: true,
    });
  }

  const chartX = isFullChart ? PAD : 5.5;
  const chartW = isFullChart ? CW : SLIDE_W - 5.5 - PAD;
  const chartH = FOOTER_Y - CONTENT_Y;

  const seriesData = chart.series.map((s) => ({
    name: s.name, labels: chart.labels, values: s.values,
  }));

  const chartOptions: PptxGenJS.IChartOpts = {
    x: chartX, y: CONTENT_Y, w: chartW, h: chartH,
    chartColors: chartColors.slice(0, seriesData.length),
    showLegend: chart.series.length > 1,
    legendPos: "b",
    showTitle: true,
    title: chart.title,
    titleFontSize: 13,
    titleColor: theme.text,
    dataLabelFontSize: 10,
    valAxisLabelFontSize: 10,
    catAxisLabelFontSize: 10,
  };

  let chartType: "bar" | "pie" | "line" | "doughnut" | "area" | "scatter" | "bar-stacked";
  switch (chart.chartType) {
    case "pie": chartType = "pie"; break;
    case "donut": chartType = "doughnut"; break;
    case "line": chartType = "line"; break;
    case "area": chartType = "area"; break;
    case "scatter": chartType = "scatter"; break;
    case "stacked-bar": chartType = "bar-stacked"; break;
    default: chartType = "bar";
  }

  if (chartType === "pie" || chartType === "doughnut") {
    (chartOptions as PptxGenJS.IChartOpts).showLabel = true;
    (chartOptions as PptxGenJS.IChartOpts).showPercent = true;
    (chartOptions as PptxGenJS.IChartOpts).dataLabelFontSize = 11;
    (chartOptions as PptxGenJS.IChartOpts).showLegend = true;
    slide.addChart(chartType === "pie" ? pptx.ChartType.pie : pptx.ChartType.doughnut, seriesData, chartOptions);
  } else if (chartType === "line" || chartType === "area") {
    (chartOptions as PptxGenJS.IChartOpts).lineDataSymbol = "circle";
    (chartOptions as PptxGenJS.IChartOpts).lineDataSymbolSize = 7;
    slide.addChart(chartType === "line" ? pptx.ChartType.line : pptx.ChartType.area, seriesData, chartOptions);
  } else if (chartType === "scatter") {
    (chartOptions as PptxGenJS.IChartOpts).lineDataSymbol = "circle";
    (chartOptions as PptxGenJS.IChartOpts).lineDataSymbolSize = 8;
    (chartOptions as PptxGenJS.IChartOpts).showLegend = chart.series.length > 1;
    slide.addChart(pptx.ChartType.scatter, seriesData, chartOptions);
  } else if (chartType === "bar-stacked") {
    (chartOptions as PptxGenJS.IChartOpts).showValue = false;
    (chartOptions as PptxGenJS.IChartOpts).barGrouping = "stacked";
    slide.addChart(pptx.ChartType.bar, seriesData, chartOptions);
  } else {
    (chartOptions as PptxGenJS.IChartOpts).showValue = true;
    (chartOptions as PptxGenJS.IChartOpts).dataLabelPosition = "outEnd";
    slide.addChart(pptx.ChartType.bar, seriesData, chartOptions);
  }
}

// ─── STATS SLIDE ──────────────────────────────────────────────────────────────

function buildStatsSlide(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme, layout: SlideLayoutConfig) {
  const { pad: PAD, contentW: CW, headerH: HEADER_H, contentY: CONTENT_Y, footerY: FOOTER_Y } = layout;

  const stats = content.stats!.slice(0, 4);
  const count = stats.length;

  // Card dimensions sized to fill LAYOUT_WIDE content area
  const cardW = count === 4 ? 2.9 : count === 3 ? 3.9 : 6.0;
  const gap = count === 4 ? 0.27 : count === 3 ? 0.35 : 0.4;
  const totalW = cardW * count + gap * (count - 1);
  const startX = (SLIDE_W - totalW) / 2;

  const cardY = CONTENT_Y + 0.15;
  const cardH = FOOTER_Y - cardY - 0.1;

  stats.forEach((stat, i) => {
    const x = startX + i * (cardW + gap);

    slide.addShape("roundRect", {
      x, y: cardY, w: cardW, h: cardH,
      fill: { color: theme.card },
      line: { color: theme.cardBorder, width: 1.2 },
      shadow: { type: "outer", blur: 12, offset: 4, angle: 270, color: "000000", opacity: 0.06 },
      rectRadius: 0.08,
    });

    // Top accent bar
    slide.addShape("roundRect", {
      x, y: cardY, w: cardW, h: 0.22,
      fill: { color: theme.chart[i % theme.chart.length] }, line: { type: "none" },
      rectRadius: 0.08,
    });

    // Big metric value
    slide.addText(stat.value, {
      x: x + 0.15, y: cardY + 0.35, w: cardW - 0.3, h: 1.55,
      fontSize: count === 4 ? 36 : 42, bold: true,
      color: theme.chart[i % theme.chart.length],
      align: "center", valign: "middle", fontFace: (theme.bodyFont || "Calibri"),
    });

    // Trend badge
    if (stat.trend && stat.trend !== "neutral" && stat.trendValue) {
      const trendColor = stat.trend === "up" ? "10B981" : "EF4444";
      const trendIcon = stat.trend === "up" ? "▲" : "▼";
      const badgeX = x + (cardW - 1.5) / 2;
      slide.addShape("roundRect", {
        x: badgeX, y: cardY + 1.95, w: 1.5, h: 0.36,
        fill: { color: trendColor, transparency: 85 }, line: { type: "none" }, rectRadius: 0.18,
      });
      slide.addText(`${trendIcon} ${stat.trendValue}`, {
        x: badgeX, y: cardY + 1.95, w: 1.5, h: 0.36,
        fontSize: 10, bold: true, color: trendColor,
        align: "center", valign: "middle", fontFace: (theme.bodyFont || "Calibri"),
      });
    }

    // Label
    slide.addText(stat.label, {
      x: x + 0.1, y: cardY + 2.45, w: cardW - 0.2, h: 0.6,
      fontSize: 13, bold: true, color: theme.text,
      align: "center", valign: "middle", fontFace: (theme.bodyFont || "Calibri"),
    });

    // Description
    if (stat.description) {
      slide.addText(stat.description, {
        x: x + 0.1, y: cardY + 3.1, w: cardW - 0.2, h: cardH - 3.25,
        fontSize: 10.5, color: theme.textLight,
        align: "center", valign: "top", wrap: true, fontFace: (theme.bodyFont || "Calibri"),
      });
    }
  });
}

// ─── PROCESS SLIDE ────────────────────────────────────────────────────────────

function buildProcessSlide(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme, layout: SlideLayoutConfig) {
  const { pad: PAD, contentW: CW, headerH: HEADER_H, contentY: CONTENT_Y, footerY: FOOTER_Y } = layout;

  const steps = content.processSteps!.slice(0, 5);
  const count = steps.length;
  const nodeW = 1.9;   // width per step slot
  const arrowW = 0.7;  // connector width
  const totalW = count * nodeW + (count - 1) * arrowW;
  const startX = (SLIDE_W - totalW) / 2; // always >= 0 for LAYOUT_WIDE
  const nodeY = CONTENT_Y + 0.4;

  steps.forEach((step, i) => {
    const x = startX + i * (nodeW + arrowW);
    const col = theme.chart[i % theme.chart.length];

    // Connector arrow (horizontal bar + arrowhead)
    if (i < count - 1) {
      const arrowY = nodeY + 0.9; // vertical center of circle
      slide.addShape("rect", {
        x: x + nodeW, y: arrowY - 0.03, w: arrowW, h: 0.06,
        fill: { color: col, transparency: 40 }, line: { type: "none" },
      });
      // Arrowhead triangle (small rect)
      slide.addShape("rect", {
        x: x + nodeW + arrowW - 0.18, y: arrowY - 0.12, w: 0.18, h: 0.24,
        fill: { color: col, transparency: 40 }, line: { type: "none" },
      });
    }

    // Step circle
    const circleD = 1.8;
    const circleX = x + (nodeW - circleD) / 2;
    slide.addShape("ellipse", {
      x: circleX, y: nodeY, w: circleD, h: circleD,
      fill: { color: col }, line: { type: "none" },
    });

    // Step number
    slide.addText(`${step.stepNumber}`, {
      x: circleX, y: nodeY, w: circleD, h: circleD,
      fontSize: 30, bold: true, color: "FFFFFF",
      align: "center", valign: "middle", fontFace: (theme.bodyFont || "Calibri"),
    });

    // Step title below circle
    slide.addText(step.title, {
      x: x - 0.1, y: nodeY + circleD + 0.15, w: nodeW + 0.2, h: 0.6,
      fontSize: 11.5, bold: true, color: theme.text,
      align: "center", valign: "top", wrap: true, fontFace: (theme.bodyFont || "Calibri"),
    });

    // Description card
    const descY = nodeY + circleD + 0.85;
    const descH = FOOTER_Y - descY - 0.1;
    slide.addShape("roundRect", {
      x: x - 0.05, y: descY, w: nodeW + 0.1, h: descH,
      fill: { color: theme.card }, line: { color: theme.cardBorder, width: 1 }, rectRadius: 0.08,
    });
    slide.addText(step.description, {
      x: x + 0.05, y: descY + 0.12, w: nodeW - 0.1, h: descH - 0.2,
      fontSize: 10, color: theme.textLight,
      align: "center", valign: "top", wrap: true, fontFace: (theme.bodyFont || "Calibri"),
    });
  });
}

// ─── COMPARISON SLIDE ─────────────────────────────────────────────────────────

function buildComparisonSlide(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme, layout: SlideLayoutConfig) {
  const { pad: PAD, contentW: CW, headerH: HEADER_H, contentY: CONTENT_Y, footerY: FOOTER_Y } = layout;

  const cols = content.comparison!.slice(0, 3);
  const colCount = cols.length;
  const gap = 0.22;
  const colW = colCount === 3 ? (CW - gap * 2) / 3
             : colCount === 2 ? (CW - gap) / 2
             : CW;
  const totalW = colW * colCount + gap * (colCount - 1);
  const startX = (SLIDE_W - totalW) / 2;
  const rowH = 0.65;
  const headerH = 0.78;
  const tableY = CONTENT_Y + 0.1;

  cols.forEach((col, ci) => {
    const x = startX + ci * (colW + gap);
    const colColor = theme.chart[ci % theme.chart.length];

    // Column header
    slide.addShape("rect", {
      x, y: tableY, w: colW, h: headerH,
      fill: { color: colColor }, line: { type: "none" },
    });
    slide.addText(col.header, {
      x, y: tableY, w: colW, h: headerH,
      fontSize: 14, bold: true, color: "FFFFFF",
      align: "center", valign: "middle", fontFace: (theme.bodyFont || "Calibri"),
    });

    // Rows
    const maxRows = Math.floor((FOOTER_Y - tableY - headerH) / rowH);
    col.rows.slice(0, maxRows).forEach((row, ri) => {
      const rowY = tableY + headerH + ri * rowH;
      slide.addShape("rect", {
        x, y: rowY, w: colW, h: rowH,
        fill: { color: ri % 2 === 0 ? theme.card : theme.background },
        line: { color: theme.cardBorder, width: 0.8 },
      });
      slide.addText(row, {
        x: x + 0.12, y: rowY, w: colW - 0.24, h: rowH,
        fontSize: 11, color: theme.text,
        align: "center", valign: "middle", wrap: true, fontFace: (theme.bodyFont || "Calibri"),
      });
    });
  });
}

// ─── ICON GRID SLIDE ──────────────────────────────────────────────────────────

function buildIconGridSlide(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme, layout: SlideLayoutConfig) {
  const { pad: PAD, contentW: CW, headerH: HEADER_H, contentY: CONTENT_Y, footerY: FOOTER_Y } = layout;

  const icons = content.icons!.slice(0, 6);
  const count = icons.length;
  const perRow = count <= 3 ? count : Math.ceil(count / 2);
  const rows = Math.ceil(count / perRow);
  const gapX = 0.3;
  const gapY = 0.3;

  const cardW = (CW - gapX * (perRow - 1)) / perRow;
  const totalH = FOOTER_Y - CONTENT_Y - 0.1;
  const cardH = (totalH - gapY * (rows - 1)) / rows;
  const totalW = cardW * perRow + gapX * (perRow - 1);
  const startX = (SLIDE_W - totalW) / 2;
  const startY = CONTENT_Y + 0.1;

  icons.forEach((icon, i) => {
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    const x = startX + col * (cardW + gapX);
    const y = startY + row * (cardH + gapY);
    const colColor = theme.chart[i % theme.chart.length];

    // Card
    slide.addShape("roundRect", {
      x, y, w: cardW, h: cardH,
      fill: { color: theme.card },
      line: { color: colColor, width: 1.5 },
      shadow: { type: "outer", blur: 10, offset: 3, angle: 270, color: "000000", opacity: 0.05 },
      rectRadius: 0.08,
    });
    // Top accent
    slide.addShape("roundRect", {
      x, y, w: cardW, h: 0.18,
      fill: { color: colColor }, line: { type: "none" },
      rectRadius: 0.08,
    });

    // Icon circle
    const circleSize = rows === 1 ? 1.2 : 0.95;
    const circleX = x + (cardW - circleSize) / 2;
    const circleY = y + 0.32;
    slide.addShape("ellipse", {
      x: circleX, y: circleY, w: circleSize, h: circleSize,
      fill: { color: colColor, transparency: 85 }, line: { type: "none" },
    });
    slide.addText(icon.icon, {
      x: circleX, y: circleY, w: circleSize, h: circleSize,
      fontSize: rows === 1 ? 30 : 24,
      align: "center", valign: "middle", fontFace: "Segoe UI Emoji",
    });

    // Label
    const labelY = circleY + circleSize + 0.12;
    slide.addText(icon.label, {
      x: x + 0.1, y: labelY, w: cardW - 0.2, h: rows === 1 ? 0.55 : 0.45,
      fontSize: rows === 1 ? 14 : 12, bold: true, color: theme.text,
      align: "center", valign: "top", fontFace: (theme.bodyFont || "Calibri"),
    });

    // Description
    const descY = labelY + (rows === 1 ? 0.58 : 0.48);
    slide.addText(icon.description, {
      x: x + 0.12, y: descY, w: cardW - 0.24, h: cardH - (descY - y) - 0.1,
      fontSize: rows === 1 ? 11 : 10, color: theme.textLight,
      align: "center", valign: "top", wrap: true, fontFace: (theme.bodyFont || "Calibri"),
    });
  });
}

// ─── TEXT SLIDE ───────────────────────────────────────────────────────────────

function buildTextSlide(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme, layout: SlideLayoutConfig) {
  const { pad: PAD, contentW: CW, headerH: HEADER_H, contentY: CONTENT_Y, footerY: FOOTER_Y } = layout;

  if (content.keyPoints.length <= 3) {
    // Card-style layout: vertical accent bar + content cards
    slide.addShape("roundRect", {
      x: PAD, y: CONTENT_Y - 0.05, w: 0.16, h: FOOTER_Y - CONTENT_Y + 0.05,
      fill: { color: theme.accent }, line: { type: "none" }, rectRadius: 0.05,
    });

    const cardH = (FOOTER_Y - CONTENT_Y - 0.15 - 0.15 * (content.keyPoints.length - 1)) / content.keyPoints.length;
    const cardStartX = PAD + 0.3;
    const cardW = CW - 0.3;

    content.keyPoints.forEach((pt, i) => {
      const cardY = CONTENT_Y + i * (cardH + 0.15);
      slide.addShape("roundRect", {
        x: cardStartX, y: cardY, w: cardW, h: cardH,
        fill: { color: theme.card },
        line: { color: theme.cardBorder, width: 1 },
        shadow: { type: "outer", blur: 8, offset: 2, angle: 270, color: "000000", opacity: 0.04 },
        rectRadius: 0.1,
      });

      // Number badge
      const badgeSize = 0.85;
      slide.addShape("ellipse", {
        x: cardStartX + 0.15, y: cardY + (cardH - badgeSize) / 2, w: badgeSize, h: badgeSize,
        fill: { color: theme.chart[i % theme.chart.length] }, line: { type: "none" },
      });
      slide.addText(`${i + 1}`, {
        x: PAD + 0.1, y: cardY + (cardH - badgeSize) / 2, w: badgeSize, h: badgeSize,
        fontSize: 18, bold: true, color: "FFFFFF",
        align: "center", valign: "middle", fontFace: (theme.bodyFont || "Calibri"),
      });

      // Card text
      slide.addText(pt, {
        x: cardStartX + 1.2, y: cardY + 0.1, w: cardW - 1.4, h: cardH - 0.2,
        fontSize: 16, color: theme.text,
        align: "left", valign: "middle", wrap: true, fontFace: (theme.bodyFont || "Calibri"),
        lineSpacingMultiple: 1.2,
      });
    });
  } else {
    // Bullet list layout
    const bulletRows = content.keyPoints.map((pt, i) => ({
      text: pt,
      options: {
        bullet: { type: "bullet" as const, code: "25CF", color: theme.chart[i % theme.chart.length] },
        fontSize: 16, color: theme.text, fontFace: (theme.bodyFont || "Calibri"),
        paraSpaceAfter: 18, indentLevel: 0, 
      },
    }));
    slide.addText(bulletRows, {
      x: PAD, y: CONTENT_Y, w: CW - 0.5, h: FOOTER_Y - CONTENT_Y,
      align: "left", valign: "top", wrap: true,
    });
    addDecorativeStrip(slide, theme, layout);
  }
}

// ─── CONCLUSION SLIDE ─────────────────────────────────────────────────────────

function buildConclusionSlide(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme, layout: SlideLayoutConfig) {
  const { pad: PAD, contentW: CW, headerH: HEADER_H, contentY: CONTENT_Y, footerY: FOOTER_Y } = layout;

  // Full background
  slide.addShape("rect", {
    x: 0, y: 0, w: "100%", h: "100%",
    fill: { color: theme.background }, line: { type: "none" },
  });
  // Central card
  slide.addShape("roundRect", {
    x: "15%", y: "20%", w: "70%", h: "60%",
    fill: { color: theme.card }, line: { color: theme.cardBorder, width: 1 },
    rectRadius: 0.1,
    shadow: { type: "outer", blur: 15, offset: 5, angle: 270, color: "000000", opacity: 0.05 },
  });
  // Big icon
  slide.addText("✨", {
    x: "15%", y: "30%", w: "70%", h: 1.0,
    fontSize: 48, align: "center", fontFace: "Segoe UI Emoji",
  });
  // Decorative circles
  slide.addShape("ellipse", {
    x: -1, y: -1, w: 4, h: 4,
    fill: { color: theme.secondary, transparency: 88 }, line: { type: "none" },
  });
  slide.addShape("ellipse", {
    x: SLIDE_W - 3, y: SLIDE_H - 3, w: 4, h: 4,
    fill: { color: theme.accent, transparency: 85 }, line: { type: "none" },
  });

  // Center content box
  const boxX = PAD + 0.3;
  const boxW = SLIDE_W - (boxX * 2);
  const boxY = 0.7;
  const boxH = SLIDE_H - 1.2;

  slide.addShape("rect", {
    x: boxX, y: boxY, w: boxW, h: boxH,
    fill: { color: "FFFFFF", transparency: 93 }, line: { type: "none" },
  });
  slide.addShape("rect", {
    x: boxX, y: boxY, w: boxW, h: 0.18,
    fill: { color: theme.accent }, line: { type: "none" },
  });

  slide.addText(content.title, {
    x: boxX + 0.3, y: boxY + 0.3, w: boxW - 0.6, h: 1.5,
    fontSize: 30, bold: true, color: "FFFFFF",
    align: "center", valign: "middle", fontFace: (theme.bodyFont || "Calibri"),
  });

  // Divider
  const divW = 5.0;
  slide.addShape("rect", {
    x: (SLIDE_W - divW) / 2, y: boxY + 1.9, w: divW, h: 0.05,
    fill: { color: theme.accent, transparency: 50 }, line: { type: "none" },
  });

  if (content.keyPoints?.length > 0) {
    const bulletRows = content.keyPoints.map((pt) => ({
      text: pt,
      options: {
        bullet: { type: "bullet" as const, code: "25CB", color: theme.accent },
        fontSize: 13.5, color: "FFFFFF", fontFace: (theme.bodyFont || "Calibri"), paraSpaceAfter: 12,
      },
    }));
    slide.addText(bulletRows, {
      x: boxX + 0.5, y: boxY + 2.1, w: boxW - 1.0, h: boxH - 2.4,
      align: "center", valign: "top", wrap: true,
    });
  }
}

// ─── MAGAZINE LAYOUTS ─────────────────────────────────────────────────────────

function buildHeroSlide(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme, layout: SlideLayoutConfig) {
  const leftW = SLIDE_W * 0.42;
  
  // Left panel with solid color
  slide.addShape("rect", {
    x: 0, y: 0, w: leftW, h: SLIDE_H,
    fill: { color: theme.primary }, line: { type: "none" }
  });

  // Decorative shapes on left panel (geometric illustration)
  slide.addShape("ellipse", {
    x: leftW / 2 - 2, y: SLIDE_H / 2 - 2, w: 4, h: 4,
    fill: { color: theme.accent, transparency: 70 }, line: { type: "none" },
  });
  slide.addShape("ellipse", {
    x: leftW / 2 - 1.2, y: SLIDE_H / 2 - 1.2, w: 2.4, h: 2.4,
    fill: { color: "FFFFFF", transparency: 85 }, line: { type: "none" },
  });
  // Small accent dots
  [
    { x: 0.8, y: 1.2, r: 0.25 }, { x: leftW - 1.5, y: 1.5, r: 0.18 },
    { x: 1.2, y: SLIDE_H - 1.8, r: 0.2 }, { x: leftW - 1, y: SLIDE_H - 1.2, r: 0.15 },
  ].forEach(d => {
    slide.addShape("ellipse", {
      x: d.x, y: d.y, w: d.r * 2, h: d.r * 2,
      fill: { color: "FFFFFF", transparency: 75 }, line: { type: "none" },
    });
  });

  const rightX = leftW + 1.0;
  const rightW = SLIDE_W - leftW - 1.8;

  slide.addText(content.title, {
    x: rightX, y: 1.8, w: rightW, h: 2.5,
    fontSize: 44, bold: true, color: theme.text,
    align: "left", valign: "bottom", wrap: true, fontFace: (theme.bodyFont || "Calibri"),
    lineSpacingMultiple: 1.1,
  });

  // Accent line
  slide.addShape("rect", {
    x: rightX, y: 4.5, w: 2.5, h: 0.06,
    fill: { color: theme.primary }, line: { type: "none" },
  });

  if (content.keyPoints && content.keyPoints.length > 0) {
    slide.addText(content.keyPoints[0], {
      x: rightX, y: 4.8, w: rightW, h: 2.0,
      fontSize: 18, color: theme.textLight,
      align: "left", valign: "top", wrap: true, fontFace: (theme.bodyFont || "Calibri"), lineSpacingMultiple: 1.3,
    });
  }
}

function buildQuoteSlide(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme, layout: SlideLayoutConfig) {
  // Full dark background
  slide.addShape("rect", {
    x: 0, y: 0, w: SLIDE_W, h: SLIDE_H,
    fill: { color: theme.card }, line: { type: "none" },
  });

  // Giant quotation mark shapes (top-left and bottom-right)
  // Top-left opening quote — built from two circles
  slide.addShape("ellipse", {
    x: 0.5, y: 0.5, w: 1.8, h: 1.8,
    fill: { color: theme.primary, transparency: 88 }, line: { type: "none" },
  });
  slide.addShape("ellipse", {
    x: 2.6, y: 0.5, w: 1.8, h: 1.8,
    fill: { color: theme.primary, transparency: 88 }, line: { type: "none" },
  });

  // Bottom-right closing quote
  slide.addShape("ellipse", {
    x: SLIDE_W - 4.9, y: SLIDE_H - 2.3, w: 1.8, h: 1.8,
    fill: { color: theme.accent, transparency: 90 }, line: { type: "none" },
  });
  slide.addShape("ellipse", {
    x: SLIDE_W - 2.8, y: SLIDE_H - 2.3, w: 1.8, h: 1.8,
    fill: { color: theme.accent, transparency: 90 }, line: { type: "none" },
  });

  // Giant quote text  
  slide.addText(`"${content.title}"`, {
    x: 1.5, y: 2.0, w: SLIDE_W - 3.0, h: 3.0,
    fontSize: 44, bold: true, color: theme.text, italic: true,
    align: "center", valign: "middle", wrap: true, fontFace: (theme.bodyFont || "Calibri"),
    lineSpacingMultiple: 1.2,
  });

  if (content.keyPoints && content.keyPoints.length > 0) {
    slide.addShape("rect", {
      x: (SLIDE_W - 2) / 2, y: 5.3, w: 2, h: 0.04,
      fill: { color: theme.primary }, line: { type: "none" },
    });
    slide.addText(`— ${content.keyPoints[0]}`, {
      x: 2, y: 5.6, w: SLIDE_W - 4, h: 0.8,
      fontSize: 16, color: theme.textLight,
      align: "center", valign: "top", fontFace: (theme.bodyFont || "Calibri"),
    });
  }
}

// ─── DECORATIVE HELPERS ───────────────────────────────────────────────────────

function addDecorativeIllustration(
  slide: PptxGenJS.Slide, theme: Theme,
  x: number, y: number, w: number, h: number
) {
  const cx = x + w / 2;
  const cy = y + h / 2;

  const nodes = [
    { dx: 0, dy: 0, r: 0.75, t: 0 },
    { dx: -1.3, dy: -1.1, r: 0.45, t: 60 },
    { dx: 1.2, dy: -1.0, r: 0.55, t: 70 },
    { dx: -1.1, dy: 1.2, r: 0.5, t: 75 },
    { dx: 1.3, dy: 1.1, r: 0.42, t: 65 },
    { dx: 0, dy: -2.1, r: 0.32, t: 80 },
    { dx: 0, dy: 2.1, r: 0.35, t: 82 },
  ];

  // Draw circles
  nodes.forEach((n, i) => {
    const col = theme.chart[i % theme.chart.length];
    slide.addShape("ellipse", {
      x: cx + n.dx - n.r, y: cy + n.dy - n.r,
      w: n.r * 2, h: n.r * 2,
      fill: { color: col, transparency: n.t }, line: { type: "none" },
    });
  });

  // Connector lines as thin rects (always positive dims)
  for (let i = 1; i < nodes.length; i++) {
    const n = nodes[i];
    const x1 = cx + nodes[0].dx;
    const y1 = cy + nodes[0].dy;
    const x2 = cx + n.dx;
    const y2 = cy + n.dy;
    slide.addShape("rect", {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      w: Math.max(Math.abs(x2 - x1), 0.02),
      h: Math.max(Math.abs(y2 - y1), 0.02),
      fill: { color: theme.secondary, transparency: 70 }, line: { type: "none" },
    });
  }
}

function addDecorativeStrip(slide: PptxGenJS.Slide, theme: Theme, layout: SlideLayoutConfig) {
  const { pad: PAD, contentW: CW, headerH: HEADER_H, contentY: CONTENT_Y, footerY: FOOTER_Y } = layout;

  slide.addShape("rect", {
    x: SLIDE_W - 0.42, y: CONTENT_Y, w: 0.22, h: FOOTER_Y - CONTENT_Y,
    fill: { color: theme.secondary, transparency: 80 }, line: { type: "none" },
  });
  [0, 1, 2, 3].forEach(i => {
    slide.addShape("ellipse", {
      x: SLIDE_W - 0.5, y: CONTENT_Y + 0.8 + i * 1.4, w: 0.38, h: 0.38,
      fill: { color: theme.chart[i % theme.chart.length], transparency: 60 },
      line: { type: "none" },
    });
  });
}
