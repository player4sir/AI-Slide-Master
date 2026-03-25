/**
 * AI Narrative Flow Optimizer (独创功能)
 * 
 * Analyzes the entire presentation outline for story arc coherence,
 * pacing issues, and transition quality. Returns actionable suggestions
 * and can auto-optimize the narrative flow.
 */
import type { PPTOutline, SlideContent } from "./deepseek.js";
import { deepseek, withRetry } from "./deepseek.js";

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface NarrativeSuggestion {
  slideNumber: number;
  type: "pacing" | "coherence" | "transition" | "structure" | "emphasis";
  severity: "info" | "warning" | "critical";
  message: string;
  suggestedFix?: string;
}

export interface NarrativeAnalysis {
  overallScore: number;           // 1-100
  narrativeArc: string;           // e.g. "标准递进型", "问题-解决型"
  paceProfile: string;            // e.g. "前松后紧", "均匀", "数据密集"
  suggestions: NarrativeSuggestion[];
  transitionHints: { from: number; to: number; hint: string }[];
  estimatedMinutes: number;
}

// ─── LOCAL ANALYSIS (no AI call) ────────────────────────────────────────────

function analyzeLocally(outline: PPTOutline): NarrativeSuggestion[] {
  const suggestions: NarrativeSuggestion[] = [];
  const slides = outline.slides;

  // 1. Check for consecutive data-heavy slides (pacing issue)
  const dataTypes = new Set(["chart", "stats", "comparison"]);
  for (let i = 1; i < slides.length - 1; i++) {
    if (dataTypes.has(slides[i].visualType || "") && dataTypes.has(slides[i - 1].visualType || "")) {
      suggestions.push({
        slideNumber: slides[i].slideNumber,
        type: "pacing",
        severity: "warning",
        message: `连续两页数据密集型幻灯片 (第${slides[i - 1].slideNumber}页和第${slides[i].slideNumber}页)，可能让观众疲劳`,
        suggestedFix: "在两页数据页之间插入一页 quote 或 text-only 页作为视觉缓冲",
      });
    }
  }

  // 2. Check for missing section dividers in long presentations
  if (slides.length >= 8) {
    const sectionSlides = slides.filter(s => s.slideType === "section");
    if (sectionSlides.length === 0) {
      suggestions.push({
        slideNumber: Math.floor(slides.length / 2),
        type: "structure",
        severity: "warning",
        message: "长演示文档 (≥8页) 缺少章节分割页，观众可能失去方向感",
        suggestedFix: "在内容中间位置插入 section 类型幻灯片",
      });
    }
  }

  // 3. Check for overly long key points
  for (const slide of slides) {
    const longPoints = slide.keyPoints.filter(p => p.length > 80);
    if (longPoints.length > 0) {
      suggestions.push({
        slideNumber: slide.slideNumber,
        type: "emphasis",
        severity: "info",
        message: `有 ${longPoints.length} 个要点超过80字，在幻灯片上可能显得拥挤`,
        suggestedFix: "精简要点至关键短语，把详细内容放入演讲稿",
      });
    }
  }

  // 4. Check content density variance
  const pointCounts = slides.filter(s => s.slideType === "content").map(s => s.keyPoints.length);
  if (pointCounts.length > 0) {
    const max = Math.max(...pointCounts);
    const min = Math.min(...pointCounts);
    if (max - min > 3) {
      suggestions.push({
        slideNumber: 0,
        type: "pacing",
        severity: "info",
        message: `内容密度不均：最多 ${max} 个要点，最少 ${min} 个。考虑重新分配内容`,
      });
    }
  }

  // 5. Check opening and closing
  if (slides.length > 0 && slides[0].slideType !== "title") {
    suggestions.push({
      slideNumber: 1,
      type: "structure",
      severity: "critical",
      message: "演示文档没有标题页开场",
      suggestedFix: "第一页应为 title 类型",
    });
  }

  const last = slides[slides.length - 1];
  if (last && last.slideType !== "conclusion" && last.slideType !== "qa") {
    suggestions.push({
      slideNumber: last.slideNumber,
      type: "structure",
      severity: "warning",
      message: "演示文档缺少总结/Q&A 收尾页",
      suggestedFix: "最后一页应为 conclusion 或 qa 类型",
    });
  }

  return suggestions;
}

// ─── AI-POWERED DEEP ANALYSIS ──────────────────────────────────────────────

export async function analyzeNarrative(outline: PPTOutline, language = "zh"): Promise<NarrativeAnalysis> {
  const localSuggestions = analyzeLocally(outline);

  const slideSummary = outline.slides.map(s => {
    return `${s.slideNumber}. [${s.slideType}/${s.visualType || "text-only"}] "${s.title}" (${s.keyPoints.length} points)`;
  }).join("\n");

  const langName = language === "zh" ? "Chinese (Simplified)" : "English";

  const systemPrompt = "You are a presentation narrative expert. Analyze story flow and suggest improvements. Respond with valid JSON only.";

  const userPrompt = `Analyze this presentation's narrative flow:

Title: ${outline.presentationTitle}
Slides:
${slideSummary}

Return JSON:
{
  "overallScore": 75,
  "narrativeArc": "Type of story arc in ${langName}",
  "paceProfile": "Pacing description in ${langName}",
  "suggestions": [
    {
      "slideNumber": 3,
      "type": "coherence|pacing|transition|structure|emphasis",
      "severity": "info|warning|critical",
      "message": "Issue description in ${langName}",
      "suggestedFix": "Fix suggestion in ${langName}"
    }
  ],
  "transitionHints": [
    { "from": 2, "to": 3, "hint": "Transition phrase suggestion in ${langName}" }
  ],
  "estimatedMinutes": 15
}

Rules:
- Score 80+ for well-structured presentations
- Check: logical flow, topic transitions, data-to-insight balance
- Provide 2-5 actionable suggestions
- Generate transition hints for every consecutive pair
- Estimate ~1.5-2 min per content slide, ~0.5 min for title/section
- Write all text in ${langName}`;

  try {
    const aiResult = await withRetry(() =>
      deepseek.chat.completions
        .create({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.5,
        })
        .then(r => {
          const content = r.choices[0].message.content;
          if (!content) throw new Error("No response");
          return JSON.parse(content) as NarrativeAnalysis;
        }),
    );

    // Merge local + AI suggestions (dedup by slideNumber + type)
    const aiSuggestionKeys = new Set(
      (aiResult.suggestions || []).map(s => `${s.slideNumber}-${s.type}`)
    );
    const mergedSuggestions = [
      ...(aiResult.suggestions || []),
      ...localSuggestions.filter(s => !aiSuggestionKeys.has(`${s.slideNumber}-${s.type}`)),
    ];

    return {
      overallScore: aiResult.overallScore || 70,
      narrativeArc: aiResult.narrativeArc || "未分类",
      paceProfile: aiResult.paceProfile || "均匀",
      suggestions: mergedSuggestions,
      transitionHints: aiResult.transitionHints || [],
      estimatedMinutes: aiResult.estimatedMinutes || outline.slides.length * 1.5,
    };
  } catch {
    // Fallback to local-only analysis
    return {
      overallScore: 65,
      narrativeArc: "待分析",
      paceProfile: "待分析",
      suggestions: localSuggestions,
      transitionHints: [],
      estimatedMinutes: outline.slides.length * 1.5,
    };
  }
}
