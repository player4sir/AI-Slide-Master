import React, { useEffect } from "react";
import { useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Download, 
  FileText,
  Search,
  BrainCircuit,
  Cpu,
  Layers
} from "lucide-react";
import { useGetPPTStatus, downloadPPT } from "@workspace/api-client-react";
import type { PPTJobStatus } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { downloadBlob } from "@/lib/utils";

const STEPS = [
  { id: "pending", label: "Queueing", icon: Loader2 },
  { id: "planning", label: "Analyzing & Planning", icon: Search },
  { id: "generating", label: "Generating Content", icon: BrainCircuit },
  { id: "building", label: "Building PPTX File", icon: Cpu },
  { id: "completed", label: "Completed", icon: CheckCircle2 },
];

export default function JobView() {
  const [, params] = useRoute("/job/:jobId");
  const jobId = params?.jobId || "";
  
  const [isDownloading, setIsDownloading] = React.useState(false);

  const { data: jobStatus, isLoading, isError } = useGetPPTStatus(jobId, {
    query: {
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status === "completed" || status === "failed" ? false : 2000;
      }
    }
  });

  const handleDownload = async () => {
    if (!jobId) return;
    try {
      setIsDownloading(true);
      const blob = await downloadPPT(jobId);
      downloadBlob(blob, `Presentation-${jobId.substring(0, 8)}.pptx`);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (isError || !jobStatus) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-4">
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Job Not Found</h2>
        <p className="text-slate-500">The generation job you are looking for does not exist or has expired.</p>
      </div>
    );
  }

  const currentStepIndex = STEPS.findIndex(s => s.id === jobStatus.status);
  const isFailed = jobStatus.status === "failed";
  const isCompleted = jobStatus.status === "completed";

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-display font-bold text-slate-900 mb-3">
          Presentation Generation
        </h1>
        <p className="text-slate-500 max-w-lg mx-auto">
          Job ID: <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{jobId}</span>
        </p>
      </div>

      <div className="glass-panel rounded-3xl p-8 mb-10 overflow-hidden relative">
        {/* Progress Bar Container */}
        <div className="relative mb-12">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2 rounded-full z-0" />
          <motion.div 
            className="absolute top-1/2 left-0 h-1 bg-indigo-500 -translate-y-1/2 rounded-full z-0 transition-all duration-1000 ease-out"
            style={{ width: `${jobStatus.progress}%` }}
          />
          
          <div className="relative z-10 flex justify-between">
            {STEPS.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isPast = index < currentStepIndex || isCompleted;
              const Icon = step.icon;
              
              return (
                <div key={step.id} className="flex flex-col items-center gap-3 w-20">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-colors duration-500
                      ${isPast || isActive ? 'bg-indigo-600 border-indigo-100 text-white' : 'bg-white border-slate-100 text-slate-300 shadow-sm'}
                      ${isFailed && isActive ? 'bg-red-500 border-red-100 text-white' : ''}
                    `}
                  >
                    <Icon className={`w-4 h-4 ${isActive && !isCompleted && !isFailed ? 'animate-pulse' : ''}`} />
                  </div>
                  <span className={`text-xs font-semibold text-center leading-tight
                    ${isActive ? 'text-indigo-700' : isPast ? 'text-slate-700' : 'text-slate-400'}
                    ${isFailed && isActive ? 'text-red-600' : ''}
                  `}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Status Message */}
        <div className="text-center py-6 bg-slate-50/50 rounded-2xl border border-slate-100 mb-8">
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {isFailed ? "Generation Failed" : isCompleted ? "Ready for Download" : "Work in Progress..."}
          </h3>
          <p className="text-slate-600">
            {jobStatus.currentStep || (isCompleted ? "Your presentation has been generated successfully." : "Please wait while we craft your slides.")}
          </p>
          
          {isFailed && jobStatus.error && (
            <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg inline-block text-left">
              <strong>Error:</strong> {jobStatus.error}
            </div>
          )}
          
          {isCompleted && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6"
            >
              <Button 
                size="lg" 
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 px-8 rounded-xl"
                onClick={handleDownload}
                isLoading={isDownloading}
              >
                {!isDownloading && <Download className="w-5 h-5 mr-2" />}
                Download PPTX File
              </Button>
            </motion.div>
          )}
        </div>

        {/* Outline Preview */}
        <AnimatePresence>
          {jobStatus.outline && jobStatus.outline.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-8"
            >
              <div className="flex items-center gap-2 mb-6">
                <Layers className="w-5 h-5 text-indigo-500" />
                <h3 className="text-lg font-bold text-slate-800">Slide Outline Preview</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobStatus.outline.map((slide, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={slide.slideNumber} 
                    className="aspect-[16/10] bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col hover:shadow-md transition-shadow group relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-400 to-cyan-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <div className="text-xs font-semibold tracking-wider text-indigo-500/80 mb-3 flex items-center justify-between uppercase">
                      <span>Slide {slide.slideNumber}</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-500">{slide.slideType}</span>
                    </div>
                    <h4 className="font-bold text-slate-800 mb-3 line-clamp-2 leading-snug">{slide.title}</h4>
                    {slide.keyPoints && slide.keyPoints.length > 0 ? (
                      <ul className="text-sm text-slate-600 space-y-1.5 flex-1 overflow-hidden">
                        {slide.keyPoints.map((kp, j) => (
                          <li key={j} className="flex items-start gap-2">
                            <span className="block w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                            <span className="line-clamp-1">{kp}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-slate-300">
                        <FileText className="w-8 h-8 opacity-20" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
