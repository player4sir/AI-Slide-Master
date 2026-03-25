import { Router, type IRouter, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import { logger } from "../lib/logger.js";
import { db, pptJobsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import {
  enrichSlideContent,
  normalizeOutlineForExport,
  planOutline,
  type PPTOutline,
  regenerateSlideContent,
  type RegenerateSlideMode,
  type SlideContent,
} from "../lib/deepseek.js";
import { buildPPTX } from "../lib/pptx-builder.js";
import { TEMPLATES } from "../lib/templates/index.js";
import { applyInfographicUpgrade, analyzeInfographicOpportunities } from "../lib/infographic-engine.js";
import { analyzeNarrative } from "../lib/narrative-optimizer.js";
import { quickCoach, deepCoach } from "../lib/presentation-coach.js";
import { type BrandKit } from "../lib/brand-kit.js";
import { generateDesignSpec, getDefaultDesignSpec, type DesignSpec } from "../lib/design-strategist.js";

const router: IRouter = Router();

type GenerationMode = "outline-only" | "full";

type ProcessJobParams = {
  topic: string;
  language: string;
  slideCount: number;
  style: string;
  themePreset?: string;
  primaryColor?: string;
  audience?: string;
  additionalRequirements?: string;
  useAgentSkills: boolean;
  generationMode: GenerationMode;
};

type ContinueJobParams = {
  topic: string;
  language: string;
  style: string;
  useAgentSkills: boolean;
  outline: PPTOutline;
};

function getOutlinePayload(outline: unknown): Partial<PPTOutline> {
  if (Array.isArray(outline)) {
    return {
      slides: outline,
      themePreset: undefined,
      primaryColor: undefined,
    };
  }

  return (outline as Partial<PPTOutline>) ?? {};
}

async function failJob(jobId: string, error: unknown, outline?: PPTOutline) {
  const errMsg = error instanceof Error ? error.message : String(error);

  await db
    .update(pptJobsTable)
    .set({
      status: "failed",
      error: errMsg,
      currentStep: "生成失败",
      outline: outline ? (outline as unknown as Record<string, unknown>) : undefined,
    })
    .where(eq(pptJobsTable.id, jobId));
}

async function createOutline(params: ProcessJobParams): Promise<PPTOutline> {
  const outline = normalizeOutlineForExport(
    await planOutline({
      topic: params.topic,
      language: params.language,
      slideCount: params.slideCount,
      style: params.style,
      audience: params.audience,
      additionalRequirements: params.additionalRequirements,
    }),
  );

  outline.themePreset = params.themePreset;
  outline.primaryColor = params.primaryColor;

  return outline;
}

async function runContentGenerationPhase(jobId: string, params: ContinueJobParams) {
  const outline = params.outline;

  // Phase 2: Generate Design Specification (AI-driven design strategy)
  await db
    .update(pptJobsTable)
    .set({
      status: "generating",
      progress: 25,
      currentStep: "生成设计规范...",
      outline: outline as unknown as Record<string, unknown>,
    })
    .where(eq(pptJobsTable.id, jobId));

  let designSpec: DesignSpec;
  if (params.useAgentSkills) {
    try {
      designSpec = await generateDesignSpec(outline, {
        topic: params.topic,
        language: params.language,
        style: params.style,
      });
    } catch {
      designSpec = getDefaultDesignSpec(outline.slides.length);
    }
  } else {
    designSpec = getDefaultDesignSpec(outline.slides.length);
  }

  // Apply DesignSpec colors to theme override
  if (!outline.primaryColor && designSpec.colorScheme.primary !== "1A5276") {
    outline.primaryColor = designSpec.colorScheme.primary;
  }

  await db
    .update(pptJobsTable)
    .set({
      progress: 35,
      currentStep: "生成幻灯片内容...",
    })
    .where(eq(pptJobsTable.id, jobId));

  let enrichedSlides: SlideContent[] = outline.slides;

  if (params.useAgentSkills) {
    const currentSlides = [...outline.slides];
    const CONCURRENCY = 2;
    let completedCount = 0;
    let running = 0;

    const waiters: Array<() => void> = [];
    const acquire = (): Promise<void> => {
      if (running < CONCURRENCY) { running++; return Promise.resolve(); }
      return new Promise<void>(resolve => waiters.push(resolve));
    };
    const release = async () => {
      completedCount++;
      const progress = 35 + Math.floor((completedCount / outline.slides.length) * 35);
      await db
        .update(pptJobsTable)
        .set({
          progress,
          currentStep: `优化幻灯片内容 (${completedCount}/${outline.slides.length})...`,
          outline: { ...outline, slides: [...currentSlides] } as unknown as Record<string, unknown>,
        })
        .where(eq(pptJobsTable.id, jobId));
      if (waiters.length > 0) { waiters.shift()!(); }
      else { running--; }
    };

    const enrichPromises: Promise<void>[] = [];
    for (let index = 0; index < outline.slides.length; index++) {
      await acquire();
      const idx = index;
      const slide = outline.slides[idx];
      enrichPromises.push(
        enrichSlideContent(slide, {
          presentationTitle: outline.presentationTitle,
          topic: params.topic,
          language: params.language,
          style: params.style,
          designSpec,
        })
          .then(enriched => { currentSlides[idx] = enriched; })
          .then(() => release())
          .catch(() => release())
      );
    }

    await Promise.all(enrichPromises);
    enrichedSlides = currentSlides;
  }

  // Phase 3: Auto-upgrade plain text slides with infographic intelligence
  enrichedSlides = enrichedSlides.map(slide => applyInfographicUpgrade(slide));

  const enrichedOutline = normalizeOutlineForExport({
    ...outline,
    slides: enrichedSlides,
  });

  await db
    .update(pptJobsTable)
    .set({
      status: "building",
      progress: 80,
      currentStep: "构建 PPTX 文件...",
      outline: enrichedOutline as unknown as Record<string, unknown>,
    })
    .where(eq(pptJobsTable.id, jobId));

  const filePath = await buildPPTX(enrichedOutline, enrichedOutline.themePreset, undefined, designSpec);

  await db
    .update(pptJobsTable)
    .set({
      status: "completed",
      progress: 100,
      currentStep: "生成完成",
      filePath,
      outline: enrichedOutline as unknown as Record<string, unknown>,
      completedAt: new Date(),
    })
    .where(eq(pptJobsTable.id, jobId));
}

async function processJob(jobId: string, params: ProcessJobParams) {
  let outline: PPTOutline | undefined;

  try {
    await db
      .update(pptJobsTable)
      .set({
        status: "planning",
        progress: 5,
        currentStep: "分析主题，规划演示结构...",
      })
      .where(eq(pptJobsTable.id, jobId));

    outline = await createOutline(params);

    if (params.generationMode === "outline-only") {
      await db
        .update(pptJobsTable)
        .set({
          status: "outline_ready",
          progress: 30,
          currentStep: "大纲已生成，等待确认",
          outline: outline as unknown as Record<string, unknown>,
        })
        .where(eq(pptJobsTable.id, jobId));

      return;
    }

    await runContentGenerationPhase(jobId, {
      topic: params.topic,
      language: params.language,
      style: params.style,
      useAgentSkills: params.useAgentSkills,
      outline,
    });
  } catch (error) {
    await failJob(jobId, error, outline);
  }
}

async function continueJob(jobId: string, params: ContinueJobParams) {
  try {
    await runContentGenerationPhase(jobId, params);
  } catch (error) {
    await failJob(jobId, error, params.outline);
  }
}

router.get("/templates", (req: Request, res: Response) => {
  const templates = TEMPLATES.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    coverUrl: t.coverUrl,
    baseTheme: t.baseTheme,
  }));
  res.json({ templates });
});

router.post("/generate", async (req: Request, res: Response) => {
  const {
    topic,
    language = "zh",
    slideCount = 10,
    style = "professional",
    themePreset,
    primaryColor,
    audience,
    additionalRequirements,
    useAgentSkills = true,
    generationMode = "full",
  } = req.body as ProcessJobParams;

  if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
    res.status(400).json({ error: "invalid_request", message: "Topic is required" });
    return;
  }

  const normalizedMode: GenerationMode = generationMode === "outline-only" ? "outline-only" : "full";
  const jobId = uuidv4();
  const count = Math.min(Math.max(Number(slideCount) || 10, 3), 30);

  await db.insert(pptJobsTable).values({
    id: jobId,
    topic: topic.trim(),
    language,
    slideCount: count,
    style,
    audience: audience || null,
    additionalRequirements: additionalRequirements || null,
    useAgentSkills: useAgentSkills ? 1 : 0,
    status: "pending",
    progress: 0,
    currentStep: "等待处理...",
  });

  processJob(jobId, {
    topic: topic.trim(),
    language,
    slideCount: count,
    style,
    themePreset,
    primaryColor,
    audience,
    additionalRequirements,
    useAgentSkills: Boolean(useAgentSkills),
    generationMode: normalizedMode,
  }).catch((err) => {
    logger.error({ err, jobId }, "Unhandled error in processJob");
  });

  const estimatedTime = normalizedMode === "outline-only" ? Math.max(6, Math.ceil(count * 1.5)) : count * (useAgentSkills ? 8 : 4);

  res.json({
    jobId,
    message: normalizedMode === "outline-only" ? "PPT outline generation started" : "PPT generation started",
    estimatedTime,
  });
});

router.post("/continue", async (req: Request, res: Response) => {
  const {
    jobId,
    style,
    themePreset,
    primaryColor,
    outline,
  } = req.body as {
    jobId?: string;
    style?: string;
    themePreset?: string;
    primaryColor?: string;
    outline?: Partial<PPTOutline>;
  };

  if (!jobId || typeof jobId !== "string") {
    res.status(400).json({ error: "invalid_request", message: "jobId is required" });
    return;
  }

  if (!outline || !Array.isArray(outline.slides) || outline.slides.length === 0) {
    res.status(400).json({ error: "invalid_request", message: "outline is required" });
    return;
  }

  const [job] = await db.select().from(pptJobsTable).where(eq(pptJobsTable.id, jobId)).limit(1);

  if (!job) {
    res.status(404).json({ error: "not_found", message: "Job not found" });
    return;
  }

  if (job.status !== "outline_ready") {
    res.status(400).json({
      error: "invalid_state",
      message: "Only outline_ready jobs can continue generation",
    });
    return;
  }

  const outlinePayload = getOutlinePayload(job.outline);
  const normalizedOutline = normalizeOutlineForExport({
    presentationTitle: outline.presentationTitle || outlinePayload.presentationTitle || job.topic,
    theme: outline.theme || outlinePayload.theme,
    themePreset: themePreset ?? outline.themePreset ?? outlinePayload.themePreset,
    primaryColor: primaryColor ?? outline.primaryColor ?? outlinePayload.primaryColor,
    slides: outline.slides,
  });

  continueJob(jobId, {
    topic: job.topic,
    language: job.language,
    style: style || job.style,
    useAgentSkills: Boolean(job.useAgentSkills),
    outline: normalizedOutline,
  }).catch((err) => {
    logger.error({ err, jobId }, "Unhandled error in continueJob");
  });

  res.json({
    jobId,
    message: "PPT generation resumed",
    estimatedTime: normalizedOutline.slides.length * (job.useAgentSkills ? 8 : 4),
  });
});

router.post("/export", async (req: Request, res: Response) => {
  const { jobId, style = "professional", themePreset, primaryColor, outline, brandKit } = req.body as {
    jobId?: string;
    style?: string;
    themePreset?: string;
    primaryColor?: string;
    outline?: Partial<PPTOutline>;
    brandKit?: BrandKit;
  };

  if (!jobId || typeof jobId !== "string") {
    res.status(400).json({ error: "invalid_request", message: "jobId is required" });
    return;
  }

  if (!outline || !Array.isArray(outline.slides) || outline.slides.length === 0) {
    res.status(400).json({ error: "invalid_request", message: "outline is required" });
    return;
  }

  const [job] = await db.select().from(pptJobsTable).where(eq(pptJobsTable.id, jobId)).limit(1);

  if (!job) {
    res.status(404).json({ error: "not_found", message: "Job not found" });
    return;
  }

  let filePath: string | undefined;
  try {
    const normalizedOutline = normalizeOutlineForExport({
      presentationTitle: outline.presentationTitle || job.topic,
      theme: outline.theme,
      themePreset,
      primaryColor,
      slides: outline.slides,
    });

    filePath = await buildPPTX(normalizedOutline, normalizedOutline.themePreset, brandKit);
    const safeTitle = job.topic.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_").slice(0, 50);
    const filename = `${safeTitle}_edited.pptx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);

    const stream = fs.createReadStream(filePath);
    stream.on("end", () => {
      // Clean up temp file after streaming completes
      fs.unlink(filePath!, (err) => {
        if (err) logger.warn({ err, filePath }, "Failed to clean up exported temp file");
      });
    });
    stream.pipe(res);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed";
    logger.error({ err: error, jobId }, "Export failed");
    if (!res.headersSent) {
      res.status(500).json({ error: "server_error", message });
    }
  }
});

router.post("/regenerate-slide", async (req: Request, res: Response) => {
  const {
    jobId,
    slideNumber,
    mode,
    style,
    themePreset,
    primaryColor,
    outline,
  } = req.body as {
    jobId?: string;
    slideNumber?: number;
    mode?: RegenerateSlideMode;
    style?: string;
    themePreset?: string;
    primaryColor?: string;
    outline?: Partial<PPTOutline>;
  };

  if (!jobId || typeof jobId !== "string") {
    res.status(400).json({ error: "invalid_request", message: "jobId is required" });
    return;
  }

  if (!Number.isInteger(slideNumber) || Number(slideNumber) <= 0) {
    res.status(400).json({ error: "invalid_request", message: "slideNumber must be a positive integer" });
    return;
  }

  if (!outline || !Array.isArray(outline.slides) || outline.slides.length === 0) {
    res.status(400).json({ error: "invalid_request", message: "outline is required" });
    return;
  }

  const normalizedMode: RegenerateSlideMode | undefined =
    mode === "content" || mode === "content-and-notes" || mode === "content-notes-and-chart"
      ? mode
      : undefined;

  if (!normalizedMode) {
    res.status(400).json({ error: "invalid_request", message: "mode is invalid" });
    return;
  }

  const [job] = await db.select().from(pptJobsTable).where(eq(pptJobsTable.id, jobId)).limit(1);

  if (!job) {
    res.status(404).json({ error: "not_found", message: "Job not found" });
    return;
  }

  if (job.status !== "outline_ready" && job.status !== "completed") {
    res.status(400).json({
      error: "invalid_state",
      message: "Single-slide regeneration is only available for outline_ready or completed jobs",
    });
    return;
  }

  if (job.status === "outline_ready" && normalizedMode !== "content") {
    res.status(400).json({
      error: "invalid_state",
      message: "outline_ready jobs only support content regeneration",
    });
    return;
  }

  const outlinePayload = getOutlinePayload(job.outline);
  const normalizedOutline = normalizeOutlineForExport({
    presentationTitle: outline.presentationTitle || outlinePayload.presentationTitle || job.topic,
    theme: outline.theme || outlinePayload.theme,
    themePreset: themePreset ?? outline.themePreset ?? outlinePayload.themePreset,
    primaryColor: primaryColor ?? outline.primaryColor ?? outlinePayload.primaryColor,
    slides: outline.slides,
  });

  const targetSlide = normalizedOutline.slides.find((slide) => slide.slideNumber === Number(slideNumber));

  if (!targetSlide) {
    res.status(404).json({ error: "not_found", message: "Slide not found" });
    return;
  }

  if (normalizedMode === "content-notes-and-chart" && targetSlide.visualType !== "chart") {
    res.status(400).json({
      error: "invalid_request",
      message: "content-notes-and-chart is only available for chart slides",
    });
    return;
  }

  try {
    const regeneratedSlide = await regenerateSlideContent({
      slide: targetSlide,
      outline: normalizedOutline,
      topic: job.topic,
      language: job.language,
      style: style || job.style,
      mode: normalizedMode,
    });

    res.json(regeneratedSlide);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Slide regeneration failed";
    res.status(500).json({ error: "server_error", message });
  }
});

router.get("/status/:jobId", async (req: Request, res: Response) => {
  const jobId = String(req.params.jobId);

  const [job] = await db.select().from(pptJobsTable).where(eq(pptJobsTable.id, jobId)).limit(1);

  if (!job) {
    res.status(404).json({ error: "not_found", message: "Job not found" });
    return;
  }

  const outlinePayload = getOutlinePayload(job.outline);

  res.json({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    currentStep: job.currentStep,
    outline: Array.isArray(job.outline) ? job.outline : outlinePayload.slides,
    themePreset: outlinePayload.themePreset,
    primaryColor: outlinePayload.primaryColor,
    downloadUrl: job.status === "completed" ? `/api/ppt/download/${job.id}` : null,
    error: job.error,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
  });
});

router.get("/download/:jobId", async (req: Request, res: Response) => {
  const jobId = String(req.params.jobId);

  const [job] = await db.select().from(pptJobsTable).where(eq(pptJobsTable.id, jobId)).limit(1);

  if (!job || job.status !== "completed" || !job.filePath) {
    res.status(404).json({ error: "not_found", message: "File not found or not ready" });
    return;
  }

  if (!fs.existsSync(job.filePath)) {
    res.status(404).json({ error: "file_expired", message: "File has expired. Please regenerate." });
    return;
  }

  const safeTitle = job.topic.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_").slice(0, 50);
  const filename = `${safeTitle}.pptx`;

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);

  const stream = fs.createReadStream(job.filePath);
  stream.pipe(res);
});

router.get("/history", async (_req: Request, res: Response) => {
  const jobs = await db
    .select({
      id: pptJobsTable.id,
      topic: pptJobsTable.topic,
      status: pptJobsTable.status,
      createdAt: pptJobsTable.createdAt,
      completedAt: pptJobsTable.completedAt,
    })
    .from(pptJobsTable)
    .orderBy(desc(pptJobsTable.createdAt))
    .limit(50);

  res.json({
    items: jobs.map((job) => ({
      jobId: job.id,
      topic: job.topic,
      status: job.status,
      createdAt: job.createdAt,
      downloadUrl: job.status === "completed" ? `/api/ppt/download/${job.id}` : null,
    })),
  });
});

// ─── PHASE 2: AI NARRATIVE FLOW ANALYSIS ─────────────────────────────────────

router.post("/analyze-narrative", async (req: Request, res: Response) => {
  try {
    const { outline, language } = req.body as { outline: PPTOutline; language?: string };
    if (!outline?.slides?.length) {
      res.status(400).json({ error: "outline with slides is required" });
      return;
    }

    const normalized = normalizeOutlineForExport(outline);
    const analysis = await analyzeNarrative(normalized, language || "zh");
    res.json(analysis);
  } catch (error) {
    logger.error("Narrative analysis failed: %s", String(error));
    res.status(500).json({ error: "Narrative analysis failed" });
  }
});

// ─── PHASE 3: INFOGRAPHIC ANALYSIS ──────────────────────────────────────────

router.post("/analyze-infographic", async (req: Request, res: Response) => {
  try {
    const { slides } = req.body as { slides: SlideContent[] };
    if (!slides?.length) {
      res.status(400).json({ error: "slides array is required" });
      return;
    }

    const opportunities = analyzeInfographicOpportunities(slides);
    res.json({ opportunities, upgradeCount: opportunities.length });
  } catch (error) {
    logger.error("Infographic analysis failed: %s", String(error));
    res.status(500).json({ error: "Infographic analysis failed" });
  }
});

// ─── PHASE 4: PRESENTATION COACH ────────────────────────────────────────────

router.post("/coach", async (req: Request, res: Response) => {
  try {
    const { outline, language, deep } = req.body as { outline: PPTOutline; language?: string; deep?: boolean };
    if (!outline?.slides?.length) {
      res.status(400).json({ error: "outline with slides is required" });
      return;
    }

    const normalized = normalizeOutlineForExport(outline);
    const analysis = deep
      ? await deepCoach(normalized, language || "zh")
      : quickCoach(normalized);

    res.json(analysis);
  } catch (error) {
    logger.error("Coach analysis failed: %s", String(error));
    res.status(500).json({ error: "Coach analysis failed" });
  }
});

export default router;
