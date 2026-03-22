import PptxGenJS from "pptxgenjs";
import type { SlideContent, PPTOutline, ChartData, StatItem, ProcessStep, ComparisonColumn } from "./deepseek.js";
import path from "path";
import os from "os";

const THEME_COLORS = {
  professional: {
    background: "F8FAFC",
    primary: "1E3A5F",
    secondary: "2E86AB",
    accent: "E85D75",
    text: "1A1A2E",
    textLight: "64748B",
    bullet: "2E86AB",
    card: "FFFFFF",
    cardBorder: "E2E8F0",
    chart: ["2E86AB", "E85D75", "10B981", "F59E0B", "8B5CF6", "06B6D4"],
    gradient1: "1E3A5F",
    gradient2: "2E86AB",
  },
  creative: {
    background: "0F0E17",
    primary: "FF8906",
    secondary: "F25F4C",
    accent: "E53170",
    text: "FFFFFE",
    textLight: "A7A9BE",
    bullet: "FF8906",
    card: "1A1926",
    cardBorder: "2E2B3B",
    chart: ["FF8906", "E53170", "F25F4C", "7209B7", "3A0CA3", "4CC9F0"],
    gradient1: "0F0E17",
    gradient2: "1F1E2E",
  },
  minimal: {
    background: "FAFAFA",
    primary: "111111",
    secondary: "444444",
    accent: "0066FF",
    text: "111111",
    textLight: "888888",
    bullet: "0066FF",
    card: "FFFFFF",
    cardBorder: "E5E5E5",
    chart: ["0066FF", "111111", "10B981", "F59E0B", "8B5CF6", "06B6D4"],
    gradient1: "111111",
    gradient2: "333333",
  },
  academic: {
    background: "FAFFF8",
    primary: "1B4332",
    secondary: "2D6A4F",
    accent: "40916C",
    text: "1B4332",
    textLight: "52796F",
    bullet: "2D6A4F",
    card: "FFFFFF",
    cardBorder: "D8F3DC",
    chart: ["2D6A4F", "40916C", "74C69D", "B7E4C7", "1B4332", "95D5B2"],
    gradient1: "1B4332",
    gradient2: "2D6A4F",
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

function addSlideNumber(slide: PptxGenJS.Slide, number: number, theme: Theme) {
  slide.addText(`${number}`, {
    x: "90%", y: "93%", w: "8%", h: "5%",
    fontSize: 10,
    color: theme.textLight,
    align: "right",
    fontFace: "Calibri",
  });
}

function addHeaderBar(slide: PptxGenJS.Slide, title: string, theme: Theme) {
  slide.addShape("rect", {
    x: 0, y: 0, w: "100%", h: 1.1,
    fill: { color: theme.primary },
    line: { type: "none" },
  });

  slide.addShape("rect", {
    x: 0, y: 1.07, w: "100%", h: 0.06,
    fill: { color: theme.accent },
    line: { type: "none" },
  });

  slide.addText(title, {
    x: 0.45, y: 0, w: 9.0, h: 1.1,
    fontSize: 22,
    bold: true,
    color: "FFFFFF",
    align: "left",
    valign: "middle",
    fontFace: "Calibri",
  });
}

function addFooterBar(slide: PptxGenJS.Slide, theme: Theme) {
  slide.addShape("rect", {
    x: 0, y: 7.1, w: "100%", h: 0.4,
    fill: { color: theme.primary },
    line: { type: "none" },
    transparency: 90,
  });
}

// ─── TITLE SLIDE ─────────────────────────────────────────────────────────────

function buildTitleSlide(pptx: PptxGenJS, slide: PptxGenJS.Slide, content: SlideContent, theme: Theme) {
  // Full left panel
  slide.addShape("rect", {
    x: 0, y: 0, w: 5.5, h: "100%",
    fill: { color: theme.primary },
    line: { type: "none" },
  });

  // Accent stripe
  slide.addShape("rect", {
    x: 5.4, y: 0, w: 0.18, h: "100%",
    fill: { color: theme.accent },
    line: { type: "none" },
  });

  // Decorative circles on left panel
  slide.addShape("ellipse", {
    x: -1.5, y: -1.5, w: 4, h: 4,
    fill: { color: theme.secondary },
    line: { type: "none" },
    transparency: 80,
  });
  slide.addShape("ellipse", {
    x: 3.2, y: 4.5, w: 3, h: 3,
    fill: { color: theme.accent },
    line: { type: "none" },
    transparency: 85,
  });

  // Title text
  slide.addText(content.title, {
    x: 0.5, y: 1.8, w: 4.7, h: 2.8,
    fontSize: 34,
    bold: true,
    color: "FFFFFF",
    align: "left",
    valign: "middle",
    wrap: true,
    fontFace: "Calibri",
    lineSpacingMultiple: 1.15,
  });

  // Subtitle from keyPoints
  if (content.keyPoints?.length > 0) {
    slide.addText(content.keyPoints[0], {
      x: 0.5, y: 4.7, w: 4.7, h: 0.9,
      fontSize: 15,
      color: theme.secondary,
      align: "left",
      valign: "top",
      wrap: true,
      fontFace: "Calibri",
    });
  }

  // Divider line
  slide.addShape("line", {
    x: 0.5, y: 4.5, w: 4.2, h: 0,
    line: { color: theme.secondary, width: 1.5 },
  });

  // Branding
  slide.addText("AI PPT 生成平台  ·  Powered by DeepSeek", {
    x: 0.5, y: 6.6, w: 4.7, h: 0.4,
    fontSize: 10,
    color: "FFFFFF",
    align: "left",
    fontFace: "Calibri",
    transparency: 40,
  });

  // Right panel: decorative abstract shapes
  addDecorativeIllustration(slide, theme, 6.2, 1.0, 3.0, 5.5);
}

// ─── SECTION SLIDE ───────────────────────────────────────────────────────────

function buildSectionSlide(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme) {
  // Background gradient via shapes
  slide.addShape("rect", {
    x: 0, y: 0, w: "100%", h: "100%",
    fill: { color: theme.primary },
    line: { type: "none" },
  });

  // Decorative overlay
  slide.addShape("rect", {
    x: 0, y: 0, w: "100%", h: "100%",
    fill: { color: theme.secondary },
    line: { type: "none" },
    transparency: 88,
  });

  // Big section number
  slide.addShape("ellipse", {
    x: 0.6, y: 2.0, w: 2.2, h: 2.2,
    fill: { color: theme.accent },
    line: { type: "none" },
    transparency: 85,
  });
  slide.addText(`${content.slideNumber}`, {
    x: 0.6, y: 2.0, w: 2.2, h: 2.2,
    fontSize: 52,
    bold: true,
    color: "FFFFFF",
    align: "center",
    valign: "middle",
    fontFace: "Calibri",
    transparency: 40,
  });

  // Accent line
  slide.addShape("rect", {
    x: 3.5, y: 3.1, w: 5.8, h: 0.06,
    fill: { color: theme.accent },
    line: { type: "none" },
  });

  slide.addText(content.title, {
    x: 3.5, y: 2.1, w: 5.8, h: 1.8,
    fontSize: 30,
    bold: true,
    color: "FFFFFF",
    align: "left",
    valign: "bottom",
    wrap: true,
    fontFace: "Calibri",
  });

  if (content.keyPoints?.length > 0) {
    slide.addText(content.keyPoints[0], {
      x: 3.5, y: 3.3, w: 5.8, h: 1.2,
      fontSize: 15,
      color: "FFFFFF",
      align: "left",
      valign: "top",
      wrap: true,
      fontFace: "Calibri",
      transparency: 25,
    });
  }
}

// ─── CONTENT SLIDE ROUTER ────────────────────────────────────────────────────

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

// ─── CHART SLIDE ─────────────────────────────────────────────────────────────

function buildChartSlide(pptx: PptxGenJS, slide: PptxGenJS.Slide, content: SlideContent, theme: Theme) {
  const chart = content.chartData!;
  const chartColors = theme.chart;

  const isFullChart = content.keyPoints.length <= 2;

  if (!isFullChart) {
    // Left: bullets, Right: chart
    const bulletRows = content.keyPoints.map((pt, i) => ({
      text: pt,
      options: {
        bullet: { type: "bullet" as const, code: "25A0", color: chartColors[i % chartColors.length] },
        fontSize: 13,
        color: theme.text,
        fontFace: "Calibri",
        paraSpaceAfter: 14,
      },
    }));

    slide.addText(bulletRows, {
      x: 0.35, y: 1.25, w: 4.0, h: 5.6,
      align: "left", valign: "top", wrap: true,
    });
  }

  const chartX = isFullChart ? 0.4 : 4.5;
  const chartW = isFullChart ? 9.2 : 5.2;

  const seriesData = chart.series.map((s, i) => ({
    name: s.name,
    labels: chart.labels,
    values: s.values,
  }));

  const chartOptions: PptxGenJS.IChartOpts = {
    x: chartX, y: 1.25, w: chartW, h: 5.6,
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

// ─── STATS SLIDE ─────────────────────────────────────────────────────────────

function buildStatsSlide(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme) {
  const stats = content.stats!.slice(0, 4);
  const count = stats.length;
  const cardW = count === 4 ? 2.7 : count === 3 ? 3.6 : 4.0;
  const gap = count === 4 ? 0.22 : count === 3 ? 0.3 : 0.5;
  const startX = (9.8 - (cardW * count + gap * (count - 1))) / 2;

  stats.forEach((stat, i) => {
    const x = startX + i * (cardW + gap);

    // Card background
    slide.addShape("rect", {
      x, y: 1.4, w: cardW, h: 4.8,
      fill: { color: theme.card },
      line: { color: theme.cardBorder, width: 1.2 },
      shadow: {
        type: "outer",
        blur: 12, offset: 4, angle: 270,
        color: "000000", opacity: 0.06,
      },
    });

    // Top accent bar
    slide.addShape("rect", {
      x, y: 1.4, w: cardW, h: 0.22,
      fill: { color: theme.chart[i % theme.chart.length] },
      line: { type: "none" },
    });

    // Big value
    slide.addText(stat.value, {
      x: x + 0.15, y: 2.0, w: cardW - 0.3, h: 1.5,
      fontSize: count === 4 ? 36 : 40,
      bold: true,
      color: theme.chart[i % theme.chart.length],
      align: "center",
      valign: "middle",
      fontFace: "Calibri",
    });

    // Trend badge
    if (stat.trend && stat.trend !== "neutral" && stat.trendValue) {
      const trendColor = stat.trend === "up" ? "10B981" : "EF4444";
      const trendIcon = stat.trend === "up" ? "▲" : "▼";
      slide.addShape("rect", {
        x: x + (cardW - 1.4) / 2, y: 3.55, w: 1.4, h: 0.35,
        fill: { color: trendColor },
        line: { type: "none" },
        transparency: 85,
      });
      slide.addText(`${trendIcon} ${stat.trendValue}`, {
        x: x + (cardW - 1.4) / 2, y: 3.55, w: 1.4, h: 0.35,
        fontSize: 10,
        bold: true,
        color: trendColor,
        align: "center",
        valign: "middle",
        fontFace: "Calibri",
      });
    }

    // Label
    slide.addText(stat.label, {
      x: x + 0.1, y: 4.0, w: cardW - 0.2, h: 0.55,
      fontSize: 13,
      bold: true,
      color: theme.text,
      align: "center",
      valign: "middle",
      fontFace: "Calibri",
    });

    // Description
    if (stat.description) {
      slide.addText(stat.description, {
        x: x + 0.1, y: 4.55, w: cardW - 0.2, h: 1.4,
        fontSize: 10.5,
        color: theme.textLight,
        align: "center",
        valign: "top",
        wrap: true,
        fontFace: "Calibri",
      });
    }
  });
}

// ─── PROCESS SLIDE ───────────────────────────────────────────────────────────

function buildProcessSlide(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme) {
  const steps = content.processSteps!.slice(0, 5);
  const count = steps.length;
  const nodeW = 1.6;
  const arrowW = 0.55;
  const totalW = count * nodeW + (count - 1) * arrowW;
  const startX = (9.8 - totalW) / 2;
  const nodeY = 1.9;

  steps.forEach((step, i) => {
    const x = startX + i * (nodeW + arrowW);
    const col = theme.chart[i % theme.chart.length];

    // Arrow connector (between nodes)
    if (i < count - 1) {
      slide.addShape("rect", {
        x: x + nodeW, y: nodeY + 0.85, w: arrowW, h: 0.06,
        fill: { color: col },
        line: { type: "none" },
        transparency: 40,
      });
      // Arrowhead
      slide.addShape("rect", {
        x: x + nodeW + arrowW - 0.15, y: nodeY + 0.78, w: 0.15, h: 0.22,
        fill: { color: col },
        line: { type: "none" },
        transparency: 40,
      });
    }

    // Step circle
    slide.addShape("ellipse", {
      x: x + (nodeW - 1.4) / 2, y: nodeY, w: 1.4, h: 1.4,
      fill: { color: col },
      line: { type: "none" },
    });

    // Step number
    slide.addText(`${step.stepNumber}`, {
      x: x + (nodeW - 1.4) / 2, y: nodeY, w: 1.4, h: 1.4,
      fontSize: 28,
      bold: true,
      color: "FFFFFF",
      align: "center",
      valign: "middle",
      fontFace: "Calibri",
    });

    // Step title
    slide.addText(step.title, {
      x: x - 0.1, y: nodeY + 1.55, w: nodeW + 0.2, h: 0.65,
      fontSize: 11.5,
      bold: true,
      color: theme.text,
      align: "center",
      valign: "top",
      wrap: true,
      fontFace: "Calibri",
    });

    // Card description
    slide.addShape("rect", {
      x: x - 0.05, y: nodeY + 2.3, w: nodeW + 0.1, h: 2.5,
      fill: { color: theme.card },
      line: { color: theme.cardBorder, width: 1 },
    });

    slide.addText(step.description, {
      x: x, y: nodeY + 2.45, w: nodeW, h: 2.2,
      fontSize: 10,
      color: theme.textLight,
      align: "center",
      valign: "top",
      wrap: true,
      fontFace: "Calibri",
    });
  });
}

// ─── COMPARISON SLIDE ────────────────────────────────────────────────────────

function buildComparisonSlide(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme) {
  const cols = content.comparison!.slice(0, 3);
  const colCount = cols.length;
  const colW = colCount === 3 ? 2.95 : colCount === 2 ? 4.2 : 6.0;
  const gap = 0.2;
  const startX = (9.8 - (colW * colCount + gap * (colCount - 1))) / 2;
  const rowH = 0.62;
  const headerH = 0.72;
  const tableY = 1.4;

  cols.forEach((col, ci) => {
    const x = startX + ci * (colW + gap);
    const col_color = theme.chart[ci % theme.chart.length];

    // Column header
    slide.addShape("rect", {
      x, y: tableY, w: colW, h: headerH,
      fill: { color: col_color },
      line: { type: "none" },
    });
    slide.addText(col.header, {
      x, y: tableY, w: colW, h: headerH,
      fontSize: 14,
      bold: true,
      color: "FFFFFF",
      align: "center",
      valign: "middle",
      fontFace: "Calibri",
    });

    // Column rows
    col.rows.slice(0, 8).forEach((row, ri) => {
      const rowY = tableY + headerH + ri * rowH;
      const isEven = ri % 2 === 0;

      slide.addShape("rect", {
        x, y: rowY, w: colW, h: rowH,
        fill: { color: isEven ? theme.card : theme.background },
        line: { color: theme.cardBorder, width: 0.8 },
      });
      slide.addText(row, {
        x: x + 0.12, y: rowY, w: colW - 0.24, h: rowH,
        fontSize: 11,
        color: theme.text,
        align: "center",
        valign: "middle",
        wrap: true,
        fontFace: "Calibri",
      });
    });
  });
}

// ─── ICON GRID SLIDE ─────────────────────────────────────────────────────────

function buildIconGridSlide(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme) {
  const icons = content.icons!.slice(0, 6);
  const count = icons.length;
  const perRow = count <= 3 ? count : Math.ceil(count / 2);
  const rows = Math.ceil(count / perRow);

  const cardW = perRow === 3 ? 3.0 : perRow === 2 ? 4.5 : 9.2;
  const cardH = rows === 1 ? 4.5 : 2.6;
  const gapX = 0.25;
  const gapY = 0.25;
  const totalW = cardW * perRow + gapX * (perRow - 1);
  const startX = (9.8 - totalW) / 2;
  const startY = rows === 1 ? 1.8 : 1.45;

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
      shadow: {
        type: "outer",
        blur: 10, offset: 3, angle: 270,
        color: "000000", opacity: 0.05,
      },
    });

    // Top color accent
    slide.addShape("rect", {
      x, y, w: cardW, h: 0.18,
      fill: { color: colColor },
      line: { type: "none" },
    });

    // Icon circle
    const circleSize = rows === 1 ? 1.1 : 0.85;
    const circleX = x + (cardW - circleSize) / 2;
    const circleY = y + 0.35;
    slide.addShape("ellipse", {
      x: circleX, y: circleY, w: circleSize, h: circleSize,
      fill: { color: colColor },
      line: { type: "none" },
      transparency: 85,
    });

    // Emoji icon
    slide.addText(icon.icon, {
      x: circleX, y: circleY, w: circleSize, h: circleSize,
      fontSize: rows === 1 ? 28 : 22,
      align: "center",
      valign: "middle",
      fontFace: "Segoe UI Emoji",
    });

    // Label
    const labelY = circleY + circleSize + 0.15;
    slide.addText(icon.label, {
      x: x + 0.1, y: labelY, w: cardW - 0.2, h: rows === 1 ? 0.55 : 0.45,
      fontSize: rows === 1 ? 14 : 12,
      bold: true,
      color: theme.text,
      align: "center",
      valign: "top",
      fontFace: "Calibri",
    });

    // Description
    slide.addText(icon.description, {
      x: x + 0.12, y: labelY + (rows === 1 ? 0.58 : 0.48), w: cardW - 0.24, h: rows === 1 ? 1.5 : 1.0,
      fontSize: rows === 1 ? 11 : 10,
      color: theme.textLight,
      align: "center",
      valign: "top",
      wrap: true,
      fontFace: "Calibri",
    });
  });
}

// ─── TEXT SLIDE ──────────────────────────────────────────────────────────────

function buildTextSlide(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme) {
  if (content.keyPoints.length <= 3) {
    // Large card-style layout with decorative sidebar
    slide.addShape("rect", {
      x: 0, y: 1.15, w: 0.28, h: 5.95,
      fill: { color: theme.accent },
      line: { type: "none" },
    });

    content.keyPoints.forEach((pt, i) => {
      const cardY = 1.45 + i * 2.05;
      slide.addShape("rect", {
        x: 0.42, y: cardY, w: 9.1, h: 1.82,
        fill: { color: theme.card },
        line: { color: theme.cardBorder, width: 1 },
        shadow: {
          type: "outer",
          blur: 8, offset: 2, angle: 270,
          color: "000000", opacity: 0.04,
        },
      });

      // Number badge
      slide.addShape("ellipse", {
        x: 0.55, y: cardY + 0.38, w: 0.8, h: 0.8,
        fill: { color: theme.chart[i % theme.chart.length] },
        line: { type: "none" },
      });
      slide.addText(`${i + 1}`, {
        x: 0.55, y: cardY + 0.38, w: 0.8, h: 0.8,
        fontSize: 16,
        bold: true,
        color: "FFFFFF",
        align: "center",
        valign: "middle",
        fontFace: "Calibri",
      });

      slide.addText(pt, {
        x: 1.55, y: cardY + 0.12, w: 7.8, h: 1.58,
        fontSize: 14,
        color: theme.text,
        align: "left",
        valign: "middle",
        wrap: true,
        fontFace: "Calibri",
        lineSpacingMultiple: 1.2,
      });
    });
  } else {
    // Regular bullet list with visual accents
    const bulletRows = content.keyPoints.map((pt, i) => ({
      text: pt,
      options: {
        bullet: { type: "bullet" as const, code: "25CF", color: theme.chart[i % theme.chart.length] },
        fontSize: 14,
        color: theme.text,
        fontFace: "Calibri",
        paraSpaceAfter: 16,
        indentLevel: 0,
      },
    }));

    slide.addText(bulletRows, {
      x: 0.5, y: 1.4, w: 9.0, h: 5.8,
      align: "left",
      valign: "top",
      wrap: true,
    });

    // Right decorative strip
    addDecorativeStrip(slide, theme);
  }
}

// ─── CONCLUSION SLIDE ────────────────────────────────────────────────────────

function buildConclusionSlide(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme) {
  // Full gradient background
  slide.addShape("rect", {
    x: 0, y: 0, w: "100%", h: "100%",
    fill: { color: theme.primary },
    line: { type: "none" },
  });

  // Decorative circles
  slide.addShape("ellipse", {
    x: -2, y: -2, w: 6, h: 6,
    fill: { color: theme.secondary },
    line: { type: "none" },
    transparency: 88,
  });
  slide.addShape("ellipse", {
    x: 7, y: 4, w: 5, h: 5,
    fill: { color: theme.accent },
    line: { type: "none" },
    transparency: 85,
  });

  // Center content box
  slide.addShape("rect", {
    x: 0.8, y: 0.8, w: 8.4, h: 5.9,
    fill: { color: "FFFFFF" },
    line: { type: "none" },
    transparency: 93,
  });

  // Accent top bar
  slide.addShape("rect", {
    x: 0.8, y: 0.8, w: 8.4, h: 0.18,
    fill: { color: theme.accent },
    line: { type: "none" },
  });

  slide.addText(content.title, {
    x: 1.0, y: 1.3, w: 8.0, h: 1.5,
    fontSize: 30,
    bold: true,
    color: "FFFFFF",
    align: "center",
    valign: "middle",
    fontFace: "Calibri",
  });

  // Divider
  slide.addShape("rect", {
    x: 3.0, y: 2.9, w: 4.0, h: 0.05,
    fill: { color: theme.accent },
    line: { type: "none" },
    transparency: 50,
  });

  if (content.keyPoints?.length > 0) {
    const bulletRows = content.keyPoints.map((pt) => ({
      text: pt,
      options: {
        bullet: { type: "bullet" as const, code: "25CB", color: theme.accent },
        fontSize: 13.5,
        color: "FFFFFF",
        fontFace: "Calibri",
        paraSpaceAfter: 12,
        transparency: 10,
      },
    }));

    slide.addText(bulletRows, {
      x: 1.5, y: 3.1, w: 7.0, h: 3.3,
      align: "center",
      valign: "top",
      wrap: true,
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

  // Abstract network of circles and lines
  const nodes = [
    { dx: 0, dy: 0, r: 0.65, t: 0 },
    { dx: -1.1, dy: -1.0, r: 0.4, t: 60 },
    { dx: 1.0, dy: -0.9, r: 0.5, t: 70 },
    { dx: -0.9, dy: 1.1, r: 0.45, t: 75 },
    { dx: 1.1, dy: 1.0, r: 0.38, t: 65 },
    { dx: 0, dy: -1.8, r: 0.3, t: 80 },
    { dx: 0, dy: 1.8, r: 0.32, t: 82 },
  ];

  nodes.forEach((n, i) => {
    const col = theme.chart[i % theme.chart.length];
    slide.addShape("ellipse", {
      x: cx + n.dx - n.r,
      y: cy + n.dy - n.r,
      w: n.r * 2,
      h: n.r * 2,
      fill: { color: col },
      line: { type: "none" },
      transparency: n.t,
    });
  });

  // Lines connecting nodes to center
  for (let i = 1; i < nodes.length; i++) {
    const n = nodes[i];
    slide.addShape("line", {
      x: cx + nodes[0].dx,
      y: cy + nodes[0].dy,
      w: n.dx,
      h: n.dy,
      line: { color: theme.secondary, width: 1 },
      transparency: 70,
    });
  }
}

function addDecorativeStrip(slide: PptxGenJS.Slide, theme: Theme) {
  // Subtle vertical decoration on the right
  slide.addShape("rect", {
    x: 9.55, y: 1.2, w: 0.22, h: 5.9,
    fill: { color: theme.secondary },
    line: { type: "none" },
    transparency: 80,
  });
  [0, 1, 2, 3].forEach(i => {
    slide.addShape("ellipse", {
      x: 9.47, y: 2.0 + i * 1.4, w: 0.38, h: 0.38,
      fill: { color: theme.chart[i % theme.chart.length] },
      line: { type: "none" },
      transparency: 60,
    });
  });
}
