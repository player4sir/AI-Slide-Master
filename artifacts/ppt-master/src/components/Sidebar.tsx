import React from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  FileText, 
  History, 
  PlusCircle, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  LayoutDashboard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetPPTHistory } from "@workspace/api-client-react";
import { format } from "date-fns";

export function Sidebar() {
  const [location] = useLocation();
  const { data, isLoading } = useGetPPTHistory();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="w-72 bg-slate-950 text-slate-200 border-r border-slate-800 flex flex-col h-full flex-shrink-0 z-20 shadow-2xl relative">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 p-[1px]">
          <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
        </div>
        <h1 className="text-xl font-display font-bold text-white tracking-wide">
          AI PPT<span className="text-indigo-400">Master</span>
        </h1>
      </div>

      <div className="px-4 pb-4">
        <Link 
          href="/" 
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 group",
            location === "/" 
              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
              : "text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent"
          )}
        >
          <PlusCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
          Create New PPT
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="flex items-center gap-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
          <History className="w-4 h-4" />
          Recent Generations
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-900 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : data?.items?.length ? (
          <div className="flex flex-col gap-2">
            {data.items.map((item, i) => (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                key={item.jobId}
              >
                <Link 
                  href={`/job/${item.jobId}`}
                  className={cn(
                    "block p-3 rounded-xl border transition-all duration-200",
                    location === `/job/${item.jobId}`
                      ? "bg-slate-800 border-slate-700 shadow-lg"
                      : "bg-transparent border-transparent hover:bg-slate-900/50 hover:border-slate-800"
                  )}
                >
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="text-sm font-medium text-slate-200 line-clamp-1 flex-1 pr-2">
                      {item.topic}
                    </h3>
                    {getStatusIcon(item.status)}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {format(new Date(item.createdAt), "MMM d, HH:mm")}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 text-sm border border-slate-800 border-dashed rounded-xl bg-slate-900/20">
            No history yet
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
        Powered by DeepSeek AI
      </div>
    </div>
  );
}
