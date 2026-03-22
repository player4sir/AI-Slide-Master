import React, { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, LayoutTemplate, Users, Globe, Wand2, ArrowRight } from "lucide-react";
import { useGeneratePPT } from "@workspace/api-client-react";
import type { GeneratePPTRequest } from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export default function Home() {
  const [, setLocation] = useLocation();
  const generateMutation = useGeneratePPT();

  const [formData, setFormData] = useState<GeneratePPTRequest>({
    topic: "",
    language: "zh",
    slideCount: 10,
    style: "professional",
    audience: "",
    additionalRequirements: "",
    useAgentSkills: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateMutation.mutate(
      { data: formData },
      {
        onSuccess: (res) => {
          setLocation(`/job/${res.jobId}`);
        }
      }
    );
  };

  return (
    <div className="relative min-h-full">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img 
          src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
          alt="Abstract Background" 
          className="w-full h-[60vh] object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/90 to-background" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 md:py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 font-medium text-sm mb-6 border border-indigo-500/20">
            <Sparkles className="w-4 h-4" />
            DeepSeek Powered AI Agent
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-extrabold text-slate-900 tracking-tight mb-4">
            Generate Stunning <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">
              Presentations in Seconds
            </span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Just describe your topic, and our AI Agent will research, outline, and design a complete, professional PPTX ready for download.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel rounded-3xl p-6 md:p-10"
        >
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Primary Input */}
            <div className="space-y-3">
              <label htmlFor="topic" className="block text-base font-semibold text-slate-800">
                What is your presentation about? <span className="text-red-500">*</span>
              </label>
              <Textarea 
                id="topic"
                name="topic"
                required
                placeholder="e.g. Q3 Marketing Strategy for our new SaaS product launch..."
                className="text-lg py-4 min-h-[120px] shadow-sm"
                value={formData.topic}
                onChange={handleChange}
              />
            </div>

            {/* Grid Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <LayoutTemplate className="w-4 h-4 text-slate-400" /> Number of Slides
                </label>
                <select 
                  name="slideCount"
                  value={formData.slideCount}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary shadow-sm"
                >
                  <option value={5}>5 Slides (Brief)</option>
                  <option value={10}>10 Slides (Standard)</option>
                  <option value={15}>15 Slides (Detailed)</option>
                  <option value={20}>20 Slides (Comprehensive)</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-400" /> Language
                </label>
                <select 
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary shadow-sm"
                >
                  <option value="zh">中文 (Chinese)</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-slate-400" /> Design Style
                </label>
                <select 
                  name="style"
                  value={formData.style}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary shadow-sm"
                >
                  <option value="professional">Professional / Corporate</option>
                  <option value="creative">Creative / Startup</option>
                  <option value="minimal">Minimalist</option>
                  <option value="academic">Academic / Research</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" /> Target Audience
                </label>
                <Input 
                  name="audience"
                  placeholder="e.g. Executives, Students, General Public"
                  value={formData.audience}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                Additional Requirements (Optional)
              </label>
              <Textarea 
                name="additionalRequirements"
                placeholder="Specific points to cover, tone of voice, or data to include..."
                className="h-20"
                value={formData.additionalRequirements}
                onChange={handleChange}
              />
            </div>

            {/* Agent Toggle */}
            <div className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-2xl flex items-start gap-4">
              <div className="mt-1">
                <Switch 
                  checked={formData.useAgentSkills ?? true} 
                  onCheckedChange={(checked) => setFormData(p => ({ ...p, useAgentSkills: checked }))} 
                />
              </div>
              <div>
                <h4 className="font-semibold text-indigo-900 mb-1">Enable Agent Intelligence Enhancement</h4>
                <p className="text-sm text-indigo-700/80 leading-relaxed">
                  Allows the AI to automatically structure the outline, enrich content with logical frameworks, and perform internal quality checks before building the PPTX. Takes slightly longer but produces superior results.
                </p>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4 flex justify-end">
              <Button 
                type="submit" 
                size="lg" 
                className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-primary hover:from-indigo-700 hover:to-primary/90 text-white shadow-xl shadow-indigo-500/30 group"
                isLoading={generateMutation.isPending}
              >
                {!generateMutation.isPending && (
                  <>
                    Generate Presentation
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </div>
            
            {generateMutation.isError && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                Failed to start generation. Please try again.
              </div>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  );
}
