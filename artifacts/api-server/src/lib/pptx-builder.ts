import PptxGenJS from "pptxgenjs";
import type { SlideContent, PPTOutline } from "./deepseek.js";
import path from "path";
import os from "os";

// ─── SLIDE CONSTANTS (LAYOUT_WIDE = 13.33" × 7.5") ──────────────────────────
const SLIDE_W = 13.33;
const SLIDE_H = 7.5;
const PAD = 0.45;          // horizontal padding/margin
const CW = SLIDE_W - PAD * 2; // 12.43" usable content width
const HEADER_H = 1.15;     // header bar height
const FOOTER_Y = 7.1;      // footer bar top
const CONTENT_Y = HEADER_H + 0.1; // top of content area

const THEME_COLORS = {
  professional: {
    background: "F8FAFC",
    primary: "1E3A5F",
    secondary: "2E86AB",
    accent: "E85D75",
    text: "1A1A2E",
    textLight: "64748B",
    card: "FFFFFF",
    cardBorder: "E2E8F0",
    chart: ["2E86AB", "E85D75", "10B981", "F59E0B", "8B5CF6", "06B6D4"],
  },
  creative: {
    background: "0F0E17",
    primary: "FF8906",
    secondary: "F25F4C",
    accent: "E53170",
    text: "FFFFFE",
    textLight: "A7A9BE",
    card: "1A1926",
    cardBorder: "2E2B3B",
    chart: ["FF8906", "E53170", "F25F4C", "7209B7", "3A0CA3", "4CC9F0"],
  },
  minimal: {
    background: "FAFAFA",
    primary: "111111",
    secondary: "444444",
    accent: "0066FF",
    text: "111111",
    textLight: "888888",
    card: "FFFFFF",
    cardBorder: "E5E5E5",
    chart: ["0066FF", "111111", "10B981", "F59E0B", "8B5CF6", "06B6D4"],
  },
  academic: {
    background: "FAFFF8",
    primary: "1B4332",
    secondary: "2D6A4F",
    accent: "40916C",
    text: "1B4332",
    textLight: "52796F",
    card: "FFFFFF",
    cardBorder: "D8F3DC",
    chart: ["2D6A4F", "40916C", "74C69D", "B7E4C7", "1B4332", "95D5B2"],
  },
  "dark-tech": {
    background: "050D1A",
    primary: "0A1628",
    secondary: "00C2FF",
    accent: "00FFB3",
    text: "E8F4FD",
    textLight: "5A8FAA",
    card: "0D1F35",
    cardBorder: "1A3A5C",
    chart: ["00C2FF", "00FFB3", "7B61FF", "FF6B6B", "FFD93D", "FF8E53"],
  },
  "corporate-blue": {
    background: "FFFFFF",
    primary: "003087",
    secondary: "0057B8",
    accent: "FF6600",
    text: "1A1A1A",
    textLight: "5C6B7A",
    card: "F5F8FF",
    cardBorder: "C8D8F0",
    chart: ["003087", "0057B8", "FF6600", "00A651", "9B59B6", "E74C3C"],
  },
  warm: {
    background: "FFFBF5",
    primary: "7C3810",
    secondary: "C4622D",
    accent: "E8A838",
    text: "3D1F0D",
    textLight: "8B6B55",
    card: "FFFFFF",
    cardBorder: "F0D9C4",
    chart: ["C4622D", "E8A838", "7C3810", "D4845A", "8B4513", "F4C87A"],
  },
  "modern-dark": {
    background: "0A0A0A",
    primary: "141414",
    secondary: "6C63FF",
    accent: "FF3CAC",
    text: "F0F0F0",
    textLight: "808080",
    card: "1A1A1A",
    cardBorder: "2A2A2A",
    chart: ["6C63FF", "FF3CAC", "00E5CC", "FFB347", "FF6B6B", "4ECDC4"],
  },
} as const;

type ThemeKey = keyof typeof THEME_COLORS;
type Theme = (typeof THEME_COLORS)[ThemeKey];

export async function buildPPTX(outline: PPTOutline, style: string): Promise<string> {
  const theme: Theme = THEME_COLORS[(style as ThemeKey)] ?? THEME_COLORS.professional;

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = outline.presentationTitle;
  pptx.author = "AI PPT 生成平台";

  for (const slide of outline.slides) {
    const pSlide = pptx.addSlide();
    pSlide.background = { color: theme.background };

    if (slide.slideType === "title") {
      buildTitleSlide(pptx, pSlide, slide, theme);
    } else if (slide.slideType === "section") {
      buildSectionSlide(pSlide, slide, theme);
    } else if (slide.slideType === "conclusion" || slide.slideType === "qa") {
      buildConclusionSlide(pSlide, slide, theme);
    } else {
      buildContentSlide(pptx, pSlide, slide, theme);
    }

    if (slide.notes) {
      pSlide.addNotes(slide.notes);
    }
  }

  const tmpDir = os.tmpdir();
  const fileName = `ppt_${Date.now()}.pptx`;
  const filePath = path.join(tmpDir, fileName);

  await pptx.writeFile({ fileName: filePath });
  return filePath;
}

// ─── SHARED HELPERS ───────────────────────────────────────────────────────────

function addSlideNumber(slide: PptxGenJS.Slide, number: number, theme: Theme) {
  slide.addText(`${number}`, {
    x: SLIDE_W - 1.2, y: FOOTER_Y + 0.05, w: 0.8, h: 0.3,
    fontSize: 10, color: theme.textLight, align: "right", fontFace: "Calibri",
  });
}

function addHeaderBar(slide: PptxGenJS.Slide, title: string, theme: Theme) {
  slide.addShape("rect", {
    x: 0, y: 0, w: "100%", h: HEADER_H,
    fill: { color: theme.primary }, line: { type: "none" },
  });
  slide.addShape("rect", {
    x: 0, y: HEADER_H - 0.06, w: "100%", h: 0.06,
    fill: { color: theme.accent }, line: { type: "none" },
  });
  slide.addText(title, {
    x: PAD, y: 0, w: CW, h: HEADER_H,
    fontSize: 22, bold: true, color: "FFFFFF",
    align: "left", valign: "middle", fontFace: "Calibri",
  });
}

function addFooterBar(slide: PptxGenJS.Slide, theme: Theme) {
  slide.addShape("rect", {
    x: 0, y: FOOTER_Y, w: "100%", h: SLIDE_H - FOOTER_Y,
    fill: { color: theme.primary }, line: { type: "none" },
    transparency: 90,
  });
}

// ─── TITLE SLIDE ──────────────────────────────────────────────────────────────

function buildTitleSlide(pptx: PptxGenJS, slide: PptxGenJS.Slide, content: SlideContent, theme: Theme) {
  const leftW = 6.0; // left panel width

  // Left panel
  slide.addShape("rect", {
    x: 0, y: 0, w: leftW, h: "100%",
    fill: { color: theme.primary }, line: { type: "none" },
  });
  // Accent stripe between panels
  slide.addShape("rect", {
    x: leftW - 0.15, y: 0, w: 0.18, h: "100%",
    fill: { color: theme.accent }, line: { type: "none" },
  });
  // Decorative circles on left panel
  slide.addShape("ellipse", {
    x: -1.5, y: -1.5, w: 4, h: 4,
    fill: { color: theme.secondary }, line: { type: "none" }, transparency: 80,
  });
  slide.addShape("ellipse", {
    x: 3.5, y: 5.0, w: 3.5, h: 3.5,
    fill: { color: theme.accent }, line: { type: "none" }, transparency: 85,
  });

  // Title text
  slide.addText(content.title, {
    x: 0.5, y: 1.8, w: leftW - 0.8, h: 2.8,
    fontSize: 32, bold: true, color: "FFFFFF",
    align: "left", valign: "middle", wrap: true, fontFace: "Calibri",
    lineSpacingMultiple: 1.15,
  });

  if (content.keyPoints?.length > 0) {
    slide.addText(content.keyPoints[0], {
      x: 0.5, y: 4.7, w: leftW - 0.8, h: 0.9,
      fontSize: 14, color: theme.secondary,
      align: "left", valign: "top", wrap: true, fontFace: "Calibri",
    });
  }

  // Divider
  slide.addShape("line", {
    x: 0.5, y: 4.5, w: leftW - 1.0, h: 0,
    line: { color: theme.secondary, width: 1.5 },
  });

  // Branding
  slide.addText("AI PPT 生成平台  ·  Powered by DeepSeek", {
    x: 0.5, y: 6.7, w: leftW - 0.8, h: 0.4,
    fontSize: 9, color: "FFFFFF", align: "left", fontFace: "Calibri",
    transparency: 40,
  });

  // Right panel decorative illustration
  addDecorativeIllustration(slide, theme, leftW + 0.3, 0.8, SLIDE_W - leftW - 0.6, SLIDE_H - 1.0);
}

// ─── SECTION SLIDE ────────────────────────────────────────────────────────────

function buildSectionSlide(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme) {
  slide.addShape("rect", {
    x: 0, y: 0, w: "100%", h: "100%",
    fill: { color: theme.primary }, line: { type: "none" },
  });
  slide.addShape("rect", {
    x: 0, y: 0, w: "100%", h: "100%",
    fill: { color: theme.secondary }, line: { type: "none" }, transparency: 88,
  });

  // Big section number circle
  slide.addShape("ellipse", {
    x: 0.6, y: 2.0, w: 2.2, h: 2.2,
    fill: { color: theme.accent }, line: { type: "none" }, transparency: 85,
  });
  slide.addText(`${content.slideNumber}`, {
    x: 0.6, y: 2.0, w: 2.2, h: 2.2,
    fontSize: 52, bold: true, color: "FFFFFF",
    align: "center", valign: "middle", fontFace: "Calibri",
  });

  // Content on the right side
  const rightX = 3.5;
  const rightW = SLIDE_W - rightX - PAD;

  slide.addShape("rect", {
    x: rightX, y: 3.1, w: rightW, h: 0.06,
    fill: { color: theme.accent }, line: { type: "none" },
  });

  slide.addText(content.title, {
    x: rightX, y: 2.0, w: rightW, h: 1.8,
    fontSize: 30, bold: true, color: "FFFFFF",
    align: "left", valign: "bottom", wrap: true, fontFace: "Calibri",
  });

  if (content.keyPoints?.length > 0) {
    slide.addText(content.keyPoints[0], {
      x: rightX, y: 3.3, w: rightW, h: 1.4,
      fontSize: 15, color: "FFFFFF",
      align: "left", valign: "top", wrap: true, fontFace: "Calibri",
      transparency: 25,
    });
  }
}

// ─── CONTENT SLIDE ROUTER ─────────────────────────────────────────────────────

function buildContentSlide(pptx: PptxGenJS, slide: PptxGenJS.Slide, content: SlideContent, theme: Theme) {
  addHeaderBar(slide, content.title, theme);
  addFooterBar(slide, theme);
  addSlideNumber(slide, content.slideNumber, theme);

  const vt = content.visualType;
  if (vt === "chart" && content.chartData) {
    buildChartSlide(pptx, slide, content, theme);
  } else if (vt === "stats" && content.stats?.length) {
    buildStatsSlide(slide, content, theme);
  } else if (vt === "process" && content.processSteps?.length) {
    buildProcessSlide(slide, content, theme);
  } else if (vt === "comparison" && content.comparison?.length) {
    buildComparisonSlide(slide, content, theme);
  } else if (vt === "icon-grid" && content.icons?.length) {
    buildIconGridSlide(slide, content, theme);
  } else {
    buildTextSlide(slide, content, theme);
  }
}

// ─── CHART SLIDE ──────────────────────────────────────────────────────────────

function buildChartSlide(pptx: PptxGenJS, slide: PptxGenJS.Slide, content: SlideContent, theme: Theme) {
  const chart = content.chartData!;
  const chartColors = theme.chart;
  const isFullChart = content.keyPoints.length <= 2;

  if (!isFullChart) {
    const bulletW = 4.8;
    const bulletRows = content.keyPoints.map((pt, i) => ({
      text: pt,
      options: {
        bullet: { type: "bullet" as const, code: "25A0", color: chartColors[i % chartColors.length] },
        fontSize: 13, color: theme.text, fontFace: "Calibri", paraSpaceAfter: 14,
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

  let chartType: "bar" | "pie" | "line" | "doughnut" | "area";
  switch (chart.chartType) {
    case "pie": chartType = "pie"; break;
    case "donut": chartType = "doughnut"; break;
    case "line": chartType = "line"; break;
    case "area": chartType = "area"; break;
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
  } else {
    (chartOptions as PptxGenJS.IChartOpts).showValue = true;
    (chartOptions as PptxGenJS.IChartOpts).dataLabelPosition = "outEnd";
    slide.addChart(pptx.ChartType.bar, seriesData, chartOptions);
  }
}

// ─── STATS SLIDE ──────────────────────────────────────────────────────────────

function buildStatsSlide(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme) {
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

    slide.addShape("rect", {
      x, y: cardY, w: cardW, h: cardH,
      fill: { color: theme.card },
      line: { color: theme.cardBorder, width: 1.2 },
      shadow: { type: "outer", blur: 12, offset: 4, angle: 270, color: "000000", opacity: 0.06 },
    });

    // Top accent bar
    slide.addShape("rect", {
      x, y: cardY, w: cardW, h: 0.22,
      fill: { color: theme.chart[i % theme.chart.length] }, line: { type: "none" },
    });

    // Big metric value
    slide.addText(stat.value, {
      x: x + 0.15, y: cardY + 0.35, w: cardW - 0.3, h: 1.55,
      fontSize: count === 4 ? 36 : 42, bold: true,
      color: theme.chart[i % theme.chart.length],
      align: "center", valign: "middle", fontFace: "Calibri",
    });

    // Trend badge
    if (stat.trend && stat.trend !== "neutral" && stat.trendValue) {
      const trendColor = stat.trend === "up" ? "10B981" : "EF4444";
      const trendIcon = stat.trend === "up" ? "▲" : "▼";
      const badgeX = x + (cardW - 1.5) / 2;
      slide.addShape("rect", {
        x: badgeX, y: cardY + 1.95, w: 1.5, h: 0.36,
        fill: { color: trendColor }, line: { type: "none" }, transparency: 85,
      });
      slide.addText(`${trendIcon} ${stat.trendValue}`, {
        x: badgeX, y: cardY + 1.95, w: 1.5, h: 0.36,
        fontSize: 10, bold: true, color: trendColor,
        align: "center", valign: "middle", fontFace: "Calibri",
      });
    }

    // Label
    slide.addText(stat.label, {
      x: x + 0.1, y: cardY + 2.45, w: cardW - 0.2, h: 0.6,
      fontSize: 13, bold: true, color: theme.text,
      align: "center", valign: "middle", fontFace: "Calibri",
    });

    // Description
    if (stat.description) {
      slide.addText(stat.description, {
        x: x + 0.1, y: cardY + 3.1, w: cardW - 0.2, h: cardH - 3.25,
        fontSize: 10.5, color: theme.textLight,
        align: "center", valign: "top", wrap: true, fontFace: "Calibri",
      });
    }
  });
}

// ─── PROCESS SLIDE ────────────────────────────────────────────────────────────

function buildProcessSlide(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme) {
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
        fill: { color: col }, line: { type: "none" }, transparency: 40,
      });
      // Arrowhead triangle (small rect)
      slide.addShape("rect", {
        x: x + nodeW + arrowW - 0.18, y: arrowY - 0.12, w: 0.18, h: 0.24,
        fill: { color: col }, line: { type: "none" }, transparency: 40,
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
      align: "center", valign: "middle", fontFace: "Calibri",
    });

    // Step title below circle
    slide.addText(step.title, {
      x: x - 0.1, y: nodeY + circleD + 0.15, w: nodeW + 0.2, h: 0.6,
      fontSize: 11.5, bold: true, color: theme.text,
      align: "center", valign: "top", wrap: true, fontFace: "Calibri",
    });

    // Description card
    const descY = nodeY + circleD + 0.85;
    const descH = FOOTER_Y - descY - 0.1;
    slide.addShape("rect", {
      x: x - 0.05, y: descY, w: nodeW + 0.1, h: descH,
      fill: { color: theme.card }, line: { color: theme.cardBorder, width: 1 },
    });
    slide.addText(step.description, {
      x: x + 0.05, y: descY + 0.12, w: nodeW - 0.1, h: descH - 0.2,
      fontSize: 10, color: theme.textLight,
      align: "center", valign: "top", wrap: true, fontFace: "Calibri",
    });
  });
}

// ─── COMPARISON SLIDE ─────────────────────────────────────────────────────────

function buildComparisonSlide(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme) {
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
      align: "center", valign: "middle", fontFace: "Calibri",
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
        align: "center", valign: "middle", wrap: true, fontFace: "Calibri",
      });
    });
  });
}

// ─── ICON GRID SLIDE ──────────────────────────────────────────────────────────

function buildIconGridSlide(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme) {
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
    slide.addShape("rect", {
      x, y, w: cardW, h: cardH,
      fill: { color: theme.card },
      line: { color: colColor, width: 1.5 },
      shadow: { type: "outer", blur: 10, offset: 3, angle: 270, color: "000000", opacity: 0.05 },
    });
    // Top accent
    slide.addShape("rect", {
      x, y, w: cardW, h: 0.18,
      fill: { color: colColor }, line: { type: "none" },
    });

    // Icon circle
    const circleSize = rows === 1 ? 1.2 : 0.95;
    const circleX = x + (cardW - circleSize) / 2;
    const circleY = y + 0.32;
    slide.addShape("ellipse", {
      x: circleX, y: circleY, w: circleSize, h: circleSize,
      fill: { color: colColor }, line: { type: "none" }, transparency: 85,
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
      align: "center", valign: "top", fontFace: "Calibri",
    });

    // Description
    const descY = labelY + (rows === 1 ? 0.58 : 0.48);
    slide.addText(icon.description, {
      x: x + 0.12, y: descY, w: cardW - 0.24, h: cardH - (descY - y) - 0.1,
      fontSize: rows === 1 ? 11 : 10, color: theme.textLight,
      align: "center", valign: "top", wrap: true, fontFace: "Calibri",
    });
  });
}

// ─── TEXT SLIDE ───────────────────────────────────────────────────────────────

function buildTextSlide(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme) {
  if (content.keyPoints.length <= 3) {
    // Card-style layout: vertical accent bar + content cards
    slide.addShape("rect", {
      x: 0, y: CONTENT_Y - 0.05, w: 0.28, h: FOOTER_Y - CONTENT_Y + 0.05,
      fill: { color: theme.accent }, line: { type: "none" },
    });

    const cardH = (FOOTER_Y - CONTENT_Y - 0.15 - 0.15 * (content.keyPoints.length - 1)) / content.keyPoints.length;

    content.keyPoints.forEach((pt, i) => {
      const cardY = CONTENT_Y + i * (cardH + 0.15);
      slide.addShape("rect", {
        x: PAD - 0.03, y: cardY, w: CW + 0.03, h: cardH,
        fill: { color: theme.card },
        line: { color: theme.cardBorder, width: 1 },
        shadow: { type: "outer", blur: 8, offset: 2, angle: 270, color: "000000", opacity: 0.04 },
      });

      // Number badge
      const badgeSize = 0.85;
      slide.addShape("ellipse", {
        x: PAD + 0.1, y: cardY + (cardH - badgeSize) / 2, w: badgeSize, h: badgeSize,
        fill: { color: theme.chart[i % theme.chart.length] }, line: { type: "none" },
      });
      slide.addText(`${i + 1}`, {
        x: PAD + 0.1, y: cardY + (cardH - badgeSize) / 2, w: badgeSize, h: badgeSize,
        fontSize: 18, bold: true, color: "FFFFFF",
        align: "center", valign: "middle", fontFace: "Calibri",
      });

      // Card text
      slide.addText(pt, {
        x: PAD + 1.1, y: cardY + 0.1, w: CW - 1.2, h: cardH - 0.2,
        fontSize: 14, color: theme.text,
        align: "left", valign: "middle", wrap: true, fontFace: "Calibri",
        lineSpacingMultiple: 1.2,
      });
    });
  } else {
    // Bullet list layout
    const bulletRows = content.keyPoints.map((pt, i) => ({
      text: pt,
      options: {
        bullet: { type: "bullet" as const, code: "25CF", color: theme.chart[i % theme.chart.length] },
        fontSize: 14, color: theme.text, fontFace: "Calibri",
        paraSpaceAfter: 16, indentLevel: 0,
      },
    }));
    slide.addText(bulletRows, {
      x: PAD, y: CONTENT_Y, w: CW - 0.5, h: FOOTER_Y - CONTENT_Y,
      align: "left", valign: "top", wrap: true,
    });
    addDecorativeStrip(slide, theme);
  }
}

// ─── CONCLUSION SLIDE ─────────────────────────────────────────────────────────

function buildConclusionSlide(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme) {
  // Full background
  slide.addShape("rect", {
    x: 0, y: 0, w: "100%", h: "100%",
    fill: { color: theme.primary }, line: { type: "none" },
  });
  // Decorative circles (intentionally overflow for effect)
  slide.addShape("ellipse", {
    x: -2, y: -2, w: 6, h: 6,
    fill: { color: theme.secondary }, line: { type: "none" }, transparency: 88,
  });
  slide.addShape("ellipse", {
    x: SLIDE_W - 3, y: SLIDE_H - 3, w: 6, h: 6,
    fill: { color: theme.accent }, line: { type: "none" }, transparency: 85,
  });

  // Center content box
  const boxX = PAD + 0.3;
  const boxW = SLIDE_W - (boxX * 2);
  const boxY = 0.7;
  const boxH = SLIDE_H - 1.2;

  slide.addShape("rect", {
    x: boxX, y: boxY, w: boxW, h: boxH,
    fill: { color: "FFFFFF" }, line: { type: "none" }, transparency: 93,
  });
  slide.addShape("rect", {
    x: boxX, y: boxY, w: boxW, h: 0.18,
    fill: { color: theme.accent }, line: { type: "none" },
  });

  slide.addText(content.title, {
    x: boxX + 0.3, y: boxY + 0.3, w: boxW - 0.6, h: 1.5,
    fontSize: 30, bold: true, color: "FFFFFF",
    align: "center", valign: "middle", fontFace: "Calibri",
  });

  // Divider
  const divW = 5.0;
  slide.addShape("rect", {
    x: (SLIDE_W - divW) / 2, y: boxY + 1.9, w: divW, h: 0.05,
    fill: { color: theme.accent }, line: { type: "none" }, transparency: 50,
  });

  if (content.keyPoints?.length > 0) {
    const bulletRows = content.keyPoints.map((pt) => ({
      text: pt,
      options: {
        bullet: { type: "bullet" as const, code: "25CB", color: theme.accent },
        fontSize: 13.5, color: "FFFFFF", fontFace: "Calibri", paraSpaceAfter: 12,
      },
    }));
    slide.addText(bulletRows, {
      x: boxX + 0.5, y: boxY + 2.1, w: boxW - 1.0, h: boxH - 2.4,
      align: "center", valign: "top", wrap: true,
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
      fill: { color: col }, line: { type: "none" }, transparency: n.t,
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
      fill: { color: theme.secondary }, line: { type: "none" }, transparency: 70,
    });
  }
}

function addDecorativeStrip(slide: PptxGenJS.Slide, theme: Theme) {
  slide.addShape("rect", {
    x: SLIDE_W - 0.42, y: CONTENT_Y, w: 0.22, h: FOOTER_Y - CONTENT_Y,
    fill: { color: theme.secondary }, line: { type: "none" }, transparency: 80,
  });
  [0, 1, 2, 3].forEach(i => {
    slide.addShape("ellipse", {
      x: SLIDE_W - 0.5, y: CONTENT_Y + 0.8 + i * 1.4, w: 0.38, h: 0.38,
      fill: { color: theme.chart[i % theme.chart.length] },
      line: { type: "none" }, transparency: 60,
    });
  });
}
