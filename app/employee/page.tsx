"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Mail,
  MessageCircle,
  User,
  Calendar,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  BarChart2,
  Video,
  Briefcase,
  Inbox,
  Sun,
  Moon,
  Hash,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { SlackSetup, SlackStatusBadge } from "@/components/slack-setup";
import { MeetingTab } from "@/components/MeetingTab";
import { useSession, signIn, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type Priority = "High" | "Medium" | "Low";
type Source = "email" | "slack" | "zoom" | "google_meet" | "fathom";
type Status = "pending" | "done";

interface Task {
  id: number | string;
  title: string;
  client: string;
  assignedTo: string;
  deadline: string;
  priority: Priority;
  source: Source;
  sourceGroup: string;
  status: Status;
  confidence: number;
  sourceMessage: string;
  isBlocked?: boolean;
  blockerNote?: string;
}

type Tab = "dashboard" | "client" | "slack" | "email" | "meetings";

// ─── DATA CONFIGURATIONS ──────────────────────────────────────────────────────

const EMPLOYEES = ["Rahul", "Priya", "Admin", "Vikas"];
const CLIENTS = ["Flipkart", "Zomato", "Amazon", "Google"];

const CLIENT_COLORS: Record<string, { bg: string; text: string; border: string; header: string }> = {
  Flipkart: { bg: "bg-teal-50/80 dark:bg-teal-500/10", text: "text-teal-700 dark:text-teal-300", border: "border-teal-200/60 dark:border-teal-500/20", header: "bg-teal-600" },
  Zomato:   { bg: "bg-amber-50/80 dark:bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200/60 dark:border-amber-500/20", header: "bg-amber-500" },
  Amazon:   { bg: "bg-slate-100/80 dark:bg-slate-700/20", text: "text-slate-700 dark:text-slate-200", border: "border-slate-200/70 dark:border-slate-600/40", header: "bg-slate-700" },
  Google:   { bg: "bg-teal-50/80 dark:bg-teal-500/10", text: "text-teal-700 dark:text-teal-300", border: "border-teal-200/60 dark:border-teal-500/20", header: "bg-teal-600" },
};

const PRIORITY_CONFIG: Record<Priority, { dot: string; text: string; bg: string; border: string }> = {
  High:   { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50/60 dark:bg-amber-500/10", border: "border-amber-200/60 dark:border-amber-500/20" },
  Medium: { dot: "bg-teal-500", text: "text-teal-700 dark:text-teal-300", bg: "bg-teal-50/60 dark:bg-teal-500/10", border: "border-teal-200/60 dark:border-teal-500/20" },
  Low:    { dot: "bg-slate-500", text: "text-slate-600 dark:text-slate-300", bg: "bg-slate-100/60 dark:bg-slate-700/20", border: "border-slate-200/70 dark:border-slate-600/40" },
};

const PRIORITY_ORDER: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function isOverdue(dateStr: string) {
  return new Date(dateStr) < new Date(new Date().toDateString());
}

// ─── TOAST ────────────────────────────────────────────────────────────────────

interface Toast { id: number; message: string }

function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 80 }}
            className="pointer-events-auto bg-white border border-slate-200/70 shadow-lg rounded-xl px-4 py-3 flex items-center gap-3 min-w-[260px] dark:bg-[#15171b] dark:border-slate-700/60"
          >
            <CheckCircle2 size={16} className="text-teal-600" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer bg-transparent border-0">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── TASK CARD ────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  onMarkDone,
  onToggleBlocker,
}: {
  task: Task;
  onMarkDone?: (id: number | string) => void;
  onToggleBlocker?: (id: number | string, isBlocked: boolean, note?: string) => void;
}) {
  const [showSource, setShowSource] = useState(false);
  const [showBlockerModal, setShowBlockerModal] = useState(false);
  const [tempNote, setTempNote] = useState(task.blockerNote || "");
  const pc = PRIORITY_CONFIG[task.priority];
  const cc = CLIENT_COLORS[task.client] || { bg: "bg-slate-100 dark:bg-slate-700/30", text: "text-slate-700 dark:text-slate-200", border: "border-slate-200/70 dark:border-slate-600/50" };
  const overdue = isOverdue(task.deadline) && task.status !== "done";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={`bg-white dark:bg-[#15171b] rounded-2xl shadow-sm hover:shadow-md border transition-all duration-300 overflow-hidden group ${task.isBlocked ? "border-amber-400/60 dark:border-amber-500/30" : "border-slate-200/70 dark:border-slate-700/60"} hover:border-teal-500/40 dark:hover:border-teal-500/40`}
    >
      <div className="p-4 pb-0 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${cc.bg} ${cc.text} ${cc.border}`}>
              {task.client}
            </span>
            <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${pc.bg} ${pc.border} ${pc.text}`}>
              <span className={`w-1 h-1 rounded-full ${pc.dot}`} />
              {task.priority}
            </span>
          </div>
          
          {task.source === "slack" ? (
            <span className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-md border bg-slate-100/70 dark:bg-slate-700/30 border-slate-200/60 dark:border-slate-600/50 text-slate-700 dark:text-slate-200">
              <MessageCircle size={10} className="rotate-90 text-teal-500" />
              Slack
            </span>
          ) : task.source === "email" ? (
            <span className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-md border bg-slate-100/70 dark:bg-slate-700/30 border-slate-200/60 dark:border-slate-600/50 text-slate-700 dark:text-slate-200">
              <Mail size={10} className="text-teal-500" />
              Gmail
            </span>
          ) : task.source === "fathom" ? (
            <span className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-md border bg-slate-100/70 dark:bg-slate-700/30 border-slate-200/60 dark:border-slate-600/50 text-slate-700 dark:text-slate-200">
              <Video size={10} className="text-teal-500" />
              Fathom
            </span>
          ) : task.source === "zoom" ? (
            <span className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-md border bg-slate-100/70 dark:bg-slate-700/30 border-slate-200/60 dark:border-slate-600/50 text-slate-700 dark:text-slate-200">
              <Video size={10} className="text-teal-500" />
              Zoom
            </span>
          ) : task.source === "google_meet" ? (
            <span className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-md border bg-slate-100/70 dark:bg-slate-700/30 border-slate-200/60 dark:border-slate-600/50 text-slate-700 dark:text-slate-200">
              <Video size={10} className="text-teal-500" />
              Google Meet
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-md border bg-slate-100/70 dark:bg-slate-700/30 border-slate-200/60 dark:border-slate-600/50 text-slate-700 dark:text-slate-200">
              <Inbox size={10} className="text-teal-500" />
              Feed
            </span>
          )}
        </div>
      </div>

      <div className="p-4 pt-0 flex flex-col gap-3">
        <h4 className={`font-semibold text-[14px] leading-snug text-slate-900 dark:text-slate-100 ${task.status === "done" ? "line-through text-slate-400 dark:text-slate-500" : ""}`}>
          {task.title}
        </h4>

        {task.isBlocked && (
          <div className="bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/20 rounded-lg p-2.5 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200 font-medium">
            <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold uppercase text-[10px] text-amber-700 dark:text-amber-200 block mb-0.5">Blocker Active</span>
              <p className="text-[11px] leading-relaxed break-words">"{task.blockerNote}"</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center border border-teal-200/60 dark:border-teal-500/20">
              <User size={10} className="text-teal-600 dark:text-teal-300" />
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{task.assignedTo}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={11} className={overdue ? "text-amber-600 dark:text-amber-400" : "text-slate-400"} />
            <span className={overdue ? "text-amber-700 dark:text-amber-300 font-semibold" : "font-semibold text-slate-600 dark:text-slate-300"}>
              {formatDate(task.deadline)}
            </span>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bg-slate-50 dark:bg-[#1a1c20] px-2 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 font-semibold">
          <span className="whitespace-normal break-words">
            Source: {task.sourceGroup}
          </span>
        </div>

        <div className="border-t border-slate-200/70 dark:border-slate-700/60 pt-3 mt-1">
          <button
            onClick={() => setShowSource((p) => !p)}
            className="flex items-center justify-between w-full text-[10px] text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold transition-colors cursor-pointer bg-transparent border-none outline-none"
          >
            <span className="flex items-center gap-1.5">
              {showSource ? <EyeOff size={12} /> : <Eye size={12} />}
              {showSource ? "Hide source context" : "View source context"}
            </span>
            <ChevronDown size={12} className={`transform transition-transform duration-300 ${showSource ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {showSource && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-slate-50 dark:bg-[#14161a] border border-slate-200/60 dark:border-slate-700/60 rounded-lg p-3 text-[11px] text-slate-700 dark:text-slate-300 relative shadow-inner">
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-teal-500 dark:bg-teal-500 rounded-l-lg" />
                  <p className="whitespace-normal leading-relaxed break-words font-medium">
                    "{task.sourceMessage}"
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Inline Blocker Textarea */}
        <AnimatePresence>
          {showBlockerModal && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 rounded-xl p-3 flex flex-col gap-2 overflow-hidden"
            >
              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-200 uppercase tracking-wider">Describe the blocker</span>
              <textarea
                value={tempNote}
                onChange={(e) => setTempNote(e.target.value)}
                placeholder="e.g. Missing copy assets from client..."
                className="w-full bg-white dark:bg-[#15171b] border border-slate-200/70 dark:border-slate-700/60 rounded-lg p-2 text-xs text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-400 min-h-[60px] resize-none"
              />
              <div className="flex justify-end gap-1.5 mt-1">
                <button
                  onClick={() => setShowBlockerModal(false)}
                  className="px-2.5 py-1 text-[10px] font-semibold text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-700/40 rounded-md cursor-pointer bg-transparent border-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (tempNote.trim()) {
                      onToggleBlocker?.(task.id, true, tempNote.trim());
                      setShowBlockerModal(false);
                    }
                  }}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-semibold rounded-md shadow-sm cursor-pointer border-none"
                >
                  Raise Blocker
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-2 pt-1">
          {task.status !== "done" && (
            <div className="flex flex-col gap-1.5">
              {onMarkDone && (
                <button
                  onClick={() => onMarkDone?.(task.id)}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-semibold rounded-lg py-2 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] border-none cursor-pointer"
                >
                  <CheckCircle2 size={13} /> Mark as Done
                </button>
              )}
              {onToggleBlocker && (
                <button
                  onClick={() => {
                    if (task.isBlocked) {
                      // Resolve Blocker
                      onToggleBlocker?.(task.id, false, "");
                    } else {
                      setShowBlockerModal(true);
                    }
                  }}
                  className={`w-full text-[11px] font-semibold rounded-lg py-2 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] border cursor-pointer ${
                    task.isBlocked 
                      ? "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/30"
                      : "bg-white dark:bg-[#15171b] hover:bg-amber-50/60 dark:hover:bg-amber-500/10 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-200 border-slate-200/70 dark:border-slate-700/60 dark:hover:border-amber-500/30"
                  }`}
                >
                  {task.isBlocked ? "Resolve blocker" : "Report blocker"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-white dark:bg-[#15171b] rounded-2xl border border-dashed border-slate-200/70 dark:border-slate-700/60 shadow-sm w-full">
      <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-700/40 flex items-center justify-center mb-3">
        <Inbox size={18} className="text-slate-400 dark:text-slate-300" />
      </div>
      <p className="text-slate-600 dark:text-slate-300 text-sm font-semibold">{message}</p>
    </div>
  );
}

// ─── STAT BOX ─────────────────────────────────────────────────────────────────

function StatBox({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-white dark:bg-[#15171b] rounded-2xl shadow-sm border border-slate-200/70 dark:border-slate-700/60 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
      </div>
    </div>
  );
}

// ─── VIEW: DASHBOARD ─────────────────────────────────────────────────────────

function DashboardView({
  tasks,
  empName,
  onMarkDone,
  onToggleBlocker,
}: {
  tasks: Task[];
  empName: string;
  onMarkDone: (id: number | string) => void;
  onToggleBlocker: (id: number | string, isBlocked: boolean, note?: string) => void;
}) {
  const [selectedSource, setSelectedSource] = useState<"all" | "email" | "slack" | "fathom">("all");

  const sourceFiltered = tasks.filter((t) => selectedSource === "all" || t.source === selectedSource);
  // Strictly filter to current logged-in employee
  const filteredTasks = sourceFiltered.filter((t) => t.assignedTo.toLowerCase() === empName.toLowerCase());

  const confirmed = filteredTasks.filter((t) => t.status === "pending" && t.confidence >= 85);
  const done = filteredTasks.filter((t) => t.status === "done");

  const sorted = [...confirmed].sort((a, b) => {
    const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pd !== 0) return pd;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  const sources: { id: "all" | "email" | "slack" | "fathom"; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "All My Tasks", icon: <Inbox size={13} className="text-teal-500" /> },
    { id: "email", label: "Gmail", icon: <Mail size={13} className="text-teal-500" /> },
    { id: "slack", label: "Slack Teams", icon: <MessageCircle size={13} className="rotate-90 text-teal-500" /> },
    { id: "fathom", label: "Fathom Meetings", icon: <Video size={13} className="text-teal-500" /> },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Employee Greeting Banner */}
      <div className="bg-white/80 dark:bg-[#15171b] rounded-3xl p-6 md:p-8 text-slate-900 dark:text-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden border border-slate-200/70 dark:border-slate-700/60">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(13,148,136,0.12),transparent_55%)]" />
        <div className="relative z-10 w-full">
          <span className="text-xs uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400 font-semibold">Employee workspace</span>
          <h2 className="text-2xl md:text-3xl font-semibold mt-3">Welcome back, {empName}</h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base max-w-3xl leading-relaxed mt-3">
            Stay on top of your assigned deliverables, resolve blockers quickly, and keep every client request accountable.
          </p>
        </div>
      </div>

      {/* Segmented Filter Control */}
      <div className="flex justify-between items-center bg-white dark:bg-[#15171b] p-3 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 shadow-sm">
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100/70 dark:bg-slate-700/30 rounded-xl border border-slate-200/60 dark:border-slate-600/50">
          {sources.map((src) => {
            const active = selectedSource === src.id;
            return (
              <button
                key={src.id}
                onClick={() => setSelectedSource(src.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-250 cursor-pointer ${
                  active
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-700/40"
                }`}
              >
                {src.icon}
                {src.label}
              </button>
            );
          })}
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 px-3">
          <span className="inline-block w-2 h-2 rounded-full bg-teal-500" />
          <span>Sync active</span>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Column 1: Active Tasks */}
        <div className="bg-white dark:bg-[#15171b] rounded-2xl p-4 flex flex-col gap-4 border border-slate-200/70 dark:border-slate-700/60 shadow-sm min-h-[500px]">
          <div className="flex flex-col gap-1 px-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-teal-500" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-[15px]">My Active Tasks</h3>
              </div>
              <span className="bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-200 text-[10px] font-semibold rounded-full px-2.5 py-1 border border-teal-200/60 dark:border-teal-500/30 shadow-sm">{sorted.length}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Deliverables assigned to you and ready to execute.</p>
          </div>

          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {sorted.length === 0 ? (
                <EmptyState message="All caught up. No active tasks right now." />
              ) : (
                sorted.map((t) => (
                  <TaskCard key={t.id} task={t} onMarkDone={onMarkDone} onToggleBlocker={onToggleBlocker} />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Column 2: Completed */}
        <div className="bg-white dark:bg-[#15171b] rounded-2xl p-4 flex flex-col gap-4 border border-slate-200/70 dark:border-slate-700/60 shadow-sm min-h-[500px]">
          <div className="flex flex-col gap-1 px-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-400" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-[15px]">Completed</h3>
              </div>
              <span className="bg-slate-100 dark:bg-slate-700/40 text-slate-700 dark:text-slate-200 text-[10px] font-semibold rounded-full px-2.5 py-1 border border-slate-200/60 dark:border-slate-600/50 shadow-sm">{done.length}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Tasks that are already delivered.</p>
          </div>

          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {done.length === 0 ? (
                <EmptyState message="No completed tasks yet." />
              ) : (
                done.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── VIEW: BY CLIENT ──────────────────────────────────────────────────────────

function ClientView({
  tasks,
  empName,
  onMarkDone,
  onToggleBlocker,
}: {
  tasks: Task[];
  empName: string;
  onMarkDone: (id: number | string) => void;
  onToggleBlocker: (id: number | string, isBlocked: boolean, note?: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const empTasks = tasks.filter((t) => t.assignedTo.toLowerCase() === empName.toLowerCase());
  const pending = empTasks.filter((t) => t.status === "pending");
  const total = empTasks.length;
  const highPriority = empTasks.filter((t) => t.priority === "High").length;
  const overdue = empTasks.filter((t) => isOverdue(t.deadline) && t.status !== "done").length;
  const done = empTasks.filter((t) => t.status === "done").length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">My Tasks By Client</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{pending.length} pending deliverables assigned to you across all clients</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatBox icon={<BarChart2 size={18} className="text-teal-600 dark:text-teal-300" />} label="My Tasks" value={total} color="bg-teal-50 dark:bg-teal-500/10" />
        <StatBox icon={<AlertTriangle size={18} className="text-amber-600 dark:text-amber-300" />} label="High Priority" value={highPriority} color="bg-amber-50 dark:bg-amber-500/10" />
        <StatBox icon={<Clock size={18} className="text-amber-600 dark:text-amber-300" />} label="Overdue" value={overdue} color="bg-amber-50 dark:bg-amber-500/10" />
        <StatBox icon={<CheckCircle2 size={18} className="text-slate-600 dark:text-slate-300" />} label="Completed" value={done} color="bg-slate-100 dark:bg-slate-700/30" />
      </div>

      <div className="flex flex-col gap-4">
        {CLIENTS.map((client) => {
          const clientTasks = empTasks.filter((t) => t.client === client);
          const clientDone = clientTasks.filter((t) => t.status === "done").length;
          const cc = CLIENT_COLORS[client];
          const open = !collapsed[client];

          return (
            <div key={client} className="bg-white dark:bg-[#15171b] rounded-2xl shadow-sm overflow-hidden border border-slate-200/70 dark:border-slate-700/60">
              <button
                className={`w-full flex items-center justify-between px-5 py-4 ${cc.header} text-white transition-all cursor-pointer border-0 outline-none`}
                onClick={() => setCollapsed((p) => ({ ...p, [client]: !p[client] }))}
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-base">{client}</span>
                  <span className="bg-white/20 text-white text-xs font-bold rounded-full px-2 py-0.5">
                    {clientTasks.length} tasks
                  </span>
                </div>
                {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pt-4 pb-2">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex-1 bg-slate-100 dark:bg-slate-700/40 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${cc.header}`}
                            style={{ width: clientTasks.length ? `${(clientDone / clientTasks.length) * 100}%` : "0%" }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {clientDone}/{clientTasks.length} done
                        </span>
                      </div>
                      <div className="flex flex-col gap-3 pb-4">
                        <AnimatePresence>
                          {clientTasks.length === 0 ? (
                            <EmptyState message="No tasks assigned to you for this client" />
                          ) : (
                            clientTasks.map((t) => (
                              <TaskCard key={t.id} task={t} onMarkDone={onMarkDone} onToggleBlocker={onToggleBlocker} />
                            ))
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function EmployeeDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [profile, setProfile] = useState<{
    name: string;
    company: string;
    designation: "founder" | "employee";
  } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  const addToast = (message: string) => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3000);
  };

  const dismissToast = (id: number) => setToasts((p) => p.filter((t) => t.id !== id));

  const loadTasks = async () => {
    try {
      const r = await fetch("/api/tasks");
      const d = await r.json();
      if (Array.isArray(d)) {
        setTasks(d);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const loadProfileAndTasks = async () => {
    setLoadingProfile(true);
    try {
      const pRes = await fetch("/api/profile");
      if (pRes.status === 200) {
        const pData = await pRes.json();
        if (pData && pData.profile) {
          if (pData.profile.designation === "founder") {
            router.push("/founder");
            return;
          }
          setProfile(pData.profile);
          localStorage.setItem("taskpulse_onboarding", JSON.stringify(pData.profile));
        } else {
          // Sync check with localStorage
          const localData = localStorage.getItem("taskpulse_onboarding");
          if (localData) {
            try {
              const parsed = JSON.parse(localData);
              if (parsed.designation === "employee") {
                // Sync it
                await fetch("/api/profile", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: parsed.name,
                    email: session?.user?.email || "",
                    company: parsed.company,
                    designation: "employee",
                  }),
                });
                setProfile(parsed);
                await loadTasks();
                return;
              }
            } catch (e) {}
          }
          router.push("/founder");
          return;
        }
      } else {
        router.push("/founder");
        return;
      }
      await loadTasks();
    } catch (err) {
      console.error("Failed to load profile/tasks in employee console:", err);
      router.push("/founder");
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    if (status === "authenticated" && session) {
      loadProfileAndTasks();
    } else if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, session]);

  const getEmployeeName = () => {
    if (profile?.name) return profile.name;
    if (!session?.user?.name) return "Rahul";
    const nameLower = session.user.name.toLowerCase();
    for (const emp of EMPLOYEES) {
      if (nameLower.includes(emp.toLowerCase())) {
        return emp;
      }
    }
    return "Rahul";
  };
  const empName = getEmployeeName();

  const markDone = async (id: number | string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: "done" } : t));
    addToast("Task marked as done!");

    try {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "done" }),
      });
    } catch {}
  };

  const toggleBlocker = async (id: number | string, isBlocked: boolean, note?: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, isBlocked, blockerNote: note || "" }
          : t
      )
    );
    addToast(isBlocked ? "Blocker reported to Founder!" : "Blocker resolved!");

    try {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isBlocked, blockerNote: note || "" }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const clearDesignation = async () => {
    try {
      await fetch("/api/profile", { method: "DELETE" });
    } catch (e) {
      console.error("Failed to delete database profile:", e);
    }
    localStorage.removeItem("taskpulse_onboarding");
    addToast("Designation cleared!");
    router.push("/founder");
  };

  if (status === "loading" || loadingTasks || loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f6f2] dark:bg-[#121316]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          <p className="text-xs text-slate-500 font-semibold animate-pulse">Loading workspace...</p>
        </div>
      </div>
    );
  }

  const TABS_CONFIG: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Dashboard", icon: <BarChart2 size={15} /> },
    { id: "meetings", label: "Meetings", icon: <Video size={15} /> },
    { id: "client", label: "By Client", icon: <Briefcase size={15} /> },
    { id: "slack", label: "Slack Connect", icon: <Hash size={15} /> },
    { id: "email", label: "Email", icon: <Mail size={15} /> },
  ];

  return (
    <div className="min-h-screen bg-[#f7f6f2] dark:bg-[#121316] transition-colors duration-300">
      <ToastContainer toasts={toasts} dismiss={dismissToast} />

      <header className="sticky top-0 z-50 bg-[#f7f6f2]/90 dark:bg-[#121316]/90 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-700/60 h-[64px] flex items-center px-6 transition-colors duration-300">
        <div className="flex items-center gap-4 min-w-[240px]">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            Back to landing
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center text-xs font-semibold">TP</div>
            <span className="font-semibold text-slate-900 dark:text-white text-lg tracking-tight">TaskPulse</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-200 border border-teal-200/60 dark:border-teal-500/20">Staff</span>
          </div>
        </div>

        <div className="flex items-center ml-4">
          <SlackStatusBadge />
        </div>

        <nav className="flex-1 flex items-center justify-center gap-1">
          {TABS_CONFIG.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer border-0 ${
                activeTab === tab.id
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-700/40"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4 min-w-[260px] justify-end">
          {session?.user && (
            <div className="flex items-center gap-2 bg-white/70 dark:bg-slate-700/30 border border-slate-200/60 dark:border-slate-600/50 rounded-xl px-2 py-1 shadow-sm">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="w-5 h-5 rounded-full border border-slate-200/60 dark:border-slate-600/50"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center border border-teal-200/60 dark:border-teal-500/20">
                  <User size={10} className="text-teal-600 dark:text-teal-300" />
                </div>
              )}
              <button
                onClick={clearDesignation}
                className="text-[10px] font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-300 dark:hover:text-teal-200 transition-colors uppercase tracking-wider cursor-pointer border-r border-slate-200/60 dark:border-slate-600/50 pr-2 mr-2 bg-transparent border-t-0 border-b-0 border-l-0"
                title="Switch Role"
              >
                Switch Role
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-[10px] font-semibold text-slate-500 hover:text-amber-700 dark:text-slate-400 dark:hover:text-amber-300 transition-colors uppercase tracking-wider cursor-pointer bg-transparent border-0 outline-none"
                title="Sign Out"
              >
                Sign Out
              </button>
            </div>
          )}

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-700/40 transition-all border border-slate-200/60 dark:border-slate-600/50 hover:border-slate-300 dark:hover:border-slate-500 shadow-sm flex items-center justify-center cursor-pointer"
            title="Toggle Theme"
          >
            {mounted && theme === "dark" ? (
              <Sun size={15} className="text-amber-500" />
            ) : (
              <Moon size={15} className="text-teal-600 dark:text-teal-300" />
            )}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            {activeTab === "dashboard" && (
              <DashboardView
                tasks={tasks}
                empName={empName}
                onMarkDone={markDone}
                onToggleBlocker={toggleBlocker}
              />
            )}
            {activeTab === "meetings" && <MeetingTab />}
            {activeTab === "client" && (
              <ClientView
                tasks={tasks}
                empName={empName}
                onMarkDone={markDone}
                onToggleBlocker={toggleBlocker}
              />
            )}
            {activeTab === "slack" && (
              <SlackSetup 
                onToast={addToast} 
                loadTasks={loadTasks} 
                setActiveTab={(t) => setActiveTab(t as Tab)} 
              />
            )}
            {activeTab === "email" && (
              <div className="bg-white dark:bg-[#15171b] border border-slate-200/70 dark:border-slate-700/60 rounded-2xl p-8 text-center max-w-xl mx-auto">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700/40 flex items-center justify-center mx-auto mb-4">
                  <Mail size={20} className="text-teal-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Gmail Inbox Extraction</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                  Email extraction is managed by the organization owner. New deliverables assigned to your profile will appear in your active task list automatically.
                </p>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer border-none"
                >
                  Return to dashboard
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
