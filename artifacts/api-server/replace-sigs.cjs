const fs = require('fs');

let content = fs.readFileSync('src/lib/pptx-builder.ts', 'utf8');

// Add imports
content = content.replace(
  'import { resolvePresentationTheme } from "./ppt-theme.js";',
  'import { resolvePresentationTheme } from "./ppt-theme.js";\nimport { getTemplate, getDefaultTemplate } from "./templates/index.js";\nimport { SlideLayoutConfig } from "./templates/types.js";'
);

// Remove globals
content = content.replace(/const PAD = .*?\n/g, '');
content = content.replace(/const CW = .*?\n/g, '');
content = content.replace(/const HEADER_H = .*?\n/g, '');
content = content.replace(/const FOOTER_Y = .*?\n/g, '');
content = content.replace(/const CONTENT_Y = .*?\n/g, '');

const injectStr = `  const { pad: PAD, contentW: CW, headerH: HEADER_H, contentY: CONTENT_Y, footerY: FOOTER_Y } = layout;\n`;

// Update addSlideNumber
content = content.replace(
  /function addSlideNumber\(slide: PptxGenJS.Slide, number: number, theme: Theme\) \{/,
  `function addSlideNumber(slide: PptxGenJS.Slide, number: number, theme: Theme, layout: SlideLayoutConfig) {\n${injectStr}`
);

// Update addHeaderBar
content = content.replace(
  /function addHeaderBar\(slide: PptxGenJS.Slide, title: string, theme: Theme\) \{/,
  `function addHeaderBar(slide: PptxGenJS.Slide, title: string, theme: Theme, layout: SlideLayoutConfig) {\n${injectStr}`
);

// Update addFooterBar
content = content.replace(
  /function addFooterBar\(slide: PptxGenJS.Slide, theme: Theme\) \{/,
  `function addFooterBar(slide: PptxGenJS.Slide, theme: Theme, layout: SlideLayoutConfig) {\n${injectStr}`
);

// Update addDecorativeStrip
content = content.replace(
  /function addDecorativeStrip\(slide: PptxGenJS.Slide, theme: Theme\) \{/,
  `function addDecorativeStrip(slide: PptxGenJS.Slide, theme: Theme, layout: SlideLayoutConfig) {\n${injectStr}`
);

// General replacement for standard shape functions with `content`
const funcs1 = ['buildSectionSlide', 'buildStatsSlide', 'buildProcessSlide', 'buildComparisonSlide', 'buildIconGridSlide', 'buildTextSlide', 'buildConclusionSlide'];
funcs1.forEach(f => {
  const regex = new RegExp(`function ${f}\\(slide: PptxGenJS\\.Slide, content: SlideContent, theme: Theme\\) \\{`);
  content = content.replace(
    regex,
    `function ${f}(slide: PptxGenJS.Slide, content: SlideContent, theme: Theme, layout: SlideLayoutConfig) {\n${injectStr}`
  );
});

// General replacement for pptx functions
const funcs2 = ['buildTitleSlide', 'buildContentSlide', 'buildChartSlide'];
funcs2.forEach(f => {
  const regex = new RegExp(`function ${f}\\(pptx: PptxGenJS, slide: PptxGenJS\\.Slide, content: SlideContent, theme: Theme\\) \\{`);
  content = content.replace(
    regex,
    `function ${f}(pptx: PptxGenJS, slide: PptxGenJS.Slide, content: SlideContent, theme: Theme, layout: SlideLayoutConfig) {\n${injectStr}`
  );
});

fs.writeFileSync('src/lib/pptx-builder.ts', content, 'utf8');
console.log('done');
