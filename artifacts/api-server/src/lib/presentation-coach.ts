/**
 * Presentation Coach AI (独创功能)
 * 
 * Analyzes speaker notes and slide content to provide presentation
 * rehearsal intelligence: timing estimates, pacing hints, key phrases,
 * difficulty warnings, and predicted Q&A questions.
 */
import type { PPTOutline, SlideContent } from "./deepseek.js";
import { deepseek, withRetry } from "./deepseek.js";

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface SlideCoachInfo {
  slideNumber: number;
  title: string;
  estimatedSeconds: number;
  paceHint: string;       // "正常" | "减速强调" | "加快节奏" | "停顿留白"
  keyPhrase: string;      // The one sentence to absolutely nail
  difficulty: number;     // 1-5
  tips: string[];
}

export interface CoachAnalysis {
  totalMinutes: number;
  averageSecondsPerSlide: number;
  perSlide: SlideCoachInfo[];
  predictedQuestions: string[];
  overallDifficulty: number;    // 1-5
  rehearsalTips: string[];
}

// ─── LOCAL TIMING ESTIMATION ────────────────────────────────────────────────

function estimateSlideSeconds(slide: SlideContent): number {
  if (slide.slideType === "title") return 30;
  if (slide.slideType === "section") return 20;
  if (slide.slideType === "qa") return 60;
  if (slide.slideType === "conclusion") return 45;

  // Content slides: base + per-point + data complexity
  let seconds = 30; // base: introduce the slide
  seconds += slide.keyPoints.length * 20; // ~20s per point

  // Data-heavy slides take longer
  if (slide.visualType === "chart") seconds += 30;
  if (slide.visualType === "stats") seconds += 20;
  if (slide.visualType === "comparison") seconds += 25;
  if (slide.visualType === "process") seconds += slide.processSteps?.length ? slide.processSteps.length * 10 : 20;

  // Long notes = more to say
  if (slide.notes && slide.notes.length > 200) seconds += 15;

  return Math.min(seconds, 180); // cap at 3 min per slide
}

function estimateDifficulty(slide: SlideContent): number {
  let d = 1;
  if (slide.visualType === "chart" || slide.visualType === "stats") d += 1;
  if (slide.visualType === "comparison") d += 1;
  if (slide.keyPoints.some(p => p.length > 60)) d += 1;
  if (slide.notes && slide.notes.length > 300) d += 1;
  return Math.min(d, 5);
}

function extractKeyPhrase(slide: SlideContent): string {
  if (slide.keyPoints.length === 0) return slide.title;
  // Pick the shortest point — it's usually the most pithy
  const sorted = [...slide.keyPoints].sort((a, b) => a.length - b.length);
  return sorted[0].substring(0, 80);
}

function localPaceHint(slide: SlideContent, seconds: number): string {
  if (slide.slideType === "title") return "从容开场";
  if (slide.slideType === "conclusion") return "减速总结";
  if (slide.slideType === "section") return "停顿过渡";
  if (seconds > 120) return "减速强调";
  if (seconds < 40) return "加快节奏";
  return "正常节奏";
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

/**
 * Fast local analysis without AI call — instant results.
 */
export function quickCoach(outline: PPTOutline): CoachAnalysis {
  const perSlide: SlideCoachInfo[] = outline.slides.map(slide => {
    const secs = estimateSlideSeconds(slide);
    return {
      slideNumber: slide.slideNumber,
      title: slide.title,
      estimatedSeconds: secs,
      paceHint: localPaceHint(slide, secs),
      keyPhrase: extractKeyPhrase(slide),
      difficulty: estimateDifficulty(slide),
      tips: [],
    };
  });

  const totalSeconds = perSlide.reduce((sum, s) => sum + s.estimatedSeconds, 0);
  const avgDifficulty = perSlide.reduce((sum, s) => sum + s.difficulty, 0) / Math.max(perSlide.length, 1);

  return {
    totalMinutes: Math.round(totalSeconds / 60 * 10) / 10,
    averageSecondsPerSlide: Math.round(totalSeconds / Math.max(perSlide.length, 1)),
    perSlide,
    predictedQuestions: [],
    overallDifficulty: Math.round(avgDifficulty * 10) / 10,
    rehearsalTips: [
      totalSeconds > 1200 ? "总时长超过20分钟，考虑精简内容" : "时长适中",
      perSlide.some(s => s.difficulty >= 4) ? "有高难度页面，建议重点排练" : "整体难度适中",
    ].filter(Boolean),
  };
}

/**
 * Deep AI-powered coaching with Q&A prediction and per-slide tips.
 */
export async function deepCoach(outline: PPTOutline, language = "zh"): Promise<CoachAnalysis> {
  const quick = quickCoach(outline);
  const langName = language === "zh" ? "Chinese (Simplified)" : "English";

  const slideSummary = outline.slides.map(s => {
    const notesPreview = s.notes ? s.notes.substring(0, 100) : "(no notes)";
    return `#${s.slideNumber} [${s.slideType}/${s.visualType || "text"}] "${s.title}" | Points: ${s.keyPoints.length} | Notes: ${notesPreview}`;
  }).join("\n");

  const systemPrompt = "You are a professional presentation coach. Analyze presentations and provide actionable rehearsal tips. Respond with valid JSON only.";

  const userPrompt = `Analyze this presentation for rehearsal coaching:

Title: ${outline.presentationTitle}
Total slides: ${outline.slides.length}
Estimated time: ${quick.totalMinutes} minutes

Slides:
${slideSummary}

Return JSON:
{
  "predictedQuestions": ["Question 1 in ${langName}", "Question 2"],
  "rehearsalTips": ["Tip 1 in ${langName}", "Tip 2"],
  "perSlideTips": {
    "1": ["tip for slide 1 in ${langName}"],
    "3": ["tip for slide 3"]
  }
}

Rules:
- Predict 3-5 questions the audience would likely ask
- Provide 3-5 overall rehearsal tips
- Focus per-slide tips on the hardest/most important slides only (max 4 slides)
- Write all text in ${langName}
- Be specific and actionable, not generic`;

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
          return JSON.parse(content) as {
            predictedQuestions?: string[];
            rehearsalTips?: string[];
            perSlideTips?: Record<string, string[]>;
          };
        }),
    );

    // Merge AI tips into per-slide data
    const perSlide = quick.perSlide.map(s => {
      const aiTips = aiResult.perSlideTips?.[String(s.slideNumber)] || [];
      return { ...s, tips: aiTips };
    });

    return {
      ...quick,
      perSlide,
      predictedQuestions: aiResult.predictedQuestions || [],
      rehearsalTips: [...(aiResult.rehearsalTips || []), ...quick.rehearsalTips],
    };
  } catch {
    return quick; // Fallback to local analysis
  }
}
