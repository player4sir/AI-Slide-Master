import React from "react";
import AiInsightsPanel from "@/components/AiInsightsPanel";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  CircleDashed,
  Cpu,
  Download,
  FilePenLine,
  FileText,
  Loader2,
  Package,
  Palette,
  RefreshCw,
  ScanSearch,
  TriangleAlert,
  X,
} from "lucide-react";
import type {
  ChartData,
  ChartSeries,
  PPTJobStatus,
  RegenerateSlideRequestMode,
  SlideOutlineItem,
} from "@workspace/api-client-react";
import {
  downloadPPT,
  useContinuePPT,
  useExportPPT,
  useGetPPTStatus,
  useRegenerateSlide,
} from "@workspace/api-client-react";
import { useRoute } from "wouter";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_TEMPLATE_ID,
  getThemePreview,
  normalizePrimaryColor,
  primaryColorSwatches,
} from "@/lib/presentation-theme";
import { downloadBlob } from "@/lib/utils";

const STEPS = [
  { id: "pending", label: "排队中", icon: CircleDashed },
  { id: "planning", label: "理解主题", icon: ScanSearch },
  { id: "outline_ready", label: "确认大纲", icon: FileText },
  { id: "generating", label: "生成内容", icon: Cpu },
  { id: "building", label: "构建文件", icon: Package },
  { id: "completed", label: "已完成", icon: CheckCircle2 },
] as const;

type ThemedJobStatus = PPTJobStatus & {
  themePreset?: string;
  primaryColor?: string;
};

type EditableSlide = SlideOutlineItem & {
  keyPoints: string[];
  notes?: string;
  chartData?: ChartData;
};

type EditableOutline = {
  presentationTitle?: string;
  theme?: string;
  themePreset?: string;
  primaryColor?: string;
  slides: EditableSlide[];
};

function cloneSlide(slide: SlideOutlineItem): EditableSlide {
  return {
    ...slide,
    keyPoints: [...(slide.keyPoints ?? [])],
    notes: slide.notes ?? "",
    chartData: slide.chartData
      ? {
          ...slide.chartData,
          labels: [...slide.chartData.labels],
          series: slide.chartData.series.map((series: ChartSeries) => ({
            ...series,
            values: [...series.values],
          })),
        }
      : undefined,
  };
}

function cloneOutline(jobStatus?: ThemedJobStatus): EditableOutline {
  return {
    themePreset: jobStatus?.themePreset ?? DEFAULT_TEMPLATE_ID,
    primaryColor: jobStatus?.primaryColor ?? "",
    slides: (jobStatus?.outline ?? []).map(cloneSlide),
  };
}

export default function JobView() {
  const [, params] = useRoute("/job/:jobId");
  const jobId = params?.jobId ?? "";

  const [isDownloading, setIsDownloading] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [draftOutline, setDraftOutline] = React.useState<EditableOutline>({ slides: [] });
  const [activeRegenerationSlide, setActiveRegenerationSlide] = React.useState<number | null>(null);
  const [regeneratingSlideIndex, setRegeneratingSlideIndex] = React.useState<number | null>(null);
  const [lastRegeneratedSlide, setLastRegeneratedSlide] = React.useState<{
    slideIndex: number;
    previousSlide: EditableSlide;
  } | null>(null);
  const [brandKit, setBrandKit] = React.useState<{
    id: string;
    name: string;
    logoData?: string;
    logoPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    logoScale: number;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    titleFont?: string;
    bodyFont?: string;
    watermarkText?: string;
    watermarkOpacity?: number;
    companyName?: string;
  }>({
    id: "custom",
    name: "自定义",
    logoPosition: "bottom-right",
    logoScale: 1.0,
  });
  const exportMutation = useExportPPT();
  const continueMutation = useContinuePPT();
  const regenerateSlideMutation = useRegenerateSlide();

  const { data: jobStatus, isLoading, isError } = useGetPPTStatus<ThemedJobStatus>(jobId, {
    query: {
      refetchInterval: (query: { state: { data?: PPTJobStatus } }) => {
        const status = query.state.data?.status;
        return status === "completed" || status === "failed" ? false : 2000;
      },
    } as never,
  });

  const isEditingRef = React.useRef(false);
  React.useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  React.useEffect(() => {
    if (!jobStatus?.outline) return;

    // Only sync from server if user is NOT editing/confirming the outline
    const userIsEditing = isEditingRef.current || jobStatus.status === "outline_ready";

    // Initial load: populate draft if empty
    if (draftOutline.slides.length === 0) {
      setDraftOutline(cloneOutline(jobStatus));
      return;
    }

    // Don't overwrite user's work during active editing
    if (userIsEditing) return;

    // Sync background progress updates (generating/building/completed states)
    setDraftOutline(cloneOutline(jobStatus));
  }, [jobStatus?.status, jobStatus?.progress]);

  const previewTheme = getThemePreview(draftOutline.themePreset, draftOutline.primaryColor);

  const handleDownload = async () => {
    if (!jobId) return;

    try {
      setIsDownloading(true);
      const blob = await downloadPPT(jobId);
      downloadBlob(blob, `演示文稿-${jobId.slice(0, 8)}.pptx`);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleExportEdited = async () => {
    if (!jobId || draftOutline.slides.length === 0) return;

    try {
      const blob = await exportMutation.mutateAsync({
        data: {
          jobId,
          themePreset: draftOutline.themePreset,
          primaryColor: normalizePrimaryColor(draftOutline.primaryColor),
          outline: draftOutline,
          brandKit: (brandKit.logoData || brandKit.primaryColor || brandKit.titleFont || brandKit.watermarkText || brandKit.companyName) ? brandKit : undefined,
        } as never,
      });
      downloadBlob(blob, `演示文稿-${jobId.slice(0, 8)}-已编辑.pptx`);
      setIsEditing(false);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const handleContinueGeneration = async () => {
    if (!jobId || draftOutline.slides.length === 0) return;

    try {
      await continueMutation.mutateAsync({
        data: {
          jobId,
          themePreset: draftOutline.themePreset,
          primaryColor: normalizePrimaryColor(draftOutline.primaryColor),
          outline: draftOutline,
        } as never,
      });
    } catch (error) {
      console.error("Continue generation failed:", error);
    }
  };

  const handleRegenerateSlide = async (slideIndex: number, mode: RegenerateSlideRequestMode) => {
    if (!jobId || draftOutline.slides.length === 0) return;

    const previousSlide = draftOutline.slides[slideIndex];
    if (!previousSlide) return;

    try {
      setRegeneratingSlideIndex(slideIndex);
      const regeneratedSlide = await regenerateSlideMutation.mutateAsync({
        data: {
          jobId,
          slideNumber: previousSlide.slideNumber,
          mode,
          themePreset: draftOutline.themePreset,
          primaryColor: normalizePrimaryColor(draftOutline.primaryColor),
          outline: draftOutline,
        } as never,
      });

      setDraftOutline((prev) => ({
        ...prev,
        slides: prev.slides.map((slide, currentIndex) =>
          currentIndex === slideIndex ? cloneSlide(regeneratedSlide) : slide,
        ),
      }));
      setLastRegeneratedSlide({
        slideIndex,
        previousSlide: cloneSlide(previousSlide),
      });
      setActiveRegenerationSlide(null);
    } catch (error) {
      console.error("Slide regeneration failed:", error);
    } finally {
      setRegeneratingSlideIndex(null);
    }
  };

  const handleUndoRegeneration = (slideIndex: number) => {
    if (!lastRegeneratedSlide || lastRegeneratedSlide.slideIndex !== slideIndex) return;

    setDraftOutline((prev) => ({
      ...prev,
      slides: prev.slides.map((slide, currentIndex) =>
        currentIndex === slideIndex ? cloneSlide(lastRegeneratedSlide.previousSlide) : slide,
      ),
    }));
    setLastRegeneratedSlide(null);
  };

  const updateSlide = (index: number, updater: (slide: EditableSlide) => EditableSlide) => {
    setDraftOutline((prev) => ({
      ...prev,
      slides: prev.slides.map((slide, slideIndex) => (slideIndex === index ? updater(slide) : slide)),
    }));
  };

  const updateKeyPoint = (slideIndex: number, pointIndex: number, value: string) => {
    updateSlide(slideIndex, (slide) => ({
      ...slide,
      keyPoints: slide.keyPoints.map((point: string, currentPointIndex: number) =>
        currentPointIndex === pointIndex ? value : point,
      ),
    }));
  };

  const addKeyPoint = (slideIndex: number) => {
    updateSlide(slideIndex, (slide) => ({
      ...slide,
      keyPoints: [...slide.keyPoints, ""],
    }));
  };

  const removeKeyPoint = (slideIndex: number, pointIndex: number) => {
    updateSlide(slideIndex, (slide) => ({
      ...slide,
      keyPoints: slide.keyPoints.filter((_: string, currentPointIndex: number) => currentPointIndex !== pointIndex),
    }));
  };

  const updateChartLabel = (slideIndex: number, labelIndex: number, value: string) => {
    updateSlide(slideIndex, (slide) => ({
      ...slide,
      chartData: slide.chartData
        ? {
            ...slide.chartData,
            labels: slide.chartData.labels.map((label: string, currentLabelIndex: number) =>
              currentLabelIndex === labelIndex ? value : label,
            ),
          }
        : undefined,
    }));
  };

  const updateChartValue = (
    slideIndex: number,
    seriesIndex: number,
    valueIndex: number,
    value: string,
  ) => {
    updateSlide(slideIndex, (slide) => ({
      ...slide,
      chartData: slide.chartData
        ? {
            ...slide.chartData,
            series: slide.chartData.series.map((series: ChartSeries, currentSeriesIndex: number) =>
              currentSeriesIndex === seriesIndex
                ? {
                    ...series,
                    values: series.values.map((seriesValue: number, currentValueIndex: number) =>
                      currentValueIndex === valueIndex ? Number(value) : seriesValue,
                    ),
                  }
                : series,
            ),
          }
        : undefined,
    }));
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="glass-panel w-full max-w-xl rounded-[2rem] p-8 text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-cyan-200" />
          <h2 className="mt-5 text-2xl font-black text-white">{"正在加载任务"}</h2>
        </div>
      </div>
    );
  }

  if (isError || !jobStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="glass-panel w-full max-w-xl rounded-[2rem] p-8 text-center">
          <TriangleAlert className="mx-auto h-12 w-12 text-rose-300" />
          <h2 className="mt-5 text-2xl font-black text-white">{"没有找到这个任务"}</h2>
        </div>
      </div>
    );
  }

  const currentStepIndex = Math.max(0, STEPS.findIndex((step) => step.id === jobStatus.status));
  const isOutlineReady = jobStatus.status === "outline_ready";
  const isCompleted = jobStatus.status === "completed";
  const isFailed = jobStatus.status === "failed";
  const canRegenerateSlides = isOutlineReady || isCompleted;
  const slides =
    isEditing || isOutlineReady || draftOutline.slides.length > 0 ? draftOutline.slides : cloneOutline(jobStatus).slides;
  const outlineEditableSlides = slides.filter((slide) => slide.slideType !== "section").length;

  return (
    <div className="relative px-5 py-8 sm:px-6 lg:px-10 lg:py-12">
      <div className="mx-auto max-w-6xl space-y-8">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bento-card bg-white/[0.03] p-10"
        >
          {isOutlineReady ? (
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/80">
                  Step 01 / 目录确认
                </p>
                <h1 className="mt-4 text-4xl font-black text-white sm:text-5xl leading-tight">
                  大纲已生成，<br />
                  <span className="text-gradient">等待您的核阅</span>
                </h1>
                <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                  AI 已根据您的主题构建了初步框架。请核对章节顺序与关键要点，确认无误后我们将开始全面填充内容。
                </p>
                <div className="mt-10 flex gap-6">
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">总页数</p>
                    <p className="mt-2 text-3xl font-black text-white">{slides.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">可编辑项</p>
                    <p className="mt-2 text-3xl font-black text-white">{outlineEditableSlides}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-8 shadow-2xl">
                <h3 className="text-lg font-bold text-white mb-6">检查清单</h3>
                <ul className="space-y-4">
                  {[
                    "章节逻辑是否符合汇报习惯",
                    "每一页的标题是否直达核心",
                    "要点是否覆盖了最重要的信息"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-[10px]">
                        {i + 1}
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/80">
                  Processing / 任务处理中
                </p>
                <h1 className="mt-4 text-4xl font-black text-white sm:text-5xl">
                  {isFailed ? "生成失败" : isCompleted ? "幻灯片已就绪" : "正在精心构建您的 PPT"}
                </h1>
                {!isCompleted && !isFailed && (
                   <div className="mt-8 h-2 w-full max-w-sm overflow-hidden rounded-full bg-white/5">
                     <motion.div 
                       className="h-full bg-primary shadow-[0_0_20px_rgba(202,138,4,0.5)]"
                       initial={{ width: 0 }}
                       animate={{ width: `${jobStatus.progress}%` }}
                       transition={{ duration: 1 }}
                     />
                   </div>
                )}
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">当前进度</p>
                  <p className="mt-2 text-5xl font-black text-primary">{jobStatus.progress}%</p>
                </div>

                {isCompleted && !isEditing && (
                  <button
                    onClick={() => {
                      setDraftOutline(cloneOutline(jobStatus));
                      setIsEditing(true);
                    }}
                    className="btn-premium-secondary"
                  >
                    <FilePenLine className="mr-2 h-5 w-5" />
                    二次编辑
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.section>

        <section className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="space-y-10">
            {/* Steps Visualizer */}
            {!isOutlineReady && !isCompleted && !isFailed && (
              <div className="flex flex-wrap gap-4">
                {STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isPast = index < currentStepIndex;
                  const isActive = index === currentStepIndex;

                  return (
                    <div
                      key={step.id}
                      className={`flex items-center gap-3 rounded-2xl border px-6 py-3 text-sm transition-all duration-500 ${
                        isActive 
                        ? "border-primary/50 bg-primary/10 text-white shadow-lg shadow-primary/10" 
                        : isPast 
                          ? "border-white/10 bg-white/5 text-muted-foreground" 
                          : "border-white/[0.04] bg-transparent text-white/20"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? "animate-pulse text-primary" : ""}`} />
                      <span className="font-bold">{step.label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Slide Editor/Viewer */}
            <AnimatePresence>
              {slides.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                      <FileText className="h-6 w-6 text-primary" />
                      {isEditing || isOutlineReady ? "框架与内容提示" : "生成结果预览"}
                    </h2>
                    {isOutlineReady && (
                      <span className="text-xs text-muted-foreground italic">
                        * 此阶段仅调整核心逻辑，精美视觉效果将在下一步自动补全
                      </span>
                    )}
                  </div>

                  <div className="space-y-6">
                    {slides.map((slide: EditableSlide, slideIndex: number) => {
                      const isChartSlide = slide.visualType === "chart" && Boolean(slide.chartData);
                      const editableSlide = slide.slideType === "content" || slide.slideType === "title" || isChartSlide;
                      const isInlineOutlineEdit = isOutlineReady && !isEditing;
                      const isRegenerationOpen = activeRegenerationSlide === slideIndex;
                      const isRegenerating = regeneratingSlideIndex === slideIndex;

                      return (
                        <motion.div
                          key={`${slide.slideNumber}-${slideIndex}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: slideIndex * 0.05 }}
                          className={`bento-card !p-0 overflow-hidden ${isRegenerating ? "opacity-50 grayscale" : ""}`}
                        >
                          <div className="flex items-center justify-between bg-white/[0.04] px-8 py-4 border-b border-white/[0.06]">
                            <div className="flex items-center gap-4">
                              <span className="flex h-8 w-12 items-center justify-center rounded-lg bg-stone-900 text-xs font-black text-white border border-white/5">
                                {slide.slideNumber}
                              </span>
                              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{slide.slideType}</span>
                            </div>
                            
                            {canRegenerateSlides && (
                              <button
                                onClick={() => setActiveRegenerationSlide(isRegenerationOpen ? null : slideIndex)}
                                className="text-xs font-bold text-primary hover:text-primary/80 transition cursor-pointer"
                              >
                                {isRegenerating ? "正在重写..." : "AI 智能修正"}
                              </button>
                            )}
                          </div>

                          <div className="p-8">
                            {isRegenerationOpen && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                className="mb-8 rounded-2xl bg-primary/5 p-6 border border-primary/20"
                              >
                                <p className="text-sm font-bold text-white mb-4">修正范围</p>
                                <div className="flex flex-wrap gap-3">
                                  <button onClick={() => handleRegenerateSlide(slideIndex, "content")} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold hover:bg-primary transition cursor-pointer">仅修正标题和要点</button>
                                  <button onClick={() => setActiveRegenerationSlide(null)} className="text-xs text-muted-foreground ml-2">取消</button>
                                </div>
                              </motion.div>
                            )}

                            {(isEditing || isInlineOutlineEdit) && editableSlide ? (
                              <div className="space-y-6">
                                <div>
                                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 block">幻灯片标题</label>
                                  <Input 
                                    value={slide.title}
                                    onChange={(e) => updateSlide(slideIndex, (s) => ({ ...s, title: e.target.value }))}
                                    className="input-premium border-white/[0.06] bg-stone-900/50"
                                  />
                                </div>

                                <div>
                                  <div className="flex items-center justify-between mb-3">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">核心要点</label>
                                    <button onClick={() => addKeyPoint(slideIndex)} className="text-xs text-primary font-bold hover:underline">+ 新增要点</button>
                                  </div>
                                  <div className="space-y-3">
                                    {slide.keyPoints.map((point, pi) => (
                                      <div key={pi} className="flex gap-3">
                                        <Textarea 
                                          value={point}
                                          onChange={(e) => updateKeyPoint(slideIndex, pi, e.target.value)}
                                          className="flex-1 input-premium border-white/[0.06] bg-stone-900/50 min-h-[80px]"
                                        />
                                        <button onClick={() => removeKeyPoint(slideIndex, pi)} className="h-10 w-10 flex items-center justify-center rounded-xl border border-white/5 hover:bg-rose-500/10 hover:text-rose-400 transition cursor-pointer mt-2">
                                          <X className="h-4 w-4" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-6">
                                <h3 className="text-2xl font-black text-white leading-snug">{slide.title}</h3>
                                {slide.keyPoints.length > 0 ? (
                                  <ul className="space-y-4">
                                    {slide.keyPoints.map((point, pi) => (
                                      <li key={pi} className="flex gap-4 text-muted-foreground leading-relaxed">
                                        <div className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                                        {point}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="rounded-2xl border border-dashed border-white/5 p-8 text-center text-muted-foreground italic text-sm">
                                    暂无要点内容
                                  </div>
                                )}
                                {slide.notes && (
                                  <div className="mt-4 rounded-[1.4rem] border border-white/8 bg-slate-950/40 p-4">
                                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{"备注"}</p>
                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">{slide.notes}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Sidebar */}
          <div className="space-y-6">
            <motion.div 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               className="bento-card !p-8 sticky top-12"
            >
              <h3 className="text-xl font-bold text-white mb-6">交付选项</h3>
              
              <div className="space-y-6">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                   <div className="flex items-center gap-3 mb-4">
                     <Palette className="h-4 w-4 text-primary" />
                     <span className="text-sm font-bold">主题预览</span>
                   </div>
                   <div className="flex gap-2">
                     {primaryColorSwatches.slice(0, 5).map(c => (
                       <div key={c} className="h-6 w-6 rounded-full border border-white/10" style={{ backgroundColor: c }} />
                     ))}
                   </div>
                </div>

                <div className="space-y-3">
                  {isOutlineReady ? (
                    <Button
                      onClick={handleContinueGeneration}
                      isLoading={continueMutation.isPending}
                      className="btn-premium-primary w-full"
                    >
                      <Cpu className="h-5 w-5 mr-1" />
                      开始全面生成
                    </Button>
                  ) : isEditing ? (
                    <>
                      <Button
                        onClick={handleExportEdited}
                        isLoading={exportMutation.isPending}
                        className="btn-premium-primary w-full"
                      >
                         <RefreshCw className="h-5 w-5 mr-1" />
                         保存并导出
                      </Button>
                      <button onClick={() => setIsEditing(false)} className="btn-premium-secondary w-full py-3 text-sm">取消编辑</button>
                    </>
                  ) : isCompleted ? (
                    <Button
                      onClick={handleDownload}
                      isLoading={isDownloading}
                      className="btn-premium-primary w-full"
                    >
                      <Download className="h-5 w-5 mr-1" />
                      下载 PPTX 文件
                    </Button>
                  ) : (
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-center">
                       <Loader2 className="h-5 w-5 text-primary animate-spin mx-auto mb-3" />
                       <p className="text-xs text-muted-foreground italic">AI 正在精心处理中...</p>
                    </div>
                  )}
                </div>

                {isOutlineReady && (
                   <p className="text-[10px] text-muted-foreground leading-relaxed text-center">
                     点击“全面生成”后，AI 将自动补全每页的正文、备注并完成视觉美化。
                   </p>
                )}
              </div>
            </motion.div>

            {/* AI Insights Panel */}
            {(isOutlineReady || isCompleted || isEditing) && (
              <AiInsightsPanel
                outline={draftOutline.slides.length > 0 ? { ...draftOutline, presentationTitle: draftOutline.presentationTitle || "AI 演示文稿" } : null}
                language="zh"
                brandKit={brandKit}
                onBrandKitChange={setBrandKit}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
