import OpenAI from "openai";

function createDeepSeekClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY must be set");
  }
  return new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey,
  });
}

export const deepseek = createDeepSeekClient();

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1500
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }
  throw lastError;
}

export interface ChartSeries {
  name: string;
  values: number[];
  color?: string;
}

export interface ChartData {
  chartType: "bar" | "pie" | "line" | "donut" | "area";
  title: string;
  labels: string[];
  series: ChartSeries[];
}

export interface StatItem {
  value: string;
  label: string;
  description?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

export interface ProcessStep {
  stepNumber: number;
  title: string;
  description: string;
}

export interface ComparisonColumn {
  header: string;
  rows: string[];
}

export interface SlideContent {
  slideNumber: number;
  title: string;
  slideType: "title" | "content" | "section" | "conclusion" | "qa";
  keyPoints: string[];
  notes?: string;
  layout?: "title-only" | "title-content" | "two-column" | "section-header";
  visualType?: "chart" | "stats" | "process" | "comparison" | "icon-grid" | "text-only";
  chartData?: ChartData;
  stats?: StatItem[];
  processSteps?: ProcessStep[];
  comparison?: ComparisonColumn[];
  icons?: Array<{ icon: string; label: string; description: string }>;
}

export interface PPTOutline {
  presentationTitle: string;
  theme: string;
  slides: SlideContent[];
}

function validateAndFixChartData(chartData: ChartData | undefined): ChartData | undefined {
  if (!chartData) return undefined;

  let { chartType, labels, series } = chartData;

  if (!labels || labels.length === 0) return undefined;
  if (!series || series.length === 0) return undefined;

  if (chartType === "pie" || chartType === "donut") {
    series = [series[0]];
    if (!series[0]) return undefined;
    series[0].values = series[0].values
      .slice(0, labels.length)
      .map((v) => Math.max(1, Math.abs(Number(v) || 1)));
    const sum = series[0].values.reduce((a, b) => a + b, 0);
    if (sum <= 0) return undefined;
    series[0].values = series[0].values.map((v) => Math.round((v / sum) * 100));
  } else {
    series = series.map((s) => ({
      ...s,
      values: s.values
        .slice(0, labels.length)
        .map((v) => Math.max(0, Math.abs(Number(v) || 0))),
    }));
  }

  labels = labels.slice(0, 8);
  series = series.map((s) => ({
    ...s,
    values: s.values.slice(0, labels.length),
  }));

  return { ...chartData, chartType, labels, series };
}

export async function planOutline(params: {
  topic: string;
  language: string;
  slideCount: number;
  style: string;
  audience?: string;
  additionalRequirements?: string;
  documentContext?: string;
}): Promise<PPTOutline> {
  const { topic, language, slideCount, style, audience, additionalRequirements, documentContext } = params;

  const langName = language === "zh" ? "Chinese (Simplified)" : "English";
  const audienceStr = audience ? `Target audience: ${audience}` : "";
  const reqStr = additionalRequirements ? `Additional requirements: ${additionalRequirements}` : "";
  const docStr = documentContext ? `\nReference document content (extract key points from this):\n---\n${documentContext.slice(0, 3000)}\n---` : "";

  const systemPrompt = `You are an expert presentation designer and content strategist. Create rich, visually engaging presentation outlines. Always respond with valid JSON only.`;

  const userPrompt = `Create a ${slideCount}-slide presentation outline in ${langName} for:

Topic: ${topic}
Style: ${style}
${audienceStr}
${reqStr}
${docStr}

Return a JSON object:
{
  "presentationTitle": "Full title",
  "theme": "Visual theme description",
  "slides": [
    {
      "slideNumber": 1,
      "title": "Slide title",
      "slideType": "title|content|section|conclusion|qa",
      "keyPoints": ["point 1", "point 2"],
      "notes": "Speaker notes",
      "visualType": "chart|stats|process|comparison|icon-grid|text-only"
    }
  ]
}

Rules:
- First slide: slideType "title", visualType "text-only"
- Last slide: "conclusion" or "qa", visualType "text-only"
- "section" slides: visualType "text-only"
- For data/metrics/results slides: visualType "stats" or "chart"
- For workflow/steps/methodology slides: visualType "process"
- For feature comparison or options slides: visualType "comparison"
- For key concepts or pillars slides: visualType "icon-grid"
- Other content slides: visualType "text-only" or "chart"
- Vary visual types for engagement - use charts and stats where data would strengthen the point
- Total: exactly ${slideCount} slides`;

  return withRetry(() =>
    deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }).then((response) => {
      const content = response.choices[0].message.content;
      if (!content) throw new Error("No content returned from AI");
      return JSON.parse(content) as PPTOutline;
    })
  );
}

export async function enrichSlideContent(
  slide: SlideContent,
  context: { presentationTitle: string; topic: string; language: string; style: string }
): Promise<SlideContent> {
  if (slide.slideType === "title" || slide.slideType === "section") {
    return slide;
  }

  const langName = context.language === "zh" ? "Chinese (Simplified)" : "English";
  const visualType = slide.visualType || "text-only";

  const systemPrompt = `You are an expert presentation content and data visualization designer. Generate rich, realistic content with compelling visuals. Always respond with valid JSON only.`;

  let visualInstructions = "";

  if (visualType === "chart") {
    visualInstructions = `
Also generate "chartData" with realistic, topic-relevant data:
{
  "chartData": {
    "chartType": "bar|pie|line|donut",
    "title": "Chart title",
    "labels": ["Label1", "Label2", "Label3", "Label4", "Label5"],
    "series": [
      { "name": "Series name", "values": [25, 40, 60, 45, 70] }
    ]
  }
}
- For trend over time: use "line" chart with 5-6 time points
- For part-of-whole: use "pie" or "donut" with 4-6 segments, EXACTLY 1 series, values roughly summing to 100
- For comparison: use "bar" with 3-5 categories
- Values must be realistic and meaningful for the topic
- For pie/donut: provide ONLY 1 series and values should sum to ~100`;
  } else if (visualType === "stats") {
    visualInstructions = `
Also generate "stats" with 3-4 impressive key statistics:
{
  "stats": [
    { "value": "95%", "label": "Metric name", "description": "Brief context", "trend": "up", "trendValue": "+15% YoY" },
    { "value": "2.4M", "label": "Another metric", "description": "Context", "trend": "up", "trendValue": "+30%" },
    { "value": "$1.2B", "label": "Third metric", "description": "Context", "trend": "neutral" }
  ]
}
- Values should be specific and credible (numbers, percentages, currency)
- trend: "up", "down", or "neutral"
- Make stats directly relevant to the slide topic`;
  } else if (visualType === "process") {
    visualInstructions = `
Also generate "processSteps" with 4-6 sequential steps:
{
  "processSteps": [
    { "stepNumber": 1, "title": "Step Name", "description": "What happens in this step" },
    { "stepNumber": 2, "title": "Step Name", "description": "What happens in this step" }
  ]
}
- Steps should flow logically
- Each description should be 1 concise sentence
- Titles should be action-oriented (verb + noun)`;
  } else if (visualType === "comparison") {
    visualInstructions = `
Also generate "comparison" table data with 2-3 columns:
{
  "comparison": [
    { "header": "Option A", "rows": ["Feature 1 value", "Feature 2 value", "Feature 3 value", "Feature 4 value"] },
    { "header": "Option B", "rows": ["Feature 1 value", "Feature 2 value", "Feature 3 value", "Feature 4 value"] }
  ]
}
- First column can be a "Feature" column listing what's being compared
- Use ✓ or ✗ for yes/no comparisons
- Keep rows short and scannable`;
  } else if (visualType === "icon-grid") {
    visualInstructions = `
Also generate "icons" with 4-6 key concepts:
{
  "icons": [
    { "icon": "🚀", "label": "Concept Name", "description": "One sentence explanation" },
    { "icon": "💡", "label": "Concept Name", "description": "One sentence explanation" }
  ]
}
- Use relevant emojis that represent the concept
- Labels should be 2-3 words max
- Descriptions should be one short sentence`;
  }

  const userPrompt = `Enrich slide content for a ${context.style} presentation about "${context.topic}":

Slide title: ${slide.title}
Visual type: ${visualType}
Current key points: ${JSON.stringify(slide.keyPoints)}

Return JSON:
{
  "keyPoints": ["enhanced point 1", "enhanced point 2", "enhanced point 3"],
  "notes": "Detailed speaker notes for presenting this slide"
  ${visualInstructions ? `// Plus the visual data fields described below` : ""}
}
${visualInstructions}

Requirements:
- Write ALL text content in ${langName}
- Key points: complete, impactful statements (10-25 words each), 3-4 points
- Notes: 3-4 sentences covering what to say when presenting this slide — include key talking points, data context, and how to transition to the next slide
- ${context.style} tone throughout
- Visual data must be directly relevant to "${slide.title}"`;

  const enriched = await withRetry(() =>
    deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.65,
    }).then((response) => {
      const responseContent = response.choices[0].message.content;
      if (!responseContent) return {} as Partial<SlideContent>;
      return JSON.parse(responseContent) as Partial<SlideContent>;
    })
  );

  return {
    ...slide,
    keyPoints: enriched.keyPoints || slide.keyPoints,
    notes: enriched.notes || slide.notes,
    chartData: validateAndFixChartData(enriched.chartData) || slide.chartData,
    stats: enriched.stats || slide.stats,
    processSteps: enriched.processSteps || slide.processSteps,
    comparison: enriched.comparison || slide.comparison,
    icons: enriched.icons || slide.icons,
  };
}
