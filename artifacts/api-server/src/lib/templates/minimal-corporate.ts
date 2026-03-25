import { PPTXTemplate } from "./types.js";

const SW = 13.33;
const SH = 7.5;

export const MinimalCorporateTemplate: PPTXTemplate = {
  id: "minimal-corporate",
  name: "极简商务",
  description: "干净、专业的商务展示，留白丰富",
  coverUrl: "/templates/minimal-corporate.jpg",
  baseTheme: "professional",
  layout: {
    pad: 1.2,
    contentW: 13.33 - 2.4,
    headerH: 0.8,
    contentY: 1.3,
    footerY: 6.9,
  },

  renderBackground: (slide, theme) => {
    slide.addShape("rect", {
      x: 0, y: 0, w: "100%", h: 0.06,
      fill: { color: theme.accent }, line: { type: "none" },
    });
  },

  renderTitleSlide: (_pptx, slide, content, theme, layout) => {
    slide.addShape("rect", {
      x: 0, y: 0, w: 0.4, h: SH,
      fill: { color: theme.accent, transparency: 92 }, line: { type: "none" },
    });
    slide.addText(content.title, {
      x: layout.pad, y: 1.8, w: layout.contentW * 0.7, h: 2.5,
      fontSize: 44, bold: true, color: theme.text,
      align: "left", valign: "bottom", fontFace: (theme.titleFont || "Calibri"), wrap: true, lineSpacingMultiple: 1.1,
    });
    slide.addShape("rect", {
      x: layout.pad, y: 4.55, w: 3.0, h: 0.06,
      fill: { color: theme.accent }, line: { type: "none" },
    });
    if (content.keyPoints?.length > 0 && content.keyPoints[0] !== "") {
      slide.addText(content.keyPoints[0], {
        x: layout.pad, y: 4.9, w: layout.contentW * 0.65, h: 1.2,
        fontSize: 17, color: theme.textLight,
        align: "left", valign: "top", fontFace: (theme.titleFont || "Calibri"), lineSpacingMultiple: 1.4,
      });
    }
    slide.addText("AI PPT · Powered by DeepSeek", {
      x: layout.pad, y: 6.6, w: 4, h: 0.4,
      fontSize: 10, color: theme.textLight, transparency: 40, align: "left", fontFace: (theme.titleFont || "Calibri"),
    });
  },

  renderSectionSlide: (slide, content, theme, layout) => {
    const lineW = 3.0;
    const cx = (SW - lineW) / 2;
    slide.addShape("rect", { x: cx, y: 3.0, w: lineW, h: 0.04, fill: { color: theme.accent }, line: { type: "none" } });
    slide.addText(content.title, {
      x: layout.pad, y: 3.2, w: layout.contentW, h: 1.2,
      fontSize: 36, bold: true, color: theme.text, align: "center", valign: "middle", fontFace: (theme.titleFont || "Calibri"), wrap: true,
    });
    slide.addShape("rect", { x: cx, y: 4.6, w: lineW, h: 0.04, fill: { color: theme.accent }, line: { type: "none" } });
    if (content.keyPoints?.length > 0) {
      slide.addText(content.keyPoints[0], {
        x: layout.pad + 1, y: 5.0, w: layout.contentW - 2, h: 0.8,
        fontSize: 16, color: theme.textLight, align: "center", valign: "top", fontFace: (theme.titleFont || "Calibri"),
      });
    }
  },

  renderContentSlideHeader: (slide, content, theme, layout) => {
    slide.addText(content.title, {
      x: layout.pad, y: 0.25, w: layout.contentW, h: layout.headerH,
      fontSize: 28, bold: true, color: theme.text, align: "left", valign: "middle", fontFace: (theme.titleFont || "Calibri"),
    });
    slide.addShape("rect", {
      x: layout.pad, y: layout.headerH + 0.25, w: layout.contentW, h: 0.02,
      fill: { color: theme.cardBorder }, line: { type: "none" },
    });
  },

  renderTextSlide: (slide, content, theme, layout) => {
    const { pad: PAD, contentW: CW, contentY: CY, footerY: FY } = layout;
    const pts = content.keyPoints;
    const aH = FY - CY;
    if (pts.length <= 3) {
      const cH = (aH - 0.2 * (pts.length - 1)) / pts.length;
      pts.forEach((pt, i) => {
        const y = CY + i * (cH + 0.2);
        slide.addText(`${i + 1}`, { x: PAD, y: y + 0.1, w: 0.6, h: 0.6, fontSize: 20, bold: true, color: theme.accent, align: "center", valign: "middle", fontFace: "Calibri" });
        slide.addShape("rect", { x: PAD + 0.75, y: y + 0.1, w: 0.03, h: cH - 0.2, fill: { color: theme.cardBorder }, line: { type: "none" } });
        slide.addText(pt, { x: PAD + 1.0, y, w: CW - 1.2, h: cH, fontSize: 16, color: theme.text, align: "left", valign: "middle", wrap: true, fontFace: "Calibri", lineSpacingMultiple: 1.3 });
      });
    } else {
      const rows = pts.map((pt, i) => ({ text: pt, options: { bullet: { type: "bullet" as const, code: "25CF", color: theme.chart[i % theme.chart.length] }, fontSize: 15, color: theme.text, fontFace: "Calibri", paraSpaceAfter: 16, indentLevel: 0 } }));
      slide.addText(rows, { x: PAD, y: CY, w: CW, h: aH, align: "left", valign: "top", wrap: true });
    }
  },

  renderStatsSlide: (slide, content, theme, layout) => {
    const { pad: PAD, contentW: CW, contentY: CY, footerY: FY } = layout;
    const stats = content.stats!.slice(0, 4);
    const gap = 0.4;
    const cardW = (CW - gap * (stats.length - 1)) / stats.length;
    const cardH = FY - CY;
    stats.forEach((stat, i) => {
      const x = PAD + i * (cardW + gap);
      slide.addShape("rect", { x, y: CY, w: cardW, h: 0.04, fill: { color: theme.chart[i % theme.chart.length] }, line: { type: "none" } });
      slide.addText(stat.value, { x, y: CY + 0.3, w: cardW, h: cardH * 0.35, fontSize: 40, bold: true, color: theme.chart[i % theme.chart.length], align: "center", valign: "middle", fontFace: "Calibri" });
      slide.addText(stat.label, { x, y: CY + cardH * 0.45, w: cardW, h: 0.6, fontSize: 14, bold: true, color: theme.text, align: "center", valign: "middle", fontFace: "Calibri" });
      if (stat.description) {
        slide.addText(stat.description, { x: x + 0.2, y: CY + cardH * 0.6, w: cardW - 0.4, h: cardH * 0.35, fontSize: 11, color: theme.textLight, align: "center", valign: "top", wrap: true, fontFace: "Calibri" });
      }
    });
  },

  renderProcessSlide: (slide, content, theme, layout) => {
    const { pad: PAD, contentW: CW, contentY: CY, footerY: FY } = layout;
    const steps = content.processSteps!.slice(0, 5);
    const stepW = CW / steps.length;
    const lineY = CY + 0.8;
    // Connecting line
    slide.addShape("rect", { x: PAD + stepW / 2, y: lineY - 0.015, w: CW - stepW, h: 0.03, fill: { color: theme.cardBorder }, line: { type: "none" } });
    steps.forEach((step, i) => {
      const cx = PAD + stepW * i + stepW / 2;
      const col = theme.chart[i % theme.chart.length];
      // Circle node
      slide.addShape("ellipse", { x: cx - 0.4, y: lineY - 0.4, w: 0.8, h: 0.8, fill: { color: col }, line: { type: "none" } });
      slide.addText(`${step.stepNumber}`, { x: cx - 0.4, y: lineY - 0.4, w: 0.8, h: 0.8, fontSize: 16, bold: true, color: "FFFFFF", align: "center", valign: "middle", fontFace: "Calibri" });
      // Title below
      slide.addText(step.title, { x: cx - stepW / 2 + 0.1, y: lineY + 0.6, w: stepW - 0.2, h: 0.6, fontSize: 12, bold: true, color: theme.text, align: "center", valign: "top", wrap: true, fontFace: "Calibri" });
      // Description
      slide.addText(step.description, { x: cx - stepW / 2 + 0.1, y: lineY + 1.3, w: stepW - 0.2, h: FY - lineY - 1.5, fontSize: 10, color: theme.textLight, align: "center", valign: "top", wrap: true, fontFace: "Calibri" });
    });
  },

  renderIconGridSlide: (slide, content, theme, layout) => {
    const { pad: PAD, contentW: CW, contentY: CY, footerY: FY } = layout;
    const icons = content.icons!.slice(0, 6);
    const cols = icons.length <= 3 ? icons.length : Math.ceil(icons.length / 2);
    const rows = Math.ceil(icons.length / cols);
    const gap = 0.35;
    const cardW = (CW - gap * (cols - 1)) / cols;
    const cardH = (FY - CY - gap * (rows - 1)) / rows;
    icons.forEach((icon, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const x = PAD + c * (cardW + gap), y = CY + r * (cardH + gap);
      const col = theme.chart[i % theme.chart.length];
      slide.addShape("roundRect", { x, y, w: cardW, h: cardH, fill: { color: theme.card }, line: { color: theme.cardBorder, width: 1 }, rectRadius: 0.08 });
      slide.addShape("rect", { x, y, w: cardW, h: 0.08, fill: { color: col }, line: { type: "none" } });
      slide.addText(icon.label, { x: x + 0.15, y: y + 0.3, w: cardW - 0.3, h: 0.5, fontSize: 14, bold: true, color: theme.text, align: "left", valign: "middle", fontFace: "Calibri" });
      slide.addText(icon.description, { x: x + 0.15, y: y + 0.9, w: cardW - 0.3, h: cardH - 1.1, fontSize: 11, color: theme.textLight, align: "left", valign: "top", wrap: true, fontFace: "Calibri" });
    });
  },

  renderConclusionSlide: (slide, content, theme, layout) => {
    const cW = 9.0, cH = 4.5, cx = (SW - cW) / 2, cy = (SH - cH) / 2;
    slide.addShape("roundRect", { x: cx, y: cy, w: cW, h: cH, fill: { color: theme.card }, line: { color: theme.cardBorder, width: 1 }, rectRadius: 0.12 });
    slide.addShape("rect", { x: cx, y: cy, w: cW, h: 0.1, fill: { color: theme.accent }, line: { type: "none" } });
    slide.addText(content.title, { x: cx + 0.5, y: cy + 0.4, w: cW - 1, h: 1.5, fontSize: 30, bold: true, color: theme.text, align: "center", valign: "middle", fontFace: "Calibri", wrap: true });
    if (content.keyPoints?.length > 0) {
      const rows = content.keyPoints.map((pt) => ({ text: pt, options: { bullet: { type: "bullet" as const, code: "25CB", color: theme.accent }, fontSize: 14, color: theme.textLight, fontFace: "Calibri", paraSpaceAfter: 10 } }));
      slide.addText(rows, { x: cx + 0.8, y: cy + 2.0, w: cW - 1.6, h: cH - 2.4, align: "left", valign: "top", wrap: true });
    }
  },
};
