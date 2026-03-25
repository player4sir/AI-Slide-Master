import { PPTXTemplate } from "./types.js";

const SW = 13.33;
const SH = 7.5;

export const DarkTechTemplate: PPTXTemplate = {
  id: "dark-tech",
  name: "暗黑科技",
  description: "深邃暗色调配合霓虹蓝光边框",
  coverUrl: "/templates/dark-tech.jpg",
  baseTheme: "dark-tech",
  layout: {
    pad: 1.0,
    contentW: SW - 2.0,
    headerH: 1.1,
    contentY: 1.5,
    footerY: 6.9,
  },

  renderBackground: (slide, theme) => {
    // Scanline-style subtle horizontal lines
    for (let y = 0; y < SH; y += 0.5) {
      slide.addShape("rect", { x: 0, y, w: SW, h: 0.005, fill: { color: theme.primary, transparency: 92 }, line: { type: "none" } });
    }
    // Corner accents
    slide.addShape("rect", { x: 0, y: 0, w: 2.0, h: 0.04, fill: { color: theme.primary }, line: { type: "none" } });
    slide.addShape("rect", { x: 0, y: 0, w: 0.04, h: 1.5, fill: { color: theme.primary }, line: { type: "none" } });
    slide.addShape("rect", { x: SW - 2.0, y: SH - 0.04, w: 2.0, h: 0.04, fill: { color: theme.primary }, line: { type: "none" } });
    slide.addShape("rect", { x: SW - 0.04, y: SH - 1.5, w: 0.04, h: 1.5, fill: { color: theme.primary }, line: { type: "none" } });
  },

  renderTitleSlide: (_pptx, slide, content, theme) => {
    // Grid overlay
    for (let x = 0; x < SW; x += 1.33) {
      slide.addShape("rect", { x, y: 0, w: 0.005, h: SH, fill: { color: theme.primary, transparency: 90 }, line: { type: "none" } });
    }
    // Central focus area
    slide.addShape("roundRect", {
      x: 1.5, y: 1.5, w: SW - 3, h: SH - 3,
      fill: { color: theme.card, transparency: 50 }, line: { color: theme.primary, width: 1 }, rectRadius: 0.15,
    });
    slide.addText(content.title, {
      x: 2.5, y: 2.0, w: SW - 5, h: 2.5,
      fontSize: 48, bold: true, color: theme.text, align: "center", valign: "middle", fontFace: (theme.titleFont || "Calibri"), wrap: true,
    });
    if (content.keyPoints?.length > 0 && content.keyPoints[0] !== "") {
      slide.addText(content.keyPoints[0], {
        x: 2.5, y: 4.8, w: SW - 5, h: 1.0,
        fontSize: 16, color: theme.primary, align: "center", valign: "top", fontFace: (theme.titleFont || "Calibri"),
      });
    }
  },

  renderSectionSlide: (slide, content, theme) => {
    slide.addShape("rect", { x: 0, y: SH / 2 - 0.02, w: SW, h: 0.04, fill: { color: theme.primary }, line: { type: "none" } });
    slide.addText(content.title, {
      x: 1.5, y: SH / 2 - 1.5, w: SW - 3, h: 1.3,
      fontSize: 40, bold: true, color: theme.text, align: "center", valign: "bottom", fontFace: (theme.titleFont || "Calibri"), wrap: true,
    });
    if (content.keyPoints?.length > 0) {
      slide.addText(content.keyPoints[0], {
        x: 2, y: SH / 2 + 0.3, w: SW - 4, h: 0.8,
        fontSize: 16, color: theme.primary, align: "center", valign: "top", fontFace: (theme.titleFont || "Calibri"),
      });
    }
  },

  renderContentSlideHeader: (slide, content, theme, layout) => {
    slide.addShape("rect", { x: 0, y: 0, w: SW, h: layout.headerH, fill: { color: theme.card }, line: { type: "none" } });
    slide.addShape("rect", { x: 0, y: layout.headerH - 0.04, w: SW, h: 0.04, fill: { color: theme.primary }, line: { type: "none" } });
    slide.addText(content.title, {
      x: layout.pad, y: 0, w: layout.contentW, h: layout.headerH,
      fontSize: 26, bold: true, color: theme.primary, align: "left", valign: "middle", fontFace: (theme.titleFont || "Calibri"),
    });
  },

  renderTextSlide: (slide, content, theme, layout) => {
    const { pad: PAD, contentW: CW, contentY: CY, footerY: FY } = layout;
    const pts = content.keyPoints;
    const aH = FY - CY;
    const cH = (aH - 0.2 * (pts.length - 1)) / pts.length;
    pts.forEach((pt, i) => {
      const y = CY + i * (cH + 0.2);
      const col = theme.chart[i % theme.chart.length];
      // Bordered card
      slide.addShape("roundRect", { x: PAD, y, w: CW, h: cH, fill: { color: theme.card }, line: { color: col, width: 0.8 }, rectRadius: 0.06 });
      // Left neon strip
      slide.addShape("rect", { x: PAD, y, w: 0.08, h: cH, fill: { color: col }, line: { type: "none" } });
      // Index badge
      slide.addText(`${String(i + 1).padStart(2, '0')}`, {
        x: PAD + 0.25, y, w: 0.7, h: cH, fontSize: 14, bold: true, color: col, align: "center", valign: "middle", fontFace: "Arial",
      });
      slide.addText(pt, { x: PAD + 1.1, y, w: CW - 1.3, h: cH, fontSize: 14, color: theme.text, align: "left", valign: "middle", wrap: true, fontFace: "Calibri" });
    });
  },

  renderStatsSlide: (slide, content, theme, layout) => {
    const { pad: PAD, contentW: CW, contentY: CY, footerY: FY } = layout;
    const stats = content.stats!.slice(0, 4);
    const gap = 0.3;
    const cW = (CW - gap * (stats.length - 1)) / stats.length;
    const cH = FY - CY;
    stats.forEach((stat, i) => {
      const x = PAD + i * (cW + gap);
      const col = theme.chart[i % theme.chart.length];
      slide.addShape("roundRect", { x, y: CY, w: cW, h: cH, fill: { color: theme.card }, line: { color: col, width: 1 }, rectRadius: 0.08 });
      // Neon top line
      slide.addShape("rect", { x, y: CY, w: cW, h: 0.06, fill: { color: col }, line: { type: "none" } });
      slide.addText(stat.value, { x, y: CY + 0.4, w: cW, h: cH * 0.35, fontSize: 44, bold: true, color: col, align: "center", valign: "middle", fontFace: "Arial" });
      slide.addText(stat.label, { x, y: CY + cH * 0.5, w: cW, h: 0.5, fontSize: 13, bold: true, color: theme.text, align: "center", valign: "middle", fontFace: "Calibri" });
      if (stat.description) { slide.addText(stat.description, { x: x + 0.1, y: CY + cH * 0.7, w: cW - 0.2, h: cH * 0.25, fontSize: 10, color: theme.textLight, align: "center", valign: "top", wrap: true, fontFace: "Calibri" }); }
    });
  },

  renderProcessSlide: (slide, content, theme, layout) => {
    const { pad: PAD, contentW: CW, contentY: CY, footerY: FY } = layout;
    const steps = content.processSteps!.slice(0, 5);
    const sW = CW / steps.length;
    const nodeY = CY + 0.5;
    const nodeH = 1.2;
    // Horizontal connection
    slide.addShape("rect", { x: PAD + sW / 2, y: nodeY + nodeH / 2 - 0.015, w: CW - sW, h: 0.03, fill: { color: theme.primary, transparency: 50 }, line: { type: "none" } });
    steps.forEach((step, i) => {
      const cx = PAD + sW * i + sW / 2;
      const col = theme.chart[i % theme.chart.length];
      // Hexagon-ish node (using roundRect)
      slide.addShape("roundRect", { x: cx - nodeH / 2, y: nodeY, w: nodeH, h: nodeH, fill: { color: theme.card }, line: { color: col, width: 1.5 }, rectRadius: 0.15 });
      slide.addText(`${step.stepNumber}`, { x: cx - nodeH / 2, y: nodeY, w: nodeH, h: nodeH, fontSize: 24, bold: true, color: col, align: "center", valign: "middle", fontFace: "Arial" });
      // Title
      slide.addText(step.title, { x: cx - sW / 2 + 0.05, y: nodeY + nodeH + 0.2, w: sW - 0.1, h: 0.5, fontSize: 11, bold: true, color: theme.text, align: "center", valign: "top", wrap: true, fontFace: "Calibri" });
      // Description
      slide.addText(step.description, { x: cx - sW / 2 + 0.05, y: nodeY + nodeH + 0.8, w: sW - 0.1, h: FY - nodeY - nodeH - 1.0, fontSize: 10, color: theme.textLight, align: "center", valign: "top", wrap: true, fontFace: "Calibri" });
    });
  },

  renderIconGridSlide: (slide, content, theme, layout) => {
    const { pad: PAD, contentW: CW, contentY: CY, footerY: FY } = layout;
    const icons = content.icons!.slice(0, 6);
    const cols = icons.length <= 3 ? icons.length : Math.ceil(icons.length / 2);
    const rows = Math.ceil(icons.length / cols);
    const gap = 0.3;
    const cardW = (CW - gap * (cols - 1)) / cols;
    const cardH = (FY - CY - gap * (rows - 1)) / rows;
    icons.forEach((icon, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const x = PAD + c * (cardW + gap), y = CY + r * (cardH + gap);
      const col = theme.chart[i % theme.chart.length];
      slide.addShape("roundRect", { x, y, w: cardW, h: cardH, fill: { color: theme.card }, line: { color: col, width: 1 }, rectRadius: 0.08 });
      slide.addShape("rect", { x, y, w: cardW, h: 0.06, fill: { color: col }, line: { type: "none" } });
      slide.addText(icon.label, { x: x + 0.2, y: y + 0.2, w: cardW - 0.4, h: 0.5, fontSize: 13, bold: true, color: col, align: "left", valign: "middle", fontFace: "Calibri" });
      slide.addText(icon.description, { x: x + 0.2, y: y + 0.75, w: cardW - 0.4, h: cardH - 1.0, fontSize: 10, color: theme.textLight, align: "left", valign: "top", wrap: true, fontFace: "Calibri" });
    });
  },

  renderConclusionSlide: (slide, content, theme) => {
    slide.addShape("roundRect", {
      x: 2, y: 1.5, w: SW - 4, h: SH - 3,
      fill: { color: theme.card }, line: { color: theme.primary, width: 1.5 }, rectRadius: 0.15,
    });
    slide.addText(content.title, { x: 3, y: 2.0, w: SW - 6, h: 2.0, fontSize: 34, bold: true, color: theme.text, align: "center", valign: "middle", fontFace: (theme.titleFont || "Calibri"), wrap: true });
    slide.addShape("rect", { x: (SW - 3) / 2, y: 4.2, w: 3, h: 0.04, fill: { color: theme.primary }, line: { type: "none" } });
    if (content.keyPoints?.length > 0) {
      const rows = content.keyPoints.map((pt) => ({ text: pt, options: { bullet: { type: "bullet" as const, code: "25B8", color: theme.primary }, fontSize: 13, color: theme.textLight, fontFace: (theme.titleFont || "Calibri"), paraSpaceAfter: 10 } }));
      slide.addText(rows, { x: 3, y: 4.5, w: SW - 6, h: 2.0, align: "left", valign: "top", wrap: true });
    }
  },
};
