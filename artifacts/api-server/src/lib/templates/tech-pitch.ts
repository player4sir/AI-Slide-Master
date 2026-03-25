import { PPTXTemplate } from "./types.js";

const SW = 13.33;
const SH = 7.5;

export const TechPitchTemplate: PPTXTemplate = {
  id: "tech-pitch",
  name: "科技路演",
  description: "充满无界感和未来感的大胆布局",
  coverUrl: "/templates/tech-pitch.jpg",
  baseTheme: "creative",
  layout: {
    pad: 1.0,
    contentW: 13.33 - 2.0,
    headerH: 1.2,
    contentY: 1.6,
    footerY: 6.8,
  },

  renderBackground: (slide, theme) => {
    slide.addShape("ellipse", { x: SW - 3, y: -1.5, w: 4, h: 4, fill: { color: theme.primary, transparency: 90 }, line: { type: "none" } });
    slide.addShape("ellipse", { x: -1.5, y: SH - 3, w: 3.5, h: 3.5, fill: { color: theme.accent, transparency: 92 }, line: { type: "none" } });
    slide.addShape("rect", { x: 0, y: SH - 0.08, w: "100%", h: 0.08, fill: { color: theme.primary }, line: { type: "none" } });
  },

  renderTitleSlide: (_pptx, slide, content, theme) => {
    slide.addShape("ellipse", { x: SW / 2 - 5, y: SH / 2 - 5, w: 10, h: 10, fill: { color: theme.primary, transparency: 85 }, line: { type: "none" } });
    slide.addShape("ellipse", { x: SW / 2 - 3, y: SH / 2 - 3, w: 6, h: 6, fill: { type: "none" }, line: { color: theme.primary, width: 1 } });
    [{ x: 1.5, y: 1.5, r: 0.3 }, { x: SW - 2, y: 2, r: 0.2 }, { x: 2, y: SH - 2, r: 0.15 }, { x: SW - 1.5, y: SH - 1.5, r: 0.25 }].forEach(d => {
      slide.addShape("ellipse", { x: d.x, y: d.y, w: d.r * 2, h: d.r * 2, fill: { color: theme.accent, transparency: 70 }, line: { type: "none" } });
    });
    slide.addText(content.title, { x: 1.5, y: 1.5, w: SW - 3, h: 3.0, fontSize: 52, bold: true, color: theme.text, align: "center", valign: "middle", fontFace: (theme.titleFont || "Calibri"), wrap: true });
    if (content.keyPoints?.length > 0 && content.keyPoints[0] !== "") {
      slide.addShape("roundRect", { x: (SW - 6) / 2, y: 5.0, w: 6, h: 0.5, fill: { color: theme.accent, transparency: 60 }, line: { type: "none" }, rectRadius: 0.25 });
      slide.addText(content.keyPoints[0], { x: (SW - 6) / 2, y: 5.0, w: 6, h: 0.5, fontSize: 14, color: theme.text, bold: true, align: "center", valign: "middle", fontFace: "Calibri" });
    }
  },

  renderSectionSlide: (slide, content, theme) => {
    slide.addShape("rect", { x: 0, y: 2.5, w: SW, h: 2.5, fill: { color: theme.primary, transparency: 80 }, line: { type: "none" } });
    slide.addShape("rect", { x: 0, y: 2.5, w: SW, h: 0.06, fill: { color: theme.primary }, line: { type: "none" } });
    slide.addShape("rect", { x: 0, y: 4.94, w: SW, h: 0.06, fill: { color: theme.primary }, line: { type: "none" } });
    slide.addText(content.title, { x: 1, y: 2.6, w: SW - 2, h: 2.3, fontSize: 42, bold: true, color: theme.text, align: "center", valign: "middle", fontFace: (theme.titleFont || "Calibri"), wrap: true });
    if (content.keyPoints?.length > 0) {
      slide.addText(content.keyPoints[0], { x: 2, y: 5.3, w: SW - 4, h: 0.8, fontSize: 16, color: theme.textLight, align: "center", valign: "top", fontFace: "Calibri" });
    }
  },

  renderContentSlideHeader: (slide, content, theme, layout) => {
    slide.addText(content.title, { x: layout.pad, y: 0.15, w: layout.contentW, h: layout.headerH, fontSize: 32, bold: true, color: theme.text, align: "center", valign: "middle", fontFace: "Calibri" });
    const lineW = 2.0;
    slide.addShape("rect", { x: (SW - lineW) / 2, y: layout.headerH + 0.2, w: lineW, h: 0.05, fill: { color: theme.primary }, line: { type: "none" } });
  },

  renderTextSlide: (slide, content, theme, layout) => {
    const { pad: PAD, contentW: CW, contentY: CY, footerY: FY } = layout;
    const pts = content.keyPoints;
    const aH = FY - CY;
    if (pts.length <= 4) {
      const cH = (aH - 0.25 * (pts.length - 1)) / pts.length;
      pts.forEach((pt, i) => {
        const y = CY + i * (cH + 0.25);
        const col = theme.chart[i % theme.chart.length];
        slide.addShape("roundRect", { x: PAD, y, w: CW, h: cH, fill: { color: theme.card }, line: { color: theme.cardBorder, width: 0.8 }, rectRadius: 0.08 });
        slide.addShape("rect", { x: PAD, y, w: 0.12, h: cH, fill: { color: col }, line: { type: "none" } });
        slide.addText(pt, { x: PAD + 0.4, y, w: CW - 0.6, h: cH, fontSize: 15, color: theme.text, align: "left", valign: "middle", wrap: true, fontFace: (theme.titleFont || "Calibri"), lineSpacingMultiple: 1.25 });
      });
    } else {
      const cols = 2, gap = 0.3, rows = Math.ceil(pts.length / cols);
      const cardW = (CW - gap) / cols, cardH = (aH - gap * (rows - 1)) / rows;
      pts.forEach((pt, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        const x = PAD + c * (cardW + gap), y = CY + r * (cardH + gap);
        slide.addShape("roundRect", { x, y, w: cardW, h: cardH, fill: { color: theme.card }, line: { color: theme.cardBorder, width: 0.8 }, rectRadius: 0.08 });
        slide.addShape("rect", { x, y, w: cardW, h: 0.08, fill: { color: theme.chart[i % theme.chart.length] }, line: { type: "none" } });
        slide.addText(pt, { x: x + 0.2, y: y + 0.15, w: cardW - 0.4, h: cardH - 0.3, fontSize: 13, color: theme.text, align: "left", valign: "middle", wrap: true, fontFace: "Calibri" });
      });
    }
  },

  renderStatsSlide: (slide, content, theme, layout) => {
    const { pad: PAD, contentW: CW, contentY: CY, footerY: FY } = layout;
    const stats = content.stats!.slice(0, 4);
    const gap = 0.3;
    const cardW = (CW - gap * (stats.length - 1)) / stats.length;
    const cardH = FY - CY;
    stats.forEach((stat, i) => {
      const x = PAD + i * (cardW + gap);
      const col = theme.chart[i % theme.chart.length];
      // Dark card with glowing border
      slide.addShape("roundRect", { x, y: CY, w: cardW, h: cardH, fill: { color: theme.card }, line: { color: col, width: 1.5 }, rectRadius: 0.1 });
      // Glow effect (larger semi-transparent shape behind)
      slide.addShape("roundRect", { x: x - 0.05, y: CY - 0.05, w: cardW + 0.1, h: cardH + 0.1, fill: { color: col, transparency: 92 }, line: { type: "none" }, rectRadius: 0.12 });
      // Re-draw card on top
      slide.addShape("roundRect", { x, y: CY, w: cardW, h: cardH, fill: { color: theme.card }, line: { color: col, width: 1.2 }, rectRadius: 0.1 });
      slide.addText(stat.value, { x, y: CY + 0.3, w: cardW, h: cardH * 0.35, fontSize: 42, bold: true, color: col, align: "center", valign: "middle", fontFace: "Arial" });
      slide.addText(stat.label, { x, y: CY + cardH * 0.48, w: cardW, h: 0.6, fontSize: 14, bold: true, color: theme.text, align: "center", valign: "middle", fontFace: "Calibri" });
      if (stat.description) {
        slide.addText(stat.description, { x: x + 0.15, y: CY + cardH * 0.65, w: cardW - 0.3, h: cardH * 0.3, fontSize: 10, color: theme.textLight, align: "center", valign: "top", wrap: true, fontFace: "Calibri" });
      }
    });
  },

  renderProcessSlide: (slide, content, theme, layout) => {
    const { pad: PAD, contentW: CW, contentY: CY, footerY: FY } = layout;
    const steps = content.processSteps!.slice(0, 5);
    const stepW = CW / steps.length;
    const circSize = 1.6;
    const circY = CY + 0.2;
    steps.forEach((step, i) => {
      const cx = PAD + stepW * i + stepW / 2;
      const col = theme.chart[i % theme.chart.length];
      // Connector
      if (i < steps.length - 1) {
        slide.addShape("rect", { x: cx + circSize / 2, y: circY + circSize / 2 - 0.02, w: stepW - circSize, h: 0.04, fill: { color: col, transparency: 50 }, line: { type: "none" } });
      }
      // Circle
      slide.addShape("ellipse", { x: cx - circSize / 2, y: circY, w: circSize, h: circSize, fill: { color: col }, line: { type: "none" } });
      slide.addText(`${step.stepNumber}`, { x: cx - circSize / 2, y: circY, w: circSize, h: circSize, fontSize: 28, bold: true, color: "FFFFFF", align: "center", valign: "middle", fontFace: "Calibri" });
      // Title
      slide.addText(step.title, { x: cx - stepW / 2 + 0.1, y: circY + circSize + 0.15, w: stepW - 0.2, h: 0.55, fontSize: 12, bold: true, color: theme.text, align: "center", valign: "top", wrap: true, fontFace: "Calibri" });
      // Description card
      const descY = circY + circSize + 0.8;
      slide.addShape("roundRect", { x: cx - stepW / 2 + 0.05, y: descY, w: stepW - 0.1, h: FY - descY - 0.1, fill: { color: theme.card }, line: { color: theme.cardBorder, width: 0.8 }, rectRadius: 0.06 });
      slide.addText(step.description, { x: cx - stepW / 2 + 0.15, y: descY + 0.1, w: stepW - 0.3, h: FY - descY - 0.2, fontSize: 10, color: theme.textLight, align: "center", valign: "top", wrap: true, fontFace: "Calibri" });
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
      slide.addShape("roundRect", { x, y, w: cardW, h: cardH, fill: { color: theme.card }, line: { color: col, width: 1.2 }, rectRadius: 0.08 });
      // Accent top
      slide.addShape("rect", { x, y, w: cardW, h: 0.1, fill: { color: col }, line: { type: "none" } });
      // Icon circle
      const cSz = 0.9;
      slide.addShape("ellipse", { x: x + (cardW - cSz) / 2, y: y + 0.25, w: cSz, h: cSz, fill: { color: col, transparency: 80 }, line: { type: "none" } });
      slide.addText(icon.label, { x: x + 0.15, y: y + cSz + 0.35, w: cardW - 0.3, h: 0.45, fontSize: 13, bold: true, color: theme.text, align: "center", valign: "middle", fontFace: "Calibri" });
      slide.addText(icon.description, { x: x + 0.15, y: y + cSz + 0.85, w: cardW - 0.3, h: cardH - cSz - 1.1, fontSize: 10, color: theme.textLight, align: "center", valign: "top", wrap: true, fontFace: "Calibri" });
    });
  },

  renderConclusionSlide: (slide, content, theme) => {
    slide.addShape("ellipse", { x: SW / 2 - 4, y: SH / 2 - 4, w: 8, h: 8, fill: { type: "none" }, line: { color: theme.primary, width: 0.5 } });
    slide.addShape("ellipse", { x: SW / 2 - 3, y: SH / 2 - 3, w: 6, h: 6, fill: { color: theme.primary, transparency: 90 }, line: { type: "none" } });
    slide.addText(content.title, { x: 2, y: 2.0, w: SW - 4, h: 2.0, fontSize: 36, bold: true, color: theme.text, align: "center", valign: "middle", fontFace: (theme.titleFont || "Calibri"), wrap: true });
    if (content.keyPoints?.length > 0) {
      slide.addShape("rect", { x: (SW - 2) / 2, y: 4.2, w: 2, h: 0.04, fill: { color: theme.primary }, line: { type: "none" } });
      const rows = content.keyPoints.map((pt) => ({ text: pt, options: { bullet: { type: "bullet" as const, code: "25AA", color: theme.accent }, fontSize: 14, color: theme.textLight, fontFace: (theme.titleFont || "Calibri"), paraSpaceAfter: 10 } }));
      slide.addText(rows, { x: 2.5, y: 4.5, w: SW - 5, h: 2.5, align: "center", valign: "top", wrap: true });
    }
  },
};
