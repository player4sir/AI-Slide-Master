import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Timer,
  Sparkles,
  Loader2,
  ChevronRight,
  AlertTriangle,
  Info,
  Upload,
  type LucideIcon,
} from "lucide-react";

// ─── Types matching backend API shapes ──────────────────────────────────────

interface NarrativeSuggestion {
  slideNumber: number;
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  suggestedFix?: string;
}

interface NarrativeAnalysis {
  overallScore: number;
  narrativeArc: string;
  paceProfile: string;
  suggestions: NarrativeSuggestion[];
  transitionHints: { from: number; to: number; hint: string }[];
  estimatedMinutes: number;
}

interface SlideCoachInfo {
  slideNumber: number;
  title: string;
  estimatedSeconds: number;
  paceHint: string;
  keyPhrase: string;
  difficulty: number;
  tips: string[];
}

interface CoachAnalysis {
  totalMinutes: number;
  averageSecondsPerSlide: number;
  perSlide: SlideCoachInfo[];
  predictedQuestions: string[];
  overallDifficulty: number;
  rehearsalTips: string[];
}

interface BrandKitData {
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
}

// ─── PROPS ──────────────────────────────────────────────────────────────────

type TabId = "narrative" | "coach" | "brand";

interface AiInsightsPanelProps {
  outline: { slides: unknown[]; presentationTitle?: string; [key: string]: unknown } | null;
  language?: string;
  brandKit: BrandKitData;
  onBrandKitChange: (kit: BrandKitData) => void;
}

// ─── SEVERITY BADGE ─────────────────────────────────────────────────────────

function SeverityBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    critical: "bg-rose-500/20 text-rose-300",
    warning: "bg-amber-500/20 text-amber-300",
    info: "bg-sky-500/20 text-sky-300",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colors[level] || colors.info}`}>
      {level === "critical" ? <AlertTriangle className="mr-1 h-3 w-3" /> : <Info className="mr-1 h-3 w-3" />}
      {level}
    </span>
  );
}

// ─── SCORE RING ─────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : "#ef4444";
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative h-20 w-20 flex-shrink-0">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/5" />
        <circle cx="32" cy="32" r="28" fill="none" stroke={color} strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-black text-white">{score}</span>
      </div>
    </div>
  );
}

// ─── DIFFICULTY DOTS ────────────────────────────────────────────────────────

function DifficultyDots({ level }: { level: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className={`h-2 w-2 rounded-full ${i <= level ? "bg-amber-400" : "bg-white/10"}`} />
      ))}
    </div>
  );
}

// ─── TAB BUTTON ─────────────────────────────────────────────────────────────

function TabButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
        active ? "bg-primary/20 text-primary shadow-sm" : "text-muted-foreground hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function AiInsightsPanel({ outline, language = "zh", brandKit, onBrandKitChange }: AiInsightsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("narrative");
  const [narrativeData, setNarrativeData] = useState<NarrativeAnalysis | null>(null);
  const [coachData, setCoachData] = useState<CoachAnalysis | null>(null);
  const [loadingNarrative, setLoadingNarrative] = useState(false);
  const [loadingCoach, setLoadingCoach] = useState(false);

  const fetchNarrative = useCallback(async () => {
    if (!outline || loadingNarrative) return;
    setLoadingNarrative(true);
    try {
      const res = await fetch("/api/ppt/analyze-narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outline, language }),
      });
      if (res.ok) setNarrativeData(await res.json());
    } catch { /* ignore */ }
    setLoadingNarrative(false);
  }, [outline, language, loadingNarrative]);

  const fetchCoach = useCallback(async () => {
    if (!outline || loadingCoach) return;
    setLoadingCoach(true);
    try {
      const res = await fetch("/api/ppt/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outline, language, deep: true }),
      });
      if (res.ok) setCoachData(await res.json());
    } catch { /* ignore */ }
    setLoadingCoach(false);
  }, [outline, language, loadingCoach]);

  const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOGO_SIZE) {
      alert("Logo 文件不能超过 2MB，请压缩后重试");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onBrandKitChange({ ...brandKit, logoData: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  if (!outline || outline.slides.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bento-card !p-6"
    >
      <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        AI 智能助手
      </h3>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-5 rounded-xl bg-white/[0.03] p-1">
        <TabButton active={activeTab === "narrative"} icon={BookOpen} label="叙事分析" onClick={() => setActiveTab("narrative")} />
        <TabButton active={activeTab === "coach"} icon={Timer} label="演讲教练" onClick={() => setActiveTab("coach")} />
        <TabButton active={activeTab === "brand"} icon={Upload} label="品牌套件" onClick={() => setActiveTab("brand")} />
      </div>

      <AnimatePresence mode="wait">
        {/* ── Narrative Tab ── */}
        {activeTab === "narrative" && (
          <motion.div key="narrative" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {!narrativeData ? (
              <button
                type="button"
                onClick={fetchNarrative}
                disabled={loadingNarrative}
                className="w-full rounded-xl border border-dashed border-white/10 py-6 text-center text-sm text-muted-foreground hover:border-primary/30 hover:text-primary transition-all cursor-pointer"
              >
                {loadingNarrative ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : (
                  <>
                    <BookOpen className="mx-auto h-6 w-6 mb-2 opacity-50" />
                    点击分析叙事结构
                  </>
                )}
              </button>
            ) : (
              <>
                {/* Score + Meta */}
                <div className="flex items-center gap-4">
                  <ScoreRing score={narrativeData.overallScore} />
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">叙事弧线</div>
                    <div className="text-sm font-bold text-white truncate">{narrativeData.narrativeArc}</div>
                    <div className="text-xs text-muted-foreground mt-1">节奏: {narrativeData.paceProfile}</div>
                    <div className="text-xs text-muted-foreground">预估: {narrativeData.estimatedMinutes} 分钟</div>
                  </div>
                </div>

                {/* Suggestions */}
                {narrativeData.suggestions.length > 0 && (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {narrativeData.suggestions.map((s, i) => (
                      <div key={i} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-muted-foreground">
                            {s.slideNumber > 0 ? `第${s.slideNumber}页` : "全局"}
                          </span>
                          <SeverityBadge level={s.severity} />
                        </div>
                        <p className="text-xs text-white/80 leading-relaxed">{s.message}</p>
                        {s.suggestedFix && (
                          <p className="mt-1 text-[10px] text-primary/70 flex items-start gap-1">
                            <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
                            {s.suggestedFix}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Transition Hints */}
                {narrativeData.transitionHints.length > 0 && (
                  <details className="group">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-white transition">
                      过渡语建议 ({narrativeData.transitionHints.length})
                    </summary>
                    <div className="mt-2 space-y-1.5">
                      {narrativeData.transitionHints.map((h, i) => (
                        <div key={i} className="text-[10px] text-white/60 pl-3 border-l border-white/5">
                          <span className="text-primary/70">P{h.from}→P{h.to}:</span> {h.hint}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* ── Coach Tab ── */}
        {activeTab === "coach" && (
          <motion.div key="coach" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {!coachData ? (
              <button
                type="button"
                onClick={fetchCoach}
                disabled={loadingCoach}
                className="w-full rounded-xl border border-dashed border-white/10 py-6 text-center text-sm text-muted-foreground hover:border-primary/30 hover:text-primary transition-all cursor-pointer"
              >
                {loadingCoach ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : (
                  <>
                    <Timer className="mx-auto h-6 w-6 mb-2 opacity-50" />
                    点击分析演讲节奏
                  </>
                )}
              </button>
            ) : (
              <>
                {/* Overview Stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "总时长", value: `${coachData.totalMinutes}min` },
                    { label: "平均/页", value: `${coachData.averageSecondsPerSlide}s` },
                    { label: "难度", value: `${coachData.overallDifficulty}/5` },
                  ].map(item => (
                    <div key={item.label} className="rounded-lg bg-white/[0.03] border border-white/5 p-2 text-center">
                      <div className="text-[10px] text-muted-foreground">{item.label}</div>
                      <div className="text-sm font-bold text-white mt-0.5">{item.value}</div>
                    </div>
                  ))}
                </div>

                {/* Per-slide timeline */}
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {coachData.perSlide.map(s => (
                    <div key={s.slideNumber} className="flex items-center gap-2 rounded-lg bg-white/[0.02] border border-white/5 px-3 py-2">
                      <div className="text-[10px] text-muted-foreground w-6">{s.slideNumber}</div>
                      <div className="flex-1 min-w-0 truncate text-xs text-white/70">{s.title}</div>
                      <div className="text-[10px] text-primary font-mono">{s.estimatedSeconds}s</div>
                      <DifficultyDots level={s.difficulty} />
                    </div>
                  ))}
                </div>

                {/* Predicted Q&A */}
                {coachData.predictedQuestions.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-white mb-2">🎯 预测 Q&A</div>
                    <div className="space-y-1.5">
                      {coachData.predictedQuestions.map((q, i) => (
                        <div key={i} className="text-[11px] text-white/60 pl-3 border-l-2 border-primary/30 leading-relaxed">
                          {q}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rehearsal Tips */}
                {coachData.rehearsalTips.length > 0 && (
                  <details className="group">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-white transition">
                      排练建议 ({coachData.rehearsalTips.length})
                    </summary>
                    <ul className="mt-2 space-y-1 text-[10px] text-white/50 pl-3 list-disc list-inside">
                      {coachData.rehearsalTips.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                  </details>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* ── Brand Kit Tab ── */}
        {activeTab === "brand" && (
          <motion.div key="brand" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Logo Upload */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Logo</label>
              <div className="flex items-center gap-3">
                {brandKit.logoData ? (
                  <div className="relative h-10 w-20 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden">
                    <img src={brandKit.logoData} alt="Logo" className="max-h-full max-w-full object-contain" />
                    <button
                      type="button"
                      onClick={() => onBrandKitChange({ ...brandKit, logoData: undefined })}
                      className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[8px] flex items-center justify-center cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="flex h-10 w-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] text-muted-foreground hover:border-primary/30 transition">
                    <Upload className="h-4 w-4" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                )}
                <select
                  value={brandKit.logoPosition}
                  onChange={e => onBrandKitChange({ ...brandKit, logoPosition: e.target.value as BrandKitData["logoPosition"] })}
                  className="flex h-8 cursor-pointer rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 text-[10px] text-white outline-none"
                >
                  <option value="top-left" className="bg-stone-900">左上</option>
                  <option value="top-right" className="bg-stone-900">右上</option>
                  <option value="bottom-left" className="bg-stone-900">左下</option>
                  <option value="bottom-right" className="bg-stone-900">右下</option>
                </select>
              </div>
            </div>

            {/* Brand Colors */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">品牌色</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "primaryColor" as const, label: "主色" },
                  { key: "accentColor" as const, label: "强调色" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brandKit[key] ? `#${brandKit[key]}` : "#CA8A04"}
                      onChange={e => onBrandKitChange({ ...brandKit, [key]: e.target.value.replace("#", "") })}
                      className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent"
                    />
                    <span className="text-[10px] text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fonts */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">字体</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "titleFont" as const, label: "标题" },
                  { key: "bodyFont" as const, label: "正文" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <div className="text-[9px] text-muted-foreground mb-1">{label}</div>
                    <select
                      value={brandKit[key] || ""}
                      onChange={e => onBrandKitChange({ ...brandKit, [key]: e.target.value || undefined })}
                      className="flex h-7 w-full cursor-pointer rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 text-[10px] text-white outline-none"
                    >
                      <option value="" className="bg-stone-900">默认 (Calibri)</option>
                      <option value="Microsoft YaHei" className="bg-stone-900">微软雅黑</option>
                      <option value="SimHei" className="bg-stone-900">黑体</option>
                      <option value="KaiTi" className="bg-stone-900">楷体</option>
                      <option value="Arial" className="bg-stone-900">Arial</option>
                      <option value="Helvetica" className="bg-stone-900">Helvetica</option>
                      <option value="Georgia" className="bg-stone-900">Georgia</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Watermark + Company */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">水印</label>
                <input
                  type="text"
                  placeholder="如: CONFIDENTIAL"
                  value={brandKit.watermarkText || ""}
                  onChange={e => onBrandKitChange({ ...brandKit, watermarkText: e.target.value || undefined })}
                  className="mt-1 flex h-7 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 text-[10px] text-white outline-none placeholder:text-white/20"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">公司名</label>
                <input
                  type="text"
                  placeholder="页脚公司名"
                  value={brandKit.companyName || ""}
                  onChange={e => onBrandKitChange({ ...brandKit, companyName: e.target.value || undefined })}
                  className="mt-1 flex h-7 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 text-[10px] text-white outline-none placeholder:text-white/20"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
