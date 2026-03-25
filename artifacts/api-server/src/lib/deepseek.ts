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

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 2000,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;

      // Don't retry non-retryable client errors (4xx except 429 rate-limit and 408 timeout)
      const status = (err as { status?: number }).status;
      if (status && status >= 400 && status < 500 && status !== 429 && status !== 408) {
        throw err;
      }

      if (attempt < maxAttempts) {
        // Rate-limit errors get a longer delay
        const delay = status === 429
          ? baseDelayMs * Math.pow(3, attempt - 1)  // 2s, 6s, 18s
          : baseDelayMs * Math.pow(2, attempt - 1); // 2s, 4s, 8s
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
  chartType: "bar" | "pie" | "line" | "donut" | "area" | "scatter" | "stacked-bar";
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

// ─── AI-DRIVEN LAYOUT DIRECTIVE ───────────────────────────────────────────────

export type ContentLayout =
  | "full-center"         // Full-screen centered (quotes/conclusions)
  | "split-left"          // Left decoration + right content (40/60)
  | "split-right"         // Left content + right decoration (60/40)
  | "top-bottom"          // Upper title area + lower content area
  | "grid-cards"          // Equal-width card grid (auto columns)
  | "timeline-horizontal" // Horizontal timeline with nodes
  | "timeline-vertical"   // Vertical timeline with nodes
  | "stacked-rows"        // Stacked horizontal rows (for lists)
  | "hero-banner";        // Full-width hero banner

export type DecorationStyle =
  | "none"                // Clean, no decoration
  | "corner-accents"      // Corner bracket decorations
  | "side-panel"          // Side color panel
  | "gradient-overlay"    // Semi-transparent gradient overlay
  | "geometric-dots"      // Scattered geometric dots
  | "double-rules"        // Top+bottom double-line borders
  | "glow-ring";          // Concentric glow rings

export type TitleStyle =
  | "left-accent"         // Left bar + left-aligned title
  | "centered-underline"  // Centered title with underline
  | "full-bar"            // Full-width colored bar title
  | "minimal"             // Text only, no decoration
  | "numbered";           // Number prefix badge

export type CardStyle =
  | "bordered"            // Outlined card
  | "filled"              // Solid fill card
  | "accent-left"         // Left accent bar
  | "accent-top"          // Top accent bar
  | "ghost";              // No background, text only

export interface LayoutDirective {
  contentLayout: ContentLayout;
  decoration: DecorationStyle;
  titleStyle: TitleStyle;
  cardStyle?: CardStyle;
}

export interface SlideContent {
  slideNumber: number;
  title: string;
  slideType: "title" | "content" | "section" | "conclusion" | "qa";
  keyPoints: string[];
  notes?: string;
  layout?: "title-only" | "title-content" | "two-column" | "section-header";
  visualType?: "chart" | "stats" | "process" | "comparison" | "icon-grid" | "text-only" | "hero" | "quote";
  layoutDirective?: LayoutDirective;
  chartData?: ChartData;
  stats?: StatItem[];
  processSteps?: ProcessStep[];
  comparison?: ComparisonColumn[];
  icons?: Array<{ icon: string; label: string; description: string }>;
}

export interface PPTOutline {
  presentationTitle: string;
  theme: string;
  themePreset?: string;
  primaryColor?: string;
  slides: SlideContent[];
}

export type RegenerateSlideMode = "content" | "content-and-notes" | "content-notes-and-chart";

function getSpeakerNotesGuidance(
  slide: SlideContent,
  context: { presentationTitle: string; topic: string; language: string; style: string },
) {
  const languageHint =
    context.language === "zh"
      ? "Use natural Simplified Chinese that sounds like a real presenter."
      : "Use natural spoken English that sounds like a real presenter.";

  if (slide.slideType === "title") {
    return `
Generate structured speaker notes using this shape:
\u5f00\u573a\uff1a1 sentence to open the presentation and establish context
\u8bb2\u70b9\uff1a2-3 short sentences explaining the presentation goal, audience value, or scope
\u8fc7\u6e21\uff1a1 sentence leading into the next section

Requirements for this slide:
- Sound like an actual opening remark, not a slide summary
- Mention the presentation topic "${context.topic}"
- Keep the total length concise and suitable for PPT notes
- ${languageHint}`;
  }

  if (slide.slideType === "section") {
    return `
Generate structured speaker notes using this shape:
\u5f00\u573a\uff1a1 sentence introducing why this section matters
\u8bb2\u70b9\uff1a2-3 short sentences explaining what this section will cover
\u8fc7\u6e21\uff1a1 sentence connecting to the first detail slide in this section

Requirements for this slide:
- Emphasize section transition and audience orientation
- Avoid repeating the slide title verbatim
- ${languageHint}`;
  }

  if (slide.slideType === "conclusion" || slide.slideType === "qa") {
    return `
Generate structured speaker notes using this shape:
\u5f00\u573a\uff1a1 sentence signaling wrap-up or Q&A
\u8bb2\u70b9\uff1a2-3 short sentences summarizing the most important takeaway
\u6536\u675f\uff1a1 sentence with a closing remark, action suggestion, or invitation to ask questions

Requirements for this slide:
- The notes should feel like a strong ending spoken aloud
- Reinforce decision, action, or next-step language when appropriate
- ${languageHint}`;
  }

  return `
Generate structured speaker notes using this shape:
\u5f00\u573a\uff1a1 sentence introducing the point of this slide
\u8bb2\u70b9\uff1a2-3 short sentences expanding the key information, evidence, or interpretation
\u8fc7\u6e21\uff1a1 sentence connecting this slide to the next one

Requirements for this slide:
- Make the notes sound like a presenter speaking, not a written paragraph
- If the slide contains data, explain what the data means, not just what it says
- If the slide is process/comparison/content oriented, explain why it matters to the audience
- ${languageHint}`;
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeStringList(values: unknown, limit = 8): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => normalizeString(value))
    .filter((value): value is string => Boolean(value))
    .slice(0, limit);
}

function normalizeNumber(value: unknown, fallback = 0): number {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function normalizePrimaryColor(value: unknown): string | undefined {
  const normalized = normalizeString(value)?.replace(/^#/, "").toUpperCase();
  return normalized && /^[0-9A-F]{6}$/.test(normalized) ? `#${normalized}` : undefined;
}

function normalizePieValues(values: number[]): number[] {
  if (values.length === 0) return values;

  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return [];

  const percentages = values.map((value) => Math.max(1, Math.round((value / total) * 100)));
  const roundedTotal = percentages.reduce((sum, value) => sum + value, 0);

  if (roundedTotal !== 100) {
    percentages[percentages.length - 1] = Math.max(
      1,
      percentages[percentages.length - 1] + (100 - roundedTotal),
    );
  }

  return percentages;
}

function validateAndFixChartData(chartData: ChartData | undefined): ChartData | undefined {
  if (!chartData) return undefined;

  const normalizedTitle = normalizeString(chartData.title) ?? "\u56fe\u8868";
  let chartType = chartData.chartType;
  let labels = normalizeStringList(chartData.labels, 8);
  let series = Array.isArray(chartData.series)
    ? chartData.series
        .map((item, index) => ({
          name: normalizeString(item?.name) ?? `\u7cfb\u5217 ${index + 1}`,
          color: normalizeString(item?.color),
          values: Array.isArray(item?.values)
            ? item.values.map((value) => Math.abs(normalizeNumber(value)))
            : [],
        }))
        .filter((item) => item.values.length > 0)
    : [];

  if (!labels || labels.length === 0) return undefined;
  if (!series || series.length === 0) return undefined;

  if (chartType === "pie" || chartType === "donut") {
    series = [series[0]];
    if (!series[0]) return undefined;
    const maxLength = Math.min(labels.length, series[0].values.length, 6);
    labels = labels.slice(0, maxLength);
    const zipped = labels
      .map((label, index) => ({
        label,
        value: Math.max(1, normalizeNumber(series[0].values[index], 1)),
      }))
      .filter((item) => item.label);

    if (zipped.length === 0) return undefined;

    labels = zipped.map((item) => item.label);
    const normalizedValues = normalizePieValues(zipped.map((item) => item.value));
    if (normalizedValues.length === 0) return undefined;

    series[0].values = normalizedValues;
  } else {
    const maxLength = Math.min(
      labels.length,
      ...series.map((item) => item.values.length).filter((length) => length > 0),
    );

    if (!Number.isFinite(maxLength) || maxLength <= 0) return undefined;

    labels = labels.slice(0, Math.min(maxLength, 8));
    series = series
      .map((item) => ({
        ...item,
        values: item.values
          .slice(0, labels.length)
          .map((value) => Math.max(0, normalizeNumber(value, 0))),
      }))
      .filter((item) => item.values.length === labels.length);
  }

  if (labels.length === 0 || series.length === 0) return undefined;

  return {
    ...chartData,
    title: normalizedTitle,
    chartType,
    labels,
    series,
  };
}

export function normalizeSlideContent(
  slide: Partial<SlideContent>,
  slideNumber: number,
): SlideContent {
  const slideType = slide.slideType ?? "content";
  const keyPoints = normalizeStringList(slide.keyPoints, 8);
  const normalizedTitle =
    normalizeString(slide.title) ??
    (slideType === "title"
      ? "\u6f14\u793a\u6807\u9898"
      : slideType === "section"
        ? `\u7ae0\u8282 ${slideNumber}`
        : `\u7b2c ${slideNumber} \u9875`);

  const normalizedChartData = validateAndFixChartData(slide.chartData);
  const visualType =
    slide.visualType === "chart" && !normalizedChartData ? "text-only" : slide.visualType;

  // Validate layoutDirective enum values — drop directive if any field invalid
  const validatedDirective = validateLayoutDirective(slide.layoutDirective);

  return {
    slideNumber,
    title: normalizedTitle,
    slideType,
    keyPoints,
    notes: normalizeString(slide.notes),
    layout: slide.layout,
    visualType,
    layoutDirective: validatedDirective,
    chartData: normalizedChartData,
    stats: slide.stats,
    processSteps: slide.processSteps,
    comparison: slide.comparison,
    icons: slide.icons,
  };
}

// ─── LAYOUT DIRECTIVE VALIDATION ────────────────────────────────────────────

const VALID_CONTENT_LAYOUTS = new Set<string>([
  "full-center", "split-left", "split-right", "top-bottom", "grid-cards",
  "timeline-horizontal", "timeline-vertical", "stacked-rows", "hero-banner",
]);
const VALID_DECORATIONS = new Set<string>([
  "none", "corner-accents", "side-panel", "gradient-overlay",
  "geometric-dots", "double-rules", "glow-ring",
]);
const VALID_TITLE_STYLES = new Set<string>([
  "left-accent", "centered-underline", "full-bar", "minimal", "numbered",
]);
const VALID_CARD_STYLES = new Set<string>([
  "bordered", "filled", "accent-left", "accent-top", "ghost",
]);

function validateLayoutDirective(dir: LayoutDirective | undefined): LayoutDirective | undefined {
  if (!dir) return undefined;
  if (!dir.contentLayout || !VALID_CONTENT_LAYOUTS.has(dir.contentLayout)) return undefined;
  if (!dir.decoration || !VALID_DECORATIONS.has(dir.decoration)) return undefined;
  if (!dir.titleStyle || !VALID_TITLE_STYLES.has(dir.titleStyle)) return undefined;
  if (dir.cardStyle && !VALID_CARD_STYLES.has(dir.cardStyle)) {
    return { ...dir, cardStyle: undefined };
  }
  return dir;
}

export function normalizeOutlineForExport(outline: Partial<PPTOutline>): PPTOutline {
  const presentationTitle = normalizeString(outline.presentationTitle) ?? "AI \u751f\u6210\u6f14\u793a\u6587\u7a3f";
  const theme = normalizeString(outline.theme) ?? "\u81ea\u52a8\u751f\u6210\u4e3b\u9898";
  const themePreset = normalizeString(outline.themePreset);
  const primaryColor = normalizePrimaryColor(outline.primaryColor);
  const slides = Array.isArray(outline.slides)
    ? outline.slides.map((slide, index) => normalizeSlideContent(slide, index + 1))
    : [];

  return {
    presentationTitle,
    theme,
    themePreset,
    primaryColor,
    slides,
  };
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
  const docStr = documentContext
    ? `\nReference document content (extract key points from this):\n---\n${documentContext.slice(0, 3000)}\n---`
    : "";

  const systemPrompt = "You are an expert presentation designer and content strategist. Create rich, visually engaging presentation outlines. Always respond with valid JSON only.";

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
      "visualType": "chart|stats|process|comparison|icon-grid|text-only|hero|quote"
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
- For core visions, key concepts, or product pillars: visualType "hero" (magazine split layout)
- For important slogans, attitude statements, or testimonials: visualType "quote" (huge typography)
- For detailed concepts or sub-items: visualType "icon-grid"
- Other content slides: visualType "text-only" or "chart"
- Vary visual types for engagement - use charts and stats where data would strengthen the point
- Total: exactly ${slideCount} slides`;

  return withRetry(() =>
    deepseek.chat.completions
      .create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      })
      .then((response) => {
        const content = response.choices[0].message.content;
        if (!content) throw new Error("No content returned from AI");
        return JSON.parse(content) as PPTOutline;
      }),
  );
}

export async function enrichSlideContent(
  slide: SlideContent,
  context: { presentationTitle: string; topic: string; language: string; style: string; designSpec?: import("./design-strategist.js").DesignSpec },
): Promise<SlideContent> {
  const langName = context.language === "zh" ? "Chinese (Simplified)" : "English";
  const visualType = slide.visualType || "text-only";
  const speakerNotesGuidance = getSpeakerNotesGuidance(slide, context);

  const systemPrompt = `You are a world-class presentation content designer applying CRAP design principles:
- CONTRAST: Make key information stand out through emphasis hierarchy
- REPETITION: Maintain consistent terminology and structural patterns
- ALIGNMENT: Ensure content follows a clear visual hierarchy
- PROXIMITY: Group related ideas together, separate distinct concepts

Generate rich, compelling content optimized for visual presentation. Always respond with valid JSON only.`;

  let visualInstructions = "";

  if (visualType === "chart") {
    visualInstructions = `
Also generate "chartData" with realistic, topic-relevant data:
{
  "chartData": {
    "chartType": "bar|pie|line|donut|area|scatter|stacked-bar",
    "title": "Chart title",
    "labels": ["Label1", "Label2", "Label3", "Label4", "Label5"],
    "series": [
      { "name": "Series name", "values": [25, 40, 60, 45, 70] }
    ]
  }
}
- For trend over time: use "line" or "area" chart with 5-6 time points
- For part-of-whole: use "pie" or "donut" with 4-6 segments, EXACTLY 1 series, values roughly summing to 100
- For comparison: use "bar" with 3-5 categories
- For cumulative trend: use "area" chart
- For distribution/correlation: use "scatter" with numeric labels as X values
- For stacked component comparison: use "stacked-bar" with 2-3 series
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
- Use checkmarks or crosses for yes/no comparisons when helpful
- Keep rows short and scannable`;
  } else if (visualType === "icon-grid") {
    visualInstructions = `
Also generate "icons" with 4-6 key concepts:
{
  "icons": [
    { "icon": "💡", "label": "Concept Name", "description": "One sentence explanation" },
    { "icon": "📈", "label": "Concept Name", "description": "One sentence explanation" }
  ]
}
- Use relevant emojis that represent the concept
- Labels should be 2-3 words max
- Descriptions should be one short sentence`;
  }

  // Build design-aware layout guidance
  const slideHint = context.designSpec?.slideHints?.find(h => h.slideNumber === slide.slideNumber);
  let layoutDirectiveInstructions: string;

  if (slideHint) {
    // DesignSpec provides per-slide hints — use them as strong guidance
    layoutDirectiveInstructions = `
Also choose a "layoutDirective" for best visual composition:
{
  "layoutDirective": {
    "contentLayout": "${slideHint.recommendedLayout}",
    "decoration": "${slideHint.decorationStyle}",
    "titleStyle": "${slideHint.titleStyle}",
    "cardStyle": "bordered|filled|accent-left|accent-top|ghost"
  }
}
The design strategist recommends: layout="${slideHint.recommendedLayout}", decoration="${slideHint.decorationStyle}", titleStyle="${slideHint.titleStyle}", emphasis="${slideHint.emphasis}"${slideHint.designNote ? `. Reason: ${slideHint.designNote}` : ""}.
You SHOULD follow these recommendations unless you have a strong visual reason to deviate.
For cardStyle: use "accent-left" for text-heavy slides, "accent-top" for grid layouts, "bordered" for data, "filled" for emphasis, "ghost" for minimal.`;
  } else {
    layoutDirectiveInstructions = `
Also choose a "layoutDirective" for best visual composition:
{
  "layoutDirective": {
    "contentLayout": "full-center|split-left|split-right|top-bottom|grid-cards|timeline-horizontal|timeline-vertical|stacked-rows|hero-banner",
    "decoration": "none|corner-accents|side-panel|gradient-overlay|geometric-dots|double-rules|glow-ring",
    "titleStyle": "left-accent|centered-underline|full-bar|minimal|numbered",
    "cardStyle": "bordered|filled|accent-left|accent-top|ghost"
  }
}
Layout selection guidance:
- For 2-3 key points: stacked-rows + accent-left
- For 4+ key points: grid-cards + accent-top
- For concept visions: split-left + glow-ring + minimal
- For process/steps: timeline-horizontal + corner-accents + centered-underline
- For data/stats: grid-cards + double-rules + full-bar
- For conclusions: full-center + none + centered-underline
- For comparisons: grid-cards + side-panel + left-accent
- Vary styles across slides for visual engagement
- Match decoration to presentation style: ${context.style}`;
  }

  const userPrompt = `Enrich slide content for a ${context.style} presentation about "${context.topic}":

Slide title: ${slide.title}
Visual type: ${visualType}
Current key points: ${JSON.stringify(slide.keyPoints)}

Return JSON:
{
  "keyPoints": ["enhanced point 1", "enhanced point 2", "enhanced point 3"],
  "notes": "Structured speaker notes for presenting this slide"
  ${visualInstructions ? `// Plus the visual data fields described below` : ""}
  // Plus the layoutDirective field described below
}
${visualInstructions}
${layoutDirectiveInstructions}

Requirements:
- Write ALL text content in ${langName}
- Key points: complete, impactful statements (10-20 words each), 3-4 points maximum
- Each point must convey ONE clear idea — no compound sentences
- Notes must follow the structured speaker-note format below and be suitable for the PPT notes area
- ${context.style} tone throughout
- Visual data must be directly relevant to "${slide.title}"

Speaker notes format:
${speakerNotesGuidance}`;

  const enriched = await withRetry(() =>
    deepseek.chat.completions
      .create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.65,
      })
      .then((response) => {
        const responseContent = response.choices[0].message.content;
        if (!responseContent) return {} as Partial<SlideContent>;
        return JSON.parse(responseContent) as Partial<SlideContent>;
      }),
  );

  return normalizeSlideContent(
    {
      ...slide,
      keyPoints: enriched.keyPoints || slide.keyPoints,
      notes: enriched.notes || slide.notes,
      layoutDirective: enriched.layoutDirective || slide.layoutDirective,
      chartData: enriched.chartData || slide.chartData,
      stats: enriched.stats || slide.stats,
      processSteps: enriched.processSteps || slide.processSteps,
      comparison: enriched.comparison || slide.comparison,
      icons: enriched.icons || slide.icons,
    },
    slide.slideNumber,
  );
}

export async function regenerateSlideContent(params: {
  slide: SlideContent;
  outline: PPTOutline;
  topic: string;
  language: string;
  style: string;
  mode: RegenerateSlideMode;
}): Promise<SlideContent> {
  const { slide, outline, topic, language, style, mode } = params;
  const langName = language === "zh" ? "Chinese (Simplified)" : "English";
  const previousSlide = outline.slides.find((item) => item.slideNumber === slide.slideNumber - 1);
  const nextSlide = outline.slides.find((item) => item.slideNumber === slide.slideNumber + 1);

  const deckSummary = outline.slides
    .map((item) => {
      const keyPointSummary = (item.keyPoints ?? []).slice(0, 3).join(" / ");
      return `${item.slideNumber}. [${item.slideType}/${item.visualType ?? "text-only"}] ${item.title}${keyPointSummary ? ` - ${keyPointSummary}` : ""}`;
    })
    .join("\n")
    .slice(0, 3200);

  const notesEnabled = mode === "content-and-notes" || mode === "content-notes-and-chart";
  const chartEnabled = mode === "content-notes-and-chart" && slide.visualType === "chart";
  const speakerNotesGuidance = getSpeakerNotesGuidance(slide, {
    presentationTitle: outline.presentationTitle,
    topic,
    language,
    style,
  });

  let returnShape = `"title": "Improved slide title",
  "keyPoints": ["Point 1", "Point 2", "Point 3"]`;

  if (notesEnabled) {
    returnShape += `,
  "notes": "Structured speaker notes"`;
  }

  if (chartEnabled) {
    returnShape += `,
  "chartData": {
    "chartType": "bar|pie|line|donut|area",
    "title": "Chart title",
    "labels": ["Label 1", "Label 2", "Label 3"],
    "series": [{ "name": "Series name", "values": [10, 20, 30] }]
  }`;
  }

  const chartRequirements = chartEnabled
    ? `
Chart regeneration rules:
- Keep the chart directly aligned with this slide's purpose
- For pie/donut charts, provide EXACTLY 1 series and values that sum to roughly 100
- For bar/line/area charts, labels and values must align in length
- Use realistic, presentation-ready values
- Use 3-6 labels max`
    : "";

  const notesRequirements = notesEnabled
    ? `
Speaker notes rules:
- Notes must follow this exact structure guidance
- Keep them concise enough for the PPT notes area
- Sound like a real presenter, not a written report

${speakerNotesGuidance}`
    : "";

  const userPrompt = `Regenerate exactly one slide for a ${style} presentation.

Presentation title: ${outline.presentationTitle}
Topic: ${topic}
Language: ${langName}
Slide number: ${slide.slideNumber}
Slide type: ${slide.slideType}
Visual type: ${slide.visualType ?? "text-only"}
Regeneration mode: ${mode}

Previous slide:
${previousSlide ? JSON.stringify({ slideNumber: previousSlide.slideNumber, title: previousSlide.title, keyPoints: previousSlide.keyPoints }, null, 2) : "None"}

Current slide:
${JSON.stringify(slide, null, 2)}

Next slide:
${nextSlide ? JSON.stringify({ slideNumber: nextSlide.slideNumber, title: nextSlide.title, keyPoints: nextSlide.keyPoints }, null, 2) : "None"}

Full deck summary:
${deckSummary}

Return valid JSON only:
{
  ${returnShape}
}

Requirements:
- Write ALL user-facing text in ${langName}
- Keep the slide aligned with the surrounding slide flow
- Preserve the purpose of this slide, but improve clarity, specificity, and presentation quality
- Title should be concise and presentation-ready
- Key points should be 3-4 clear, concrete statements
- Do not rewrite the entire deck
- Do not include markdown or commentary outside JSON
${notesRequirements}
${chartRequirements}`;

  const regenerated = await withRetry(() =>
    deepseek.chat.completions
      .create({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "You are an expert presentation editor. Improve one slide while preserving the deck's structure and continuity. Always respond with valid JSON only.",
          },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      })
      .then((response) => {
        const responseContent = response.choices[0].message.content;
        if (!responseContent) return {} as Partial<SlideContent>;
        return JSON.parse(responseContent) as Partial<SlideContent>;
      }),
  );

  return normalizeSlideContent(
    {
      ...slide,
      title: normalizeString(regenerated.title) ?? slide.title,
      keyPoints: regenerated.keyPoints || slide.keyPoints,
      notes: notesEnabled ? regenerated.notes || slide.notes : slide.notes,
      chartData: chartEnabled ? regenerated.chartData || slide.chartData : slide.chartData,
    },
    slide.slideNumber,
  );
}
