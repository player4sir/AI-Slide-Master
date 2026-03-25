import React from "react";
import { motion } from "framer-motion";
import {
  Bot,
  CheckCircle2,
  Clock3,
  Cpu,
  FileText,
  History,
  LayoutDashboard,
  PlusCircle,
  Sparkles,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { PPTHistoryItem } from "@workspace/api-client-react";
import { useGetPPTHistory } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";

import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();
  const { data, isLoading } = useGetPPTHistory();

  const getStatusMeta = (status: string) => {
    switch (status) {
      case "completed":
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-primary" />,
          label: "已完成",
        };
      case "failed":
        return {
          icon: <XCircle className="h-4 w-4 text-rose-500" />,
          label: "失败",
        };
      default:
        return {
          icon: <Clock3 className="h-4 w-4 text-primary animate-pulse" />,
          label: "处理中",
        };
    }
  };

  return (
    <aside className="relative z-20 hidden h-full w-80 flex-shrink-0 border-r border-white/5 bg-stone-950/80 backdrop-blur-3xl lg:flex lg:flex-col">
      <div className="px-8 pb-8 pt-10">
        <div className="mb-10 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-[0_0_20px_rgba(202,138,4,0.3)] text-primary-foreground">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/70">Creative Hub</p>
            <h1 className="text-xl font-black text-white tracking-tighter">AI Slide Master</h1>
          </div>
        </div>

        <div className="bento-card !p-5 bg-white/[0.02]">
          <div className="mb-5 flex items-start gap-4">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">智绘演示文稿</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/80">
                输入主题即可获得一份逻辑严密、视觉精美的专业 PPTX。
              </p>
            </div>
          </div>

          <Link
            href="/"
            className={cn(
              "group w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-black transition-all duration-500",
              location === "/"
                ? "btn-premium-primary shadow-primary/20"
                : "bg-white/5 text-white hover:bg-white/10"
            )}
          >
            <PlusCircle className="h-4 w-4 transition-transform group-hover:rotate-90" />
            新建航程
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
        <div className="mb-6 flex items-center gap-3 px-2">
          <History className="h-4 w-4 text-muted-foreground/50" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">历史记录</span>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-24 w-full animate-pulse rounded-2xl bg-white/[0.02]" />
            ))}
          </div>
        ) : data?.items?.length ? (
          <div className="space-y-4">
            {data.items.map((item: PPTHistoryItem, index: number) => {
              const statusMeta = getStatusMeta(item.status);
              const isActive = location === `/job/${item.jobId}`;

              return (
                <motion.div
                  key={item.jobId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={`/job/${item.jobId}`}
                    className={cn(
                      "block rounded-2xl border p-5 transition-all duration-500",
                      isActive
                        ? "border-primary/20 bg-primary/5 shadow-[0_10px_30px_rgba(202,138,4,0.05)]"
                        : "border-white/[0.04] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
                    )}
                  >
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <FileText className={`mt-0.5 h-4 w-4 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground/40"}`} />
                        <h3 className="line-clamp-2 text-sm font-bold leading-relaxed text-white">{item.topic}</h3>
                      </div>
                      <div className="flex-shrink-0 mt-0.5">{statusMeta.icon}</div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-muted-foreground/40">{format(new Date(item.createdAt), "M月d日 HH:mm", { locale: zhCN })}</span>
                      <span className={isActive ? "text-primary/70" : "text-muted-foreground/40"}>{statusMeta.label}</span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="bento-card bg-transparent border-dashed border-white/5 py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white/[0.02] mb-6">
               <Bot className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="text-sm font-bold text-white">静待启航</p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/40">
              您还没有任何生成记录。
            </p>
          </div>
        )}
      </div>

      <div className="p-8">
        <div className="rounded-2xl border border-white/[0.04] bg-white/[0.02] p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Cpu className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-white/50">Engine</p>
            <p className="text-xs font-black text-white">DeepSeek V3 / R1</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
