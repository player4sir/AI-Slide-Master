import { PPTXTemplate } from "./types.js";
import { flexGrid } from "../layout-engine.js";

const SW = 13.33;
const SH = 7.5;

export const AnnualReviewTemplate: PPTXTemplate = {
  id: "annual-review",
  name: "年终总结",
  description: "稳重的左右分割结构与强数据展示",
  coverUrl: "/templates/annual-review.jpg",
  baseTheme: "warm",
  layout: {
    pad: 0.8,
    contentW: 13.33 - 1.6,
    headerH: 1.0,
    contentY: 1.3,
    footerY: 7.0,
  },

  renderBackground: (slide, theme) => {
    slide.addShape("rect", { x: 0, y: 0, w: 0.12, h: SH, fill: { color: theme.primary }, line: { type: "none" } });
    slide.addShape("rect", { x: SW - 2, y: 0, w: 2, h: 0.12, fill: { color: theme.primary, transparency: 60 }, line: { type: "none" } });
  },

  renderTitleSlide: (_pptx, slide, content, theme) => {
    slide.addShape("rect", { x: 0, y: 0, w: 5.0, h: SH, fill: { color: theme.primary }, line: { type: "none" } });
    const year = new Date().getFullYear().toString();
    slide.addText(year, { x: 0.3, y: 2.5, w: 4.4, h: 2.0, fontSize: 80, bold: true, color: "FFFFFF", transparency: 75, align: "center", valign: "middle", fontFace: "Arial" });
    [1.5, 5.5].forEach(y => { slide.addShape("rect", { x: 0.5, y, w: 4.0, h: 0.02, fill: { color: "FFFFFF", transparency: 60 }, line: { type: "none" } }); });
    slide.addText(content.title, { x: 5.8, y: 2.0, w: 6.8, h: 2.5, fontSize: 40, bold: true, color: theme.text, align: "left", valign: "middle", fontFace: (theme.titleFont || "Calibri"), wrap: true });
    if (content.keyPoints?.length > 0 && content.keyPoints[0] !== "") {
      slide.addText(content.keyPoints[0], { x: 5.8, y: 4.8, w: 6.5, h: 1.0, fontSize: 16, color: theme.textLight, align: "left", valign: "top", fontFace: (theme.titleFont || "Calibri"), lineSpacingMultiple: 1.3 });
    }
  },

  renderSectionSlide: (slide, content, theme) => {
    slide.addShape("rect", { x: 0, y: 0, w: 3.5, h: SH, fill: { color: theme.primary, transparency: 90 }, line: { type: "none" } });
    slide.addShape("rect", { x: 3.5, y: 0, w: 0.08, h: SH, fill: { color: theme.primary }, line: { type: "none" } });
    slide.addText(content.title, { x: 4.5, y: 2.5, w: 8, h: 2.0, fontSize: 38, bold: true, color: theme.text, align: "left", valign: "middle", fontFace: (theme.titleFont || "Calibri"), wrap: true });
    if (content.keyPoints?.length > 0) {
      slide.addText(content.keyPoints[0], { x: 4.5, y: 4.8, w: 7.5, h: 0.8, fontSize: 16, color: theme.textLight, align: "left", valign: "top", fontFace: "Calibri" });
    }
  },

  renderContentSlideHeader: (slide, content, theme, layout) => {
    slide.addShape("rect", { x: 0, y: 0, w: "100%", h: layout.headerH, fill: { color: theme.primary }, line: { type: "none" } });
    slide.addText(content.title, { x: layout.pad + 0.2, y: 0, w: layout.contentW, h: layout.headerH, fontSize: 24, bold: true, color: "FFFFFF", align: "left", valign: "middle", fontFace: "Calibri" });
  },

  renderTextSlide: (slide, content, theme, layout) => {
    const { pad: PAD, contentW: CW, contentY: CY, footerY: FY } = layout;
    const pts = content.keyPoints;
    const aH = FY - CY;
    if (pts.length <= 2) {
      const gap = 0.5, cardW = (CW - gap) / 2;
      pts.forEach((pt, i) => {
        const x = PAD + i * (cardW + gap);
        const col = theme.chart[i % theme.chart.length];
        slide.addShape("roundRect", { x, y: CY, w: cardW, h: aH, fill: { color: theme.card }, line: { color: theme.cardBorder, width: 1 }, rectRadius: 0.1 });
        slide.addShape("rect", { x, y: CY, w: cardW, h: 0.14, fill: { color: col }, line: { type: "none" } });
        slide.addText(`0${i + 1}`, { x: x + 0.3, y: CY + 0.3, w: 1.0, h: 0.8, fontSize: 32, bold: true, color: col, transparency: 30, align: "left", valign: "middle", fontFace: "Arial" });
        slide.addText(pt, { x: x + 0.3, y: CY + 1.2, w: cardW - 0.6, h: aH - 1.5, fontSize: 15, color: theme.text, align: "left", valign: "top", wrap: true, fontFace: (theme.titleFont || "Calibri"), lineSpacingMultiple: 1.3 });
      });
    } else {
      slide.addShape("rect", { x: PAD, y: CY, w: 0.08, h: aH, fill: { color: theme.primary }, line: { type: "none" } });
      const iH = aH / pts.length;
      pts.forEach((pt, i) => {
        const y = CY + i * iH;
        const col = theme.chart[i % theme.chart.length];
        slide.addShape("ellipse", { x: PAD - 0.07, y: y + iH / 2 - 0.11, w: 0.22, h: 0.22, fill: { color: col }, line: { type: "none" } });
        slide.addText(pt, { x: PAD + 0.4, y, w: CW - 0.6, h: iH, fontSize: 15, color: theme.text, align: "left", valign: "middle", wrap: true, fontFace: "Calibri" });
      });
    }
  },

  renderStatsSlide: (slide, content, theme, layout) => {
    const stats = content.stats?.slice(0, 4) || [];
    const boxes = flexGrid({ x: layout.pad, y: layout.contentY, w: layout.contentW, h: layout.footerY - layout.contentY, count: stats.length, columns: stats.length >= 3 ? stats.length : 2, gapX: 0.35, gapY: 0.35 });
    stats.forEach((stat, i) => {
      const box = boxes[i];
      const col = theme.chart[i % theme.chart.length];
      slide.addShape("roundRect", { x: box.x, y: box.y, w: box.w, h: box.h, fill: { color: theme.card }, line: { color: theme.cardBorder, width: 1 }, rectRadius: 0.1 });
      slide.addShape("rect", { x: box.x, y: box.y, w: box.w, h: 0.12, fill: { color: col }, line: { type: "none" } });
      slide.addText(stat.value, { x: box.x + 0.2, y: box.y + 0.3, w: box.w - 0.4, h: box.h * 0.4, fontSize: 42, bold: true, color: col, align: "center", valign: "bottom", fontFace: "Arial" });
      slide.addText(stat.label, { x: box.x + 0.2, y: box.y + box.h * 0.55, w: box.w - 0.4, h: box.h * 0.25, fontSize: 16, color: theme.textLight, align: "center", valign: "top", fontFace: "Calibri" });
      if (stat.description) { slide.addText(stat.description, { x: box.x + 0.2, y: box.y + box.h * 0.78, w: box.w - 0.4, h: box.h * 0.18, fontSize: 11, color: theme.textLight, align: "center", valign: "top", wrap: true, fontFace: "Calibri" }); }
    });
  },

  renderProcessSlide: (slide, content, theme, layout) => {
    const { pad: PAD, contentW: CW, contentY: CY, footerY: FY } = layout;
    const steps = content.processSteps!.slice(0, 5);
    // Vertical timeline layout (annual review style)
    const stepH = (FY - CY) / steps.length;
    const timelineX = PAD + 1.2;
    // Vertical line
    slide.addShape("rect", { x: timelineX - 0.015, y: CY, w: 0.03, h: FY - CY, fill: { color: theme.primary }, line: { type: "none" } });
    steps.forEach((step, i) => {
      const y = CY + i * stepH;
      const col = theme.chart[i % theme.chart.length];
      // Node on timeline
      slide.addShape("ellipse", { x: timelineX - 0.25, y: y + stepH / 2 - 0.25, w: 0.5, h: 0.5, fill: { color: col }, line: { type: "none" } });
      slide.addText(`${step.stepNumber}`, { x: timelineX - 0.25, y: y + stepH / 2 - 0.25, w: 0.5, h: 0.5, fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle", fontFace: "Calibri" });
      // Content card
      slide.addText(step.title, { x: timelineX + 0.6, y: y + 0.1, w: CW - 2.0, h: 0.4, fontSize: 14, bold: true, color: theme.text, align: "left", valign: "middle", fontFace: "Calibri" });
      slide.addText(step.description, { x: timelineX + 0.6, y: y + 0.5, w: CW - 2.0, h: stepH - 0.7, fontSize: 11, color: theme.textLight, align: "left", valign: "top", wrap: true, fontFace: "Calibri" });
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
      // Left accent bar card
      slide.addShape("roundRect", { x, y, w: cardW, h: cardH, fill: { color: theme.card }, line: { color: theme.cardBorder, width: 1 }, rectRadius: 0.08 });
      slide.addShape("rect", { x, y, w: 0.1, h: cardH, fill: { color: col }, line: { type: "none" } });
      slide.addText(icon.label, { x: x + 0.3, y: y + 0.15, w: cardW - 0.5, h: 0.5, fontSize: 14, bold: true, color: theme.text, align: "left", valign: "middle", fontFace: "Calibri" });
      slide.addText(icon.description, { x: x + 0.3, y: y + 0.7, w: cardW - 0.5, h: cardH - 0.9, fontSize: 11, color: theme.textLight, align: "left", valign: "top", wrap: true, fontFace: "Calibri" });
    });
  },

  renderConclusionSlide: (slide, content, theme) => {
    slide.addShape("rect", { x: 0, y: 0, w: 4.5, h: SH, fill: { color: theme.primary }, line: { type: "none" } });
    slide.addText("总结", { x: 0.5, y: 2.5, w: 3.5, h: 2.0, fontSize: 60, bold: true, color: "FFFFFF", transparency: 50, align: "center", valign: "middle", fontFace: "Arial" });
    slide.addText(content.title, { x: 5.5, y: 1.5, w: 7.0, h: 2.0, fontSize: 32, bold: true, color: theme.text, align: "left", valign: "middle", fontFace: (theme.titleFont || "Calibri"), wrap: true });
    if (content.keyPoints?.length > 0) {
      const rows = content.keyPoints.map((pt) => ({ text: pt, options: { bullet: { type: "bullet" as const, code: "25CF", color: theme.primary }, fontSize: 14, color: theme.textLight, fontFace: (theme.titleFont || "Calibri"), paraSpaceAfter: 12 } }));
      slide.addText(rows, { x: 5.5, y: 3.8, w: 7.0, h: 3.0, align: "left", valign: "top", wrap: true });
    }
  },
};
