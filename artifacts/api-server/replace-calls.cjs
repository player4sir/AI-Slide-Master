const fs = require('fs');

let content = fs.readFileSync('src/lib/pptx-builder.ts', 'utf8');

// Update buildPPTX signature
content = content.replace(
  /export async function buildPPTX\(outline: PPTOutline, style: string\): Promise<string> \{([\s\S]*?)for \(const slide of outline\.slides\) \{/,
  `export async function buildPPTX(outline: PPTOutline, templateId?: string): Promise<string> {
  const template = getTemplate(templateId || outline.themePreset || "minimal-corporate") || getDefaultTemplate();
  const theme = resolvePresentationTheme(template.baseTheme, outline.primaryColor);
  const layout = template.layout;

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = outline.presentationTitle;
  pptx.author = "AI PPT 生成平台";

  for (const slide of outline.slides) {`
);

// Update buildPPTX loop body
content = content.replace(
  /    if \(slide\.slideType === "title"\) \{([\s\S]*?)    \}/,
  `    if (template.renderBackground) {
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
      buildContentSlide(pptx, pSlide, slide, theme, layout, template);
    }`
);

// Update buildContentSlide calls
content = content.replace(
  /function buildContentSlide\(pptx: PptxGenJS, slide: PptxGenJS.Slide, content: SlideContent, theme: Theme, layout: SlideLayoutConfig\) \{([\s\S]*?)const vt = content.visualType;/,
  `function buildContentSlide(pptx: PptxGenJS, slide: PptxGenJS.Slide, content: SlideContent, theme: Theme, layout: SlideLayoutConfig, template?: import("./templates/types.js").PPTXTemplate) {
  const { pad: PAD, contentW: CW, headerH: HEADER_H, contentY: CONTENT_Y, footerY: FOOTER_Y } = layout;

  if (template?.renderContentSlideHeader) template.renderContentSlideHeader(slide, content, theme, layout);
  else addHeaderBar(slide, content.title, theme, layout);
  
  if (template?.renderContentSlideFooter) template.renderContentSlideFooter(slide, content, theme, layout);
  else addFooterBar(slide, theme, layout);
  
  addSlideNumber(slide, content.slideNumber, theme, layout);

  const vt = content.visualType;`
);

// Update internal renderer calls inside buildContentSlide
content = content.replace(/buildChartSlide\(pptx, slide, content, theme\)/g, 'template?.renderChartSlide ? template.renderChartSlide(pptx, slide, content, theme, layout) : buildChartSlide(pptx, slide, content, theme, layout)');
content = content.replace(/buildStatsSlide\(slide, content, theme\)/g, 'template?.renderStatsSlide ? template.renderStatsSlide(slide, content, theme, layout) : buildStatsSlide(slide, content, theme, layout)');
content = content.replace(/buildProcessSlide\(slide, content, theme\)/g, 'template?.renderProcessSlide ? template.renderProcessSlide(slide, content, theme, layout) : buildProcessSlide(slide, content, theme, layout)');
content = content.replace(/buildComparisonSlide\(slide, content, theme\)/g, 'template?.renderComparisonSlide ? template.renderComparisonSlide(slide, content, theme, layout) : buildComparisonSlide(slide, content, theme, layout)');
content = content.replace(/buildIconGridSlide\(slide, content, theme\)/g, 'template?.renderIconGridSlide ? template.renderIconGridSlide(slide, content, theme, layout) : buildIconGridSlide(slide, content, theme, layout)');
content = content.replace(/buildTextSlide\(slide, content, theme\)/g, 'template?.renderTextSlide ? template.renderTextSlide(slide, content, theme, layout) : buildTextSlide(slide, content, theme, layout)');

fs.writeFileSync('src/lib/pptx-builder.ts', content, 'utf8');
console.log('done calls');
