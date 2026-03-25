import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Bot, Cpu, FilePenLine, Globe, LayoutTemplate, Palette, Users } from "lucide-react";
import type { GeneratePPTRequest, GeneratePPTResponse } from "@workspace/api-client-react";
import { useGeneratePPT } from "@workspace/api-client-react";
import { useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_TEMPLATE_ID,
  getThemePreview,
  normalizePrimaryColor,
  primaryColorSwatches,
} from "@/lib/presentation-theme";

const styleOptions: Array<{ value: GeneratePPTRequest["style"]; label: string }> = [
  { value: "professional", label: "商务专业" },
  { value: "creative", label: "创意表达" },
  { value: "minimal", label: "极简高级" },
  { value: "academic", label: "学术研究" },
];

const audienceHints = [
  "管理层汇报",
  "客户提案",
  "团队培训",
  "学术答辩",
];

type GenerateFormData = GeneratePPTRequest & {
  themePreset?: string;
  primaryColor?: string;
};

export default function Home() {
  const [, setLocation] = useLocation();
  const generateMutation = useGeneratePPT();

  const [formData, setFormData] = useState<GenerateFormData>({
    topic: "",
    language: "zh",
    slideCount: 10,
    style: "creative",
    themePreset: DEFAULT_TEMPLATE_ID,
    primaryColor: "",
    audience: "",
    additionalRequirements: "",
    useAgentSkills: true,
  });

  interface TemplateInfo {
    id: string;
    name: string;
    description: string;
    coverUrl: string;
  }
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);

  useEffect(() => {
    fetch('/api/ppt/templates')
      .then(res => res.json())
      .then(data => {
        if (data.templates) setTemplates(data.templates);
      })
      .catch(console.error);
  }, []);

  const previewTheme = useMemo(
    () => getThemePreview(formData.themePreset, formData.primaryColor),
    [formData.primaryColor, formData.themePreset],
  );

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "primaryColor" ? normalizePrimaryColor(value) || value : type === "number" ? Number(value) : value,
    }));
  };

  const submitGeneration = (generationMode: "outline-only" | "full") => {
    generateMutation.mutate(
      {
        data: {
          ...formData,
          generationMode,
          primaryColor: normalizePrimaryColor(formData.primaryColor),
        } as GeneratePPTRequest,
      },
      {
        onSuccess: (response: GeneratePPTResponse) => {
          setLocation(`/job/${response.jobId}`);
        },
      },
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitGeneration("full");
  };

  return (
    <div className="relative px-5 py-8 sm:px-6 lg:px-10 lg:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <LayoutTemplate className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">新建演示任务</h1>
            <p className="text-sm text-muted-foreground mt-0.5">只需输入主题，AI 将为您处理后续的一切</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bento-grid">
          {/* Main Input Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bento-card md:col-span-8 group"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <FilePenLine className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-white">演示主题</h2>
            </div>
            <Textarea
              id="topic"
              name="topic"
              required
              placeholder="例如：为管理层准备一份季度复盘，重点说明增长数据、问题分析和下季度计划。"
              className="mt-2 min-h-[160px] input-premium text-lg leading-relaxed border-none bg-transparent p-0 focus:ring-0"
              value={formData.topic}
              onChange={handleChange}
            />
            
            <div className="mt-8 flex flex-wrap gap-2">
              {audienceHints.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, audience: item }))}
                  className="rounded-full border border-white/5 bg-white/[0.03] px-4 py-2 text-sm text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary cursor-pointer"
                >
                  {item}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Quick Settings Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bento-card md:col-span-4 flex flex-col justify-between"
          >
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <LayoutTemplate className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-white">核心配置</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">演示页数</label>
                  <select
                    name="slideCount"
                    value={formData.slideCount}
                    onChange={handleChange}
                    className="mt-2 flex h-12 w-full cursor-pointer appearance-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm text-white outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/5"
                  >
                    {[5, 10, 15, 20].map(count => (
                      <option key={count} value={count} className="bg-stone-900">{count} 页</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">视觉风格</label>
                  <select
                    name="style"
                    value={formData.style}
                    onChange={handleChange}
                    className="mt-2 flex h-12 w-full cursor-pointer appearance-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm text-white outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/5"
                  >
                    {styleOptions.map((option) => (
                      <option key={option.value} value={option.value} className="bg-stone-900">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.03] p-4 border border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <Bot className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">智能增强</span>
                </div>
                <Switch
                  checked={formData.useAgentSkills ?? true}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, useAgentSkills: checked }))}
                />
              </div>
            </div>
          </motion.div>

          {/* Template Selector Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bento-card md:col-span-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <LayoutTemplate className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-white">版式与主题模板</h2>
              <span className="text-xs text-muted-foreground ml-auto">控制整体排版与配色结构</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {templates.length > 0 ? templates.map((tpl) => {
                const isActive = formData.themePreset === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, themePreset: tpl.id }))}
                    className={`group relative flex flex-col items-start gap-2 rounded-2xl border p-4 transition-all duration-300 cursor-pointer text-left ${
                      isActive ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(234,179,8,0.15)]" : "border-white/5 bg-white/[0.03] hover:border-white/15"
                    }`}
                  >
                    <div className="h-20 w-full mb-2 shrink-0 overflow-hidden rounded-lg bg-[#0F0E17] border border-white/5 relative flex items-center justify-center">
                       <span className="text-[10px] text-white/20 uppercase tracking-widest">{tpl.id.replace('-', ' ')}</span>
                       <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                    </div>
                    <span className="text-base font-bold text-white">{tpl.name}</span>
                    <span className="text-xs text-muted-foreground leading-snug">{tpl.description}</span>
                  </button>
                );
              }) : (
                <div className="col-span-3 py-8 text-center text-sm text-muted-foreground animate-pulse">正在加载系统模板...</div>
              )}
            </div>

            <div className="mt-8 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    name="primaryColor"
                    placeholder="自定义 HEX 颜色，如 #CA8A04"
                    className="h-10 border-none bg-transparent placeholder:text-muted-foreground p-0 focus:ring-0"
                    value={formData.primaryColor ?? ""}
                    onChange={handleChange}
                  />
                </div>
                <div className="flex gap-2">
                  {primaryColorSwatches.slice(0, 6).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, primaryColor: color }))}
                      className="h-6 w-6 rounded-full border border-white/20 transition hover:scale-125 cursor-pointer"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Action Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bento-card md:col-span-4 bg-primary/5 border-primary/20 flex flex-col justify-between"
          >
            <div>
              <h3 className="text-xl font-bold text-white mb-2">准备绪</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                AI 将根据您的建议和风格，在几分钟内生成一份完整的专业演示文稿。
              </p>
            </div>

            <div className="mt-8 space-y-3">
              <Button
                type="submit"
                size="lg"
                isLoading={generateMutation.isPending}
                className="btn-premium-primary w-full shadow-primary/20 cursor-pointer border-none"
              >
                {!generateMutation.isPending && (
                  <>
                    生成完整 PPT
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>
              <button
                type="button"
                disabled={generateMutation.isPending}
                onClick={() => submitGeneration("outline-only")}
                className="btn-premium-secondary w-full cursor-pointer text-sm py-3"
              >
                先生成大纲
              </button>
            </div>
          </motion.div>
        </form>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-20 border-t border-white/5 pt-10 text-center"
        >
          <p className="text-sm text-muted-foreground">
            &copy; 2024 AI Slide Master. Powering premium presentations.
          </p>
        </motion.footer>
      </div>
    </div>
  );
}
