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

export interface SlideContent {
  slideNumber: number;
  title: string;
  slideType: "title" | "content" | "section" | "conclusion" | "qa";
  keyPoints: string[];
  notes?: string;
  layout?: "title-only" | "title-content" | "two-column" | "section-header";
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

  const systemPrompt = `You are an expert presentation designer and content strategist. Your task is to create detailed, compelling presentation outlines. Always respond with valid JSON only.`;

  const userPrompt = `Create a ${slideCount}-slide presentation outline in ${langName} for the following topic:

Topic: ${topic}
Style: ${style}
${audienceStr}
${reqStr}

Return a JSON object with this exact structure:
{
  "presentationTitle": "Full presentation title",
  "theme": "Brief description of visual theme/color approach",
  "slides": [
    {
      "slideNumber": 1,
      "title": "Slide title",
      "slideType": "title|content|section|conclusion|qa",
      "keyPoints": ["point 1", "point 2", "point 3"],
      "notes": "Speaker notes",
      "layout": "title-only|title-content|two-column|section-header"
    }
  ]
}

Requirements:
- First slide must be slideType "title"
- Last slide should be "conclusion" or "qa"
- Use "section" type for major topic dividers
- Each content slide should have 3-5 key points
- Key points should be concise but informative (1-2 sentences each)
- Speaker notes should provide additional context
- Make content professional and engaging for ${style} style
- Total slides: exactly ${slideCount}`;

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

  const systemPrompt = `You are an expert presentation content writer. Enrich slide content with compelling, detailed bullet points. Always respond with valid JSON only.`;

  const userPrompt = `Enrich this slide content for a ${context.style} presentation about "${context.topic}":

Slide title: ${slide.title}
Current key points: ${JSON.stringify(slide.keyPoints)}

Return JSON with this structure:
{
  "keyPoints": ["enhanced point 1", "enhanced point 2", ...],
  "notes": "Enhanced speaker notes with supporting data, examples, or context"
}

Requirements:
- Write in ${langName}
- Each key point should be a complete, impactful statement (not just a word or phrase)
- Keep points concise but substantive (10-25 words each)
- Add specific examples, statistics, or actionable insights where appropriate
- Speaker notes should provide 2-3 sentences of additional context
- Maintain ${context.style} tone throughout`;

  const response = await deepseek.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.6,
  });

  const content = response.choices[0].message.content;
  if (!content) return slide;

  const enriched = JSON.parse(content) as { keyPoints: string[]; notes: string };
  return {
    ...slide,
    keyPoints: enriched.keyPoints || slide.keyPoints,
    notes: enriched.notes || slide.notes,
  };
}
