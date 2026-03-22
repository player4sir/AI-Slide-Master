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

export async function planOutline(params: {
  topic: string;
  language: string;
  slideCount: number;
  style: string;
  audience?: string;
  additionalRequirements?: string;
}): Promise<PPTOutline> {
  const { topic, language, slideCount, style, audience, additionalRequirements } = params;

  const langName = language === "zh" ? "Chinese (Simplified)" : "English";
  const audienceStr = audience ? `Target audience: ${audience}` : "";
  const reqStr = additionalRequirements ? `Additional requirements: ${additionalRequirements}` : "";

  const systemPrompt = `You are an expert presentation designer and content strategist. Create rich, visually engaging presentation outlines. Always respond with valid JSON only.`;

  const userPrompt = `Create a ${slideCount}-slide presentation outline in ${langName} for:

Topic: ${topic}
Style: ${style}
${audienceStr}
${reqStr}

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

  const response = await deepseek.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("No content returned from AI");

  return JSON.parse(content) as PPTOutline;
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
- For part-of-whole: use "pie" or "donut" with 4-6 segments
- For comparison: use "bar" with 3-5 categories
- Values must be realistic and meaningful for the topic
- For pie/donut: values should roughly sum to 100`;
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
  "notes": "Enhanced speaker notes"
  ${visualInstructions ? `// Plus the visual data fields described below` : ""}
}
${visualInstructions}

Requirements:
- Write ALL text content in ${langName}
- Key points: complete, impactful statements (10-25 words each), 3-4 points
- Notes: 2-3 sentences of additional context
- ${context.style} tone throughout
- Visual data must be directly relevant to "${slide.title}"`;

  const response = await deepseek.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.65,
  });

  const responseContent = response.choices[0].message.content;
  if (!responseContent) return slide;

  const enriched = JSON.parse(responseContent) as Partial<SlideContent>;
  return {
    ...slide,
    keyPoints: enriched.keyPoints || slide.keyPoints,
    notes: enriched.notes || slide.notes,
    chartData: enriched.chartData || slide.chartData,
    stats: enriched.stats || slide.stats,
    processSteps: enriched.processSteps || slide.processSteps,
    comparison: enriched.comparison || slide.comparison,
    icons: enriched.icons || slide.icons,
  };
}
