import PptxGenJS from "pptxgenjs";
import type { SlideContent, PPTOutline } from "./deepseek.js";
import path from "path";
import os from "os";

const THEME_COLORS = {
  professional: {
    background: "FFFFFF",
    primary: "1E3A5F",
    secondary: "2E86AB",
    accent: "A23B72",
    text: "1A1A2E",
    textLight: "6B7280",
    bullet: "2E86AB",
  },
  creative: {
    background: "0F0E17",
    primary: "FF8906",
    secondary: "F25F4C",
    accent: "E53170",
    text: "FFFFFE",
    textLight: "A7A9BE",
    bullet: "FF8906",
  },
  minimal: {
    background: "FAFAFA",
    primary: "111111",
    secondary: "555555",
    accent: "0066FF",
    text: "111111",
    textLight: "888888",
    bullet: "0066FF",
  },
  academic: {
    background: "FFFFFF",
    primary: "1B4332",
    secondary: "2D6A4F",
    accent: "74C69D",
    text: "1B4332",
    textLight: "6B7280",
    bullet: "2D6A4F",
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
      buildTitleSlide(pSlide, slide, theme);
    } else if (slide.slideType === "section") {
      buildSectionSlide(pSlide, slide, theme);
    } else if (slide.slideType === "conclusion" || slide.slideType === "qa") {
      buildConclusionSlide(pSlide, slide, theme);
    } else {
      buildContentSlide(pSlide, slide, theme);
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

function buildTitleSlide(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme) {
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: "100%",
    h: "55%",
    fill: { color: theme.primary },
    line: { type: "none" },
  });

  slide.addShape("rect", {
    x: 0,
    y: "52%",
    w: "100%",
    h: "5%",
    fill: { color: theme.secondary },
    line: { type: "none" },
  });

  slide.addText(content.title, {
    x: "8%",
    y: "12%",
    w: "84%",
    h: "35%",
    fontSize: 36,
    bold: true,
    color: "FFFFFF",
    align: "left",
    valign: "middle",
    wrap: true,
    fontFace: "Calibri",
  });

  if (content.keyPoints && content.keyPoints.length > 0) {
    slide.addText(content.keyPoints[0], {
      x: "8%",
      y: "60%",
      w: "84%",
      h: "15%",
      fontSize: 18,
      color: theme.text,
      align: "left",
      valign: "top",
      wrap: true,
      fontFace: "Calibri",
    });
  }

  slide.addText("AI PPT 生成平台", {
    x: "8%",
    y: "85%",
    w: "84%",
    h: "8%",
    fontSize: 11,
    color: theme.textLight,
    align: "left",
    fontFace: "Calibri",
  });
}

function buildSectionSlide(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme) {
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: "8%",
    h: "100%",
    fill: { color: theme.secondary },
    line: { type: "none" },
  });

  slide.addShape("rect", {
    x: "8%",
    y: "35%",
    w: "92%",
    h: "2%",
    fill: { color: theme.accent },
    line: { type: "none" },
  });

  slide.addText(content.title, {
    x: "12%",
    y: "20%",
    w: "82%",
    h: "35%",
    fontSize: 32,
    bold: true,
    color: theme.primary,
    align: "left",
    valign: "bottom",
    wrap: true,
    fontFace: "Calibri",
  });

  if (content.keyPoints && content.keyPoints.length > 0) {
    slide.addText(content.keyPoints[0], {
      x: "12%",
      y: "55%",
      w: "82%",
      h: "20%",
      fontSize: 16,
      color: theme.textLight,
      align: "left",
      valign: "top",
      wrap: true,
      fontFace: "Calibri",
    });
  }
}

function buildContentSlide(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme) {
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: "100%",
    h: "18%",
    fill: { color: theme.primary },
    line: { type: "none" },
  });

  slide.addText(content.title, {
    x: "5%",
    y: "0%",
    w: "90%",
    h: "18%",
    fontSize: 22,
    bold: true,
    color: "FFFFFF",
    align: "left",
    valign: "middle",
    fontFace: "Calibri",
  });

  slide.addText(`${content.slideNumber}`, {
    x: "92%",
    y: "0%",
    w: "8%",
    h: "18%",
    fontSize: 12,
    color: "FFFFFF",
    align: "right",
    valign: "middle",
    fontFace: "Calibri",
    transparency: 40,
  });

  if (content.keyPoints && content.keyPoints.length > 0) {
    const bulletRows = content.keyPoints.map((point) => ({
      text: point,
      options: {
        bullet: { type: "bullet" as const, code: "2022", color: theme.bullet },
        fontSize: 15,
        color: theme.text,
        fontFace: "Calibri",
        paraSpaceAfter: 12,
        indentLevel: 0,
      },
    }));

    slide.addText(bulletRows, {
      x: "5%",
      y: "22%",
      w: "90%",
      h: "72%",
      align: "left",
      valign: "top",
      wrap: true,
    });
  }

  slide.addShape("rect", {
    x: 0,
    y: "97%",
    w: "100%",
    h: "3%",
    fill: { color: theme.secondary },
    line: { type: "none" },
    transparency: 50,
  });
}

function buildConclusionSlide(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme) {
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: "100%",
    h: "100%",
    fill: { color: theme.primary },
    line: { type: "none" },
  });

  slide.addShape("rect", {
    x: "5%",
    y: "5%",
    w: "90%",
    h: "90%",
    fill: { color: theme.secondary },
    line: { type: "none" },
    transparency: 85,
  });

  slide.addText(content.title, {
    x: "10%",
    y: "25%",
    w: "80%",
    h: "20%",
    fontSize: 30,
    bold: true,
    color: "FFFFFF",
    align: "center",
    valign: "middle",
    fontFace: "Calibri",
  });

  if (content.keyPoints && content.keyPoints.length > 0) {
    const bulletRows = content.keyPoints.map((point) => ({
      text: point,
      options: {
        bullet: { type: "bullet" as const, code: "2022", color: theme.accent },
        fontSize: 14,
        color: "EFEFEF",
        fontFace: "Calibri",
        paraSpaceAfter: 10,
      },
    }));

    slide.addText(bulletRows, {
      x: "10%",
      y: "48%",
      w: "80%",
      h: "40%",
      align: "center",
      valign: "top",
      wrap: true,
    });
  }
}
