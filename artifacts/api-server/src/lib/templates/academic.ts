import { PPTXTemplate } from "./types.js";

const SW = 13.33;
const SH = 7.5;

export const AcademicTemplate: PPTXTemplate = {
  id: "academic",
  name: "学术答辩",
  description: "严谨而雅致的学术风格，翡翠绿色调",
  coverUrl: "/templates/academic.jpg",
  baseTheme: "academic",
  layout: {
    pad: 1.0,
    contentW: SW - 2.0,
    headerH: 0.9,
    contentY: 1.3,
    footerY: 6.9,
  },

  renderBackground: (slide, theme) => {
    // Thin double-line top border
    slide.addShape("rect", { x: 0, y: 0, w: SW, h: 0.04, fill: { color: theme.primary }, line: { type: "none" } });
    slide.addShape("rect", { x: 0, y: 0.08, w: SW, h: 0.015, fill: { color: theme.primary, transparency: 50 }, line: { type: "none" } });
    // Bottom mirror
    slide.addShape("rect", { x: 0, y: SH - 0.04, w: SW, h: 0.04, fill: { color: theme.primary }, line: { type: "none" } });
    slide.addShape("rect", { x: 0, y: SH - 0.095, w: SW, h: 0.015, fill: { color: theme.primary, transparency: 50 }, line: { type: "none" } });
  },

  renderTitleSlide: (_pptx, slide, content, theme, layout) => {
    // Classic academic: centered title with decorative rules
    const ruleW = 5;
    slide.addShape("rect", { x: (SW - ruleW) / 2, y: 2.3, w: ruleW, h: 0.04, fill: { color: theme.primary }, line: { type: "none" } });
    slide.addText(content.title, {
      x: 1.5, y: 2.5, w: SW - 3, h: 2.0,
      fontSize: 40, bold: true, color: theme.text, align: "center", valign: "middle", fontFace: (theme.titleFont || "Calibri"), wrap: true,
    });
    slide.addShape("rect", { x: (SW - ruleW) / 2, y: 4.7, w: ruleW, h: 0.04, fill: { color: theme.primary }, line: { type: "none" } });

    if (content.keyPoints?.length > 0 && content.keyPoints[0] !== "") {
      slide.addText(content.keyPoints[0], {
        x: 2, y: 5.0, w: SW - 4, h: 1.0,
        fontSize: 18, color: theme.textLight, align: "center", valign: "top", fontFace: (theme.titleFont || "Calibri"), lineSpacingMultiple: 1.3,
      });
    }

    // Badge/shield decoration
    slide.addShape("ellipse", { x: (SW - 1.2) / 2, y: 1.0, w: 1.2, h: 1.2, fill: { color: theme.primary, transparency: 90 }, line: { color: theme.primary, width: 1 } });
  },

  renderSectionSlide: (slide, content, theme) => {
    // Full-width accent bar
    slide.addShape("rect", { x: 0, y: 3.0, w: SW, h: 1.8, fill: { color: theme.primary }, line: { type: "none" } });
    slide.addText(content.title, {
      x: 1, y: 3.0, w: SW - 2, h: 1.8,
      fontSize: 36, bold: true, color: "FFFFFF", align: "center", valign: "middle", fontFace: (theme.titleFont || "Calibri"), wrap: true,
    });
    if (content.keyPoints?.length > 0) {
      slide.addText(content.keyPoints[0], {
        x: 2, y: 5.0, w: SW - 4, h: 0.8,
        fontSize: 16, color: theme.textLight, align: "center", valign: "top", fontFace: (theme.titleFont || "Calibri"),
      });
    }
  },

  renderContentSlideHeader: (slide, content, theme, layout) => {
    // Clean academic header with left accent
    slide.addShape("rect", { x: layout.pad, y: 0.25, w: 0.1, h: 0.6, fill: { color: theme.primary }, line: { type: "none" } });
    slide.addText(content.title, {
      x: layout.pad + 0.3, y: 0.2, w: layout.contentW - 0.3, h: layout.headerH,
      fontSize: 26, bold: true, color: theme.text, align: "left", valign: "middle", fontFace: (theme.titleFont || "Calibri"),
    });
    slide.addShape("rect", { x: layout.pad, y: layout.headerH + 0.2, w: layout.contentW, h: 0.015, fill: { color: theme.primary }, line: { type: "none" } });
  },

  renderTextSlide: (slide, content, theme, layout) => {
    const { pad: PAD, contentW: CW, contentY: CY, footerY: FY } = layout;
    const pts = content.keyPoints;
    const aH = FY - CY;
    // Academic style: indented paragraphs with section markers
    const iH = aH / pts.length;
    pts.forEach((pt, i) => {
      const y = CY + i * iH;
      const col = theme.chart[i % theme.chart.length];
      // Section marker
      slide.addShape("rect", { x: PAD, y: y + 0.15, w: 0.08, h: 0.5, fill: { color: col }, line: { type: "none" } });
      slide.addText(pt, {
        x: PAD + 0.3, y, w: CW - 0.5, h: iH,
        fontSize: 15, color: theme.text, align: "left", valign: "middle", wrap: true, fontFace: (theme.titleFont || "Calibri"), lineSpacingMultiple: 1.3,
      });
      // Bottom separator
      if (i < pts.length - 1) {
        slide.addShape("rect", { x: PAD + 0.3, y: y + iH - 0.02, w: CW - 0.6, h: 0.01, fill: { color: theme.cardBorder }, line: { type: "none" } });
      }
    });
  },

  renderStatsSlide: (slide, content, theme, layout) => {
    const { pad: PAD, contentW: CW, contentY: CY, footerY: FY } = layout;
    const stats = content.stats!.slice(0, 4);
    const gap = 0.4;
    const cW = (CW - gap * (stats.length - 1)) / stats.length;
    const cH = FY - CY;
    stats.forEach((stat, i) => {
      const x = PAD + i * (cW + gap);
      const col = theme.chart[i % theme.chart.length];
      // Clean bordered card
      slide.addShape("roundRect", { x, y: CY, w: cW, h: cH, fill: { color: theme.card }, line: { color: theme.primary, width: 1 }, rectRadius: 0.06 });
      // Top double-line accent
      slide.addShape("rect", { x, y: CY, w: cW, h: 0.05, fill: { color: col }, line: { type: "none" } });
      slide.addShape("rect", { x, y: CY + 0.08, w: cW, h: 0.02, fill: { color: col, transparency: 50 }, line: { type: "none" } });
      slide.addText(stat.value, { x, y: CY + 0.3, w: cW, h: cH * 0.35, fontSize: 38, bold: true, color: col, align: "center", valign: "middle", fontFace: "Calibri" });
      slide.addText(stat.label, { x, y: CY + cH * 0.48, w: cW, h: 0.6, fontSize: 13, bold: true, color: theme.text, align: "center", valign: "middle", fontFace: "Calibri" });
      if (stat.description) { slide.addText(stat.description, { x: x + 0.1, y: CY + cH * 0.65, w: cW - 0.2, h: cH * 0.3, fontSize: 10, color: theme.textLight, align: "center", valign: "top", wrap: true, fontFace: "Calibri" }); }
    });
  },

  renderProcessSlide: (slide, content, theme, layout) => {
    const { pad: PAD, contentW: CW, contentY: CY, footerY: FY } = layout;
    const steps = content.processSteps!.slice(0, 5);
    const sW = CW / steps.length;
    const arrowY = CY + 0.7;
    // Connecting arrow line
    slide.addShape("rect", { x: PAD + sW / 2, y: arrowY, w: CW - sW, h: 0.03, fill: { color: theme.primary }, line: { type: "none" } });
    steps.forEach((step, i) => {
      const cx = PAD + sW * i + sW / 2;
      const col = theme.chart[i % theme.chart.length];
      // Circle node
      const nd = 1.0;
      slide.addShape("ellipse", { x: cx - nd / 2, y: arrowY - nd / 2 + 0.015, w: nd, h: nd, fill: { color: "FFFFFF" }, line: { color: col, width: 2 } });
      slide.addText(`${step.stepNumber}`, { x: cx - nd / 2, y: arrowY - nd / 2 + 0.015, w: nd, h: nd, fontSize: 18, bold: true, color: col, align: "center", valign: "middle", fontFace: "Calibri" });
      // Arrow head
      if (i < steps.length - 1) {
        slide.addShape("rect", { x: cx + sW / 2 + sW / 2 - nd / 2 - 0.15, y: arrowY - 0.06, w: 0.15, h: 0.15, fill: { color: theme.primary }, line: { type: "none" } });
      }
      // Title + description
      slide.addText(step.title, { x: cx - sW / 2 + 0.05, y: arrowY + nd / 2 + 0.2, w: sW - 0.1, h: 0.5, fontSize: 12, bold: true, color: theme.text, align: "center", valign: "top", wrap: true, fontFace: "Calibri" });
      slide.addText(step.description, { x: cx - sW / 2 + 0.05, y: arrowY + nd / 2 + 0.8, w: sW - 0.1, h: FY - arrowY - nd / 2 - 1.0, fontSize: 10, color: theme.textLight, align: "center", valign: "top", wrap: true, fontFace: "Calibri" });
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
      // Clean card with double border
      slide.addShape("roundRect", { x, y, w: cardW, h: cardH, fill: { color: theme.card }, line: { color: col, width: 1.5 }, rectRadius: 0.06 });
      // Top double accent
      slide.addShape("rect", { x, y, w: cardW, h: 0.04, fill: { color: col }, line: { type: "none" } });
      slide.addShape("rect", { x, y: y + 0.06, w: cardW, h: 0.015, fill: { color: col, transparency: 50 }, line: { type: "none" } });
      slide.addText(icon.label, { x: x + 0.2, y: y + 0.2, w: cardW - 0.4, h: 0.5, fontSize: 14, bold: true, color: theme.text, align: "left", valign: "middle", fontFace: "Calibri" });
      slide.addText(icon.description, { x: x + 0.2, y: y + 0.75, w: cardW - 0.4, h: cardH - 1.0, fontSize: 11, color: theme.textLight, align: "left", valign: "top", wrap: true, fontFace: "Calibri" });
    });
  },

  renderConclusionSlide: (slide, content, theme) => {
    // Full-width primary bar
    slide.addShape("rect", { x: 0, y: 1.5, w: SW, h: 2.0, fill: { color: theme.primary }, line: { type: "none" } });
    slide.addText(content.title, { x: 1.5, y: 1.5, w: SW - 3, h: 2.0, fontSize: 32, bold: true, color: "FFFFFF", align: "center", valign: "middle", fontFace: (theme.titleFont || "Calibri"), wrap: true });
    if (content.keyPoints?.length > 0) {
      const rows = content.keyPoints.map((pt) => ({ text: pt, options: { bullet: { type: "bullet" as const, code: "25AA", color: theme.primary }, fontSize: 14, color: theme.text, fontFace: (theme.titleFont || "Calibri"), paraSpaceAfter: 12 } }));
      slide.addText(rows, { x: 2, y: 4.0, w: SW - 4, h: 2.5, align: "left", valign: "top", wrap: true });
    }
  },
};
