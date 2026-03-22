import { Router, type IRouter, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { db, pptJobsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { planOutline, enrichSlideContent, type SlideContent } from "../lib/deepseek.js";
import { buildPPTX } from "../lib/pptx-builder.js";

const router: IRouter = Router();

async function processJob(jobId: string, params: {
  topic: string;
  language: string;
  slideCount: number;
  style: string;
  audience?: string;
  additionalRequirements?: string;
  useAgentSkills: boolean;
}) {
  try {
    await db.update(pptJobsTable)
      .set({ status: "planning", progress: 5, currentStep: "分析主题，规划演示结构..." })
      .where(eq(pptJobsTable.id, jobId));

    const outline = await planOutline({
      topic: params.topic,
      language: params.language,
      slideCount: params.slideCount,
      style: params.style,
      audience: params.audience,
      additionalRequirements: params.additionalRequirements,
    });

    await db.update(pptJobsTable)
      .set({
        status: "generating",
        progress: 35,
        currentStep: "生成幻灯片内容...",
        outline: outline.slides as unknown as Record<string, unknown>[],
      })
      .where(eq(pptJobsTable.id, jobId));

    let enrichedSlides: SlideContent[] = outline.slides;

    if (params.useAgentSkills) {
      const enrichmentPromises = outline.slides.map(async (slide, index) => {
        const enriched = await enrichSlideContent(slide, {
          presentationTitle: outline.presentationTitle,
          topic: params.topic,
          language: params.language,
          style: params.style,
        });

        const progress = 35 + Math.floor(((index + 1) / outline.slides.length) * 35);
        await db.update(pptJobsTable)
          .set({
            progress,
            currentStep: `优化幻灯片内容 (${index + 1}/${outline.slides.length})...`,
            outline: outline.slides as unknown as Record<string, unknown>[],
          })
          .where(eq(pptJobsTable.id, jobId));

        return enriched;
      });

      enrichedSlides = await Promise.all(enrichmentPromises);
    }

    const enrichedOutline = { ...outline, slides: enrichedSlides };

    await db.update(pptJobsTable)
      .set({
        status: "building",
        progress: 80,
        currentStep: "构建 PPTX 文件...",
        outline: enrichedSlides as unknown as Record<string, unknown>[],
      })
      .where(eq(pptJobsTable.id, jobId));

    const filePath = await buildPPTX(enrichedOutline, params.style);

    await db.update(pptJobsTable)
      .set({
        status: "completed",
        progress: 100,
        currentStep: "生成完成！",
        filePath,
        outline: enrichedSlides as unknown as Record<string, unknown>[],
        completedAt: new Date(),
      })
      .where(eq(pptJobsTable.id, jobId));
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await db.update(pptJobsTable)
      .set({
        status: "failed",
        error: errMsg,
        currentStep: "生成失败",
      })
      .where(eq(pptJobsTable.id, jobId));
  }
}

router.post("/generate", async (req: Request, res: Response) => {
  const { topic, language = "zh", slideCount = 10, style = "professional", audience, additionalRequirements, useAgentSkills = true } = req.body;

  if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
    res.status(400).json({ error: "invalid_request", message: "Topic is required" });
    return;
  }

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
    audience,
    additionalRequirements,
    useAgentSkills: Boolean(useAgentSkills),
  }).catch(() => {});

  const estimatedTime = count * (useAgentSkills ? 8 : 4);

  res.json({
    jobId,
    message: "PPT generation started",
    estimatedTime,
  });
});

router.get("/status/:jobId", async (req: Request, res: Response) => {
  const { jobId } = req.params;

  const [job] = await db.select().from(pptJobsTable).where(eq(pptJobsTable.id, jobId)).limit(1);

  if (!job) {
    res.status(404).json({ error: "not_found", message: "Job not found" });
    return;
  }

  res.json({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    currentStep: job.currentStep,
    outline: job.outline,
    downloadUrl: job.status === "completed" ? `/api/ppt/download/${job.id}` : null,
    error: job.error,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
  });
});

router.get("/download/:jobId", async (req: Request, res: Response) => {
  const { jobId } = req.params;

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
  const jobs = await db.select({
    id: pptJobsTable.id,
    topic: pptJobsTable.topic,
    status: pptJobsTable.status,
    createdAt: pptJobsTable.createdAt,
    completedAt: pptJobsTable.completedAt,
  }).from(pptJobsTable).orderBy(desc(pptJobsTable.createdAt)).limit(50);

  res.json({
    items: jobs.map((j) => ({
      jobId: j.id,
      topic: j.topic,
      status: j.status,
      createdAt: j.createdAt,
      downloadUrl: j.status === "completed" ? `/api/ppt/download/${j.id}` : null,
    })),
  });
});

export default router;
