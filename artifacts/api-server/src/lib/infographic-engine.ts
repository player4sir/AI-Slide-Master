/**
 * Smart Infographic Engine (独创功能)
 * 
 * Post-processor that analyzes slide content and automatically upgrades
 * text-only slides into richer visual formats by:
 * - Extracting numbers/percentages → stats cards
 * - Detecting comparisons → comparison columns  
 * - Detecting sequential steps → process flow
 * - Detecting feature lists → icon grid
 */
import type { SlideContent, LayoutDirective } from "./deepseek.js";

// ─── PATTERN DETECTORS ──────────────────────────────────────────────────────

const NUMBER_PATTERN = /(\d+[\.,]?\d*)\s*(%|万|亿|M|B|K|元|美元|\$|¥|倍|x|项|个|人|次|天|年|月)/gi;
const COMPARISON_KEYWORDS = /vs\.?|对比|相比|versus|compared|优于|不如|胜过|落后|而|但是|however|而是|instead/i;
const PROCESS_KEYWORDS = /第[一二三四五六七八九十\d]|首先|然后|接着|最后|finally|first|then|next|step\s*\d|阶段|步骤/i;
const FEATURE_KEYWORDS = /特点|优势|功能|特性|核心|亮点|feature|advantage|benefit|highlight|pillar/i;

interface ExtractedStat {
  value: string;
  label: string;
  description: string;
}

function extractNumbers(text: string): ExtractedStat[] {
  const stats: ExtractedStat[] = [];
  const matches = text.matchAll(NUMBER_PATTERN);
  for (const match of matches) {
    const value = match[1] + match[2];
    // Get surrounding context (up to 30 chars before/after) as label
    const idx = match.index!;
    const before = text.substring(Math.max(0, idx - 30), idx).trim();
    const after = text.substring(idx + match[0].length, idx + match[0].length + 30).trim();
    const label = before.split(/[，。；,;.!！？?]/).pop()?.trim() || after.split(/[，。；,;.!！？?]/)[0]?.trim() || "指标";
    stats.push({ value, label: label.substring(0, 20), description: before.substring(0, 40) });
  }
  return stats;
}

function hasComparisonPattern(points: string[]): boolean {
  return points.some(p => COMPARISON_KEYWORDS.test(p)) || 
    (points.length === 2 && points.every(p => p.length > 20));
}

function hasProcessPattern(points: string[]): boolean {
  let sequential = 0;
  for (const p of points) {
    if (PROCESS_KEYWORDS.test(p)) sequential++;
  }
  return sequential >= 2 || (points.length >= 3 && points.length <= 6 && points.every(p => /^\d+[\.、]/.test(p.trim())));
}

function hasFeaturePattern(title: string, points: string[]): boolean {
  return FEATURE_KEYWORDS.test(title) || (points.length >= 3 && points.length <= 6 && points.every(p => p.length < 60));
}

// ─── LAYOUT DIRECTIVE SUGGESTIONS ──────────────────────────────────────────

function suggestLayoutForContent(slide: SlideContent): LayoutDirective | undefined {
  const pts = slide.keyPoints;
  if (pts.length === 0) return undefined;

  // Already has explicit data → don't override
  if (slide.stats?.length || slide.processSteps?.length || slide.comparison?.length || slide.icons?.length) {
    return undefined;
  }

  // Only enhance text-only / unspecified visual types
  if (slide.visualType && slide.visualType !== "text-only") {
    return undefined;
  }

  const allText = pts.join(" ");

  // 1. Numbers detected → suggest grid-cards with stats feel
  const extracted = extractNumbers(allText);
  if (extracted.length >= 2) {
    return {
      contentLayout: "grid-cards",
      decoration: "double-rules",
      titleStyle: "full-bar",
      cardStyle: "accent-top",
    };
  }

  // 2. Comparison detected → grid cards
  if (hasComparisonPattern(pts)) {
    return {
      contentLayout: "grid-cards",
      decoration: "side-panel",
      titleStyle: "left-accent",
      cardStyle: "bordered",
    };
  }

  // 3. Process/steps detected → timeline
  if (hasProcessPattern(pts)) {
    return {
      contentLayout: "timeline-horizontal",
      decoration: "corner-accents",
      titleStyle: "centered-underline",
    };
  }

  // 4. Feature list → grid cards with icons feel
  if (hasFeaturePattern(slide.title, pts)) {
    return {
      contentLayout: "grid-cards",
      decoration: "geometric-dots",
      titleStyle: "left-accent",
      cardStyle: "accent-left",
    };
  }

  // 5. Short content (1-2 points) → split layout for visual interest
  if (pts.length <= 2 && pts.every(p => p.length > 30)) {
    return {
      contentLayout: "split-left",
      decoration: "gradient-overlay",
      titleStyle: "minimal",
      cardStyle: "ghost",
    };
  }

  // 6. Dense content (5+) → stacked rows
  if (pts.length >= 5) {
    return {
      contentLayout: "stacked-rows",
      decoration: "none",
      titleStyle: "left-accent",
      cardStyle: "accent-left",
    };
  }

  return undefined;
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

/**
 * Analyzes a slide and optionally upgrades its layout directive
 * based on content patterns. Only modifies slides that don't already
 * have a layoutDirective (respects AI choices).
 */
export function applyInfographicUpgrade(slide: SlideContent): SlideContent {
  // Don't override existing AI directive or non-content slides
  if (slide.layoutDirective || slide.slideType !== "content") {
    return slide;
  }

  const suggested = suggestLayoutForContent(slide);
  if (suggested) {
    return { ...slide, layoutDirective: suggested };
  }

  return slide;
}

/**
 * Analyze all slides in an outline and return upgrade suggestions
 * without modifying the original (for preview/review).
 */
export function analyzeInfographicOpportunities(slides: SlideContent[]): {
  slideNumber: number;
  detectedPattern: string;
  suggestedDirective: LayoutDirective;
}[] {
  const opportunities: { slideNumber: number; detectedPattern: string; suggestedDirective: LayoutDirective }[] = [];

  for (const slide of slides) {
    if (slide.slideType !== "content" || slide.layoutDirective) continue;

    const allText = slide.keyPoints.join(" ");
    const extracted = extractNumbers(allText);

    if (extracted.length >= 2) {
      opportunities.push({ slideNumber: slide.slideNumber, detectedPattern: "数值数据", suggestedDirective: suggestLayoutForContent(slide)! });
    } else if (hasComparisonPattern(slide.keyPoints)) {
      opportunities.push({ slideNumber: slide.slideNumber, detectedPattern: "对比结构", suggestedDirective: suggestLayoutForContent(slide)! });
    } else if (hasProcessPattern(slide.keyPoints)) {
      opportunities.push({ slideNumber: slide.slideNumber, detectedPattern: "流程步骤", suggestedDirective: suggestLayoutForContent(slide)! });
    } else if (hasFeaturePattern(slide.title, slide.keyPoints)) {
      opportunities.push({ slideNumber: slide.slideNumber, detectedPattern: "特性列表", suggestedDirective: suggestLayoutForContent(slide)! });
    }
  }

  return opportunities;
}
