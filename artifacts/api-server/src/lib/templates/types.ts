import PptxGenJS from "pptxgenjs";
import { SlideContent } from "../deepseek.js";
import { PresentationTheme, ThemePreset } from "../ppt-theme.js";

export interface SlideLayoutConfig {
  pad: number;        
  contentW: number;   
  headerH: number;    
  contentY: number;   
  footerY: number;    
}

export interface PPTXTemplate {
  id: string;
  name: string;
  description: string;
  coverUrl: string;       
  baseTheme: ThemePreset; 

  layout: SlideLayoutConfig;

  renderBackground?: (slide: PptxGenJS.Slide, theme: PresentationTheme, layout: SlideLayoutConfig) => void;
  renderTitleSlide?: (pptx: PptxGenJS, slide: PptxGenJS.Slide, content: SlideContent, theme: PresentationTheme, layout: SlideLayoutConfig) => void;
  renderSectionSlide?: (slide: PptxGenJS.Slide, content: SlideContent, theme: PresentationTheme, layout: SlideLayoutConfig) => void;
  renderContentSlideHeader?: (slide: PptxGenJS.Slide, content: SlideContent, theme: PresentationTheme, layout: SlideLayoutConfig) => void;
  renderContentSlideFooter?: (slide: PptxGenJS.Slide, content: SlideContent, theme: PresentationTheme, layout: SlideLayoutConfig) => void;
  
  // High-level overrides for data slides
  renderChartSlide?: (pptx: PptxGenJS, slide: PptxGenJS.Slide, content: SlideContent, theme: PresentationTheme, layout: SlideLayoutConfig) => void;
  renderStatsSlide?: (slide: PptxGenJS.Slide, content: SlideContent, theme: PresentationTheme, layout: SlideLayoutConfig) => void;
  renderProcessSlide?: (slide: PptxGenJS.Slide, content: SlideContent, theme: PresentationTheme, layout: SlideLayoutConfig) => void;
  renderComparisonSlide?: (slide: PptxGenJS.Slide, content: SlideContent, theme: PresentationTheme, layout: SlideLayoutConfig) => void;
  renderIconGridSlide?: (slide: PptxGenJS.Slide, content: SlideContent, theme: PresentationTheme, layout: SlideLayoutConfig) => void;
  renderTextSlide?: (slide: PptxGenJS.Slide, content: SlideContent, theme: PresentationTheme, layout: SlideLayoutConfig) => void;
  renderConclusionSlide?: (slide: PptxGenJS.Slide, content: SlideContent, theme: PresentationTheme, layout: SlideLayoutConfig) => void;

  // Magazine Layouts
  renderHeroSlide?: (slide: PptxGenJS.Slide, content: SlideContent, theme: PresentationTheme, layout: SlideLayoutConfig) => void;
  renderQuoteSlide?: (slide: PptxGenJS.Slide, content: SlideContent, theme: PresentationTheme, layout: SlideLayoutConfig) => void;
}
