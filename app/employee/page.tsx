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
  Send,
  Sparkles,
  Loader2,
  BarChart2,
  Video,
  Briefcase,
  Inbox,
  Sun,
  Moon,
  Hash,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { SlackSetup, SlackStatusBadge } from "@/components/slack-setup";
import { MeetingTab } from "@/components/MeetingTab";
import { useSession, signIn, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type Priority = "High" | "Medium" | "Low";
type Source = "whatsapp" | "email" | "slack" | "zoom" | "google_meet" | "fathom";
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
  Flipkart: { bg: "bg-blue-50/80 dark:bg-blue-950/20", text: "text-blue-600 dark:text-blue-400", border: "border-blue-200 dark:border-blue-900/40", header: "bg-blue-600 dark:bg-blue-800" },
  Zomato:   { bg: "bg-rose-50/80 dark:bg-rose-950/20",  text: "text-rose-600 dark:text-rose-400",  border: "border-rose-200 dark:border-rose-900/40",  header: "bg-rose-600 dark:bg-rose-800"  },
  Amazon:   { bg: "bg-amber-50/80 dark:bg-amber-950/20", text: "text-amber-600 dark:text-amber-400", border: "border-amber-200 dark:border-amber-900/40", header: "bg-amber-500 dark:bg-amber-700" },
  Google:   { bg: "bg-emerald-50/80 dark:bg-emerald-950/20", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-900/40", header: "bg-emerald-600 dark:bg-emerald-800" },
};

const PRIORITY_CONFIG: Record<Priority, { dot: string; text: string; bg: string; border: string }> = {
  High:   { dot: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse", text: "text-red-700 dark:text-red-400", bg: "bg-red-50/50 dark:bg-red-950/10", border: "border-red-200/60 dark:border-red-900/30" },
  Medium: { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50/50 dark:bg-amber-950/10", border: "border-amber-200/60 dark:border-amber-900/30" },
  Low:    { dot: "bg-sky-500", text: "text-sky-700 dark:text-sky-400", bg: "bg-sky-50/50 dark:bg-sky-950/10", border: "border-sky-200/60 dark:border-sky-900/30" },
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
            className="pointer-events-auto bg-white border border-green-200 shadow-xl rounded-xl px-4 py-3 flex items-center gap-3 min-w-[260px] dark:bg-[#121214] dark:border-green-950"
          >
            <span className="text-green-500 text-lg">✅</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer bg-transparent border-0">
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
  const cc = CLIENT_COLORS[task.client] || { bg: "bg-gray-100 dark:bg-gray-900/40", text: "text-gray-700 dark:text-gray-300", border: "border-gray-300 dark:border-white/10" };
  const overdue = isOverdue(task.deadline) && task.status !== "done";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={`bg-white dark:bg-[#121214] rounded-xl shadow-sm hover:shadow-md border transition-all duration-300 overflow-hidden group ${task.isBlocked ? "border-red-400 dark:border-red-805" : "border-gray-200/60 dark:border-white/5"} hover:border-indigo-500/20 dark:hover:border-indigo-500/20`}
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
            <span className="flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border bg-purple-50/50 dark:bg-purple-950/15 border-purple-200/50 dark:border-purple-900/35 text-purple-700 dark:text-purple-400 shadow-sm">
              <MessageCircle size={10} className="rotate-90 text-purple-500" />
              Slack
            </span>
          ) : task.source === "email" ? (
            <span className="flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border bg-blue-50/50 dark:bg-blue-950/15 border-blue-200/50 dark:border-blue-900/35 text-blue-700 dark:text-blue-400 shadow-sm">
              <Mail size={10} className="text-blue-500" />
              Gmail
            </span>
          ) : task.source === "fathom" ? (
            <span className="flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border bg-violet-50/50 dark:bg-violet-950/15 border-violet-200/50 dark:border-violet-900/35 text-violet-700 dark:text-violet-400 shadow-sm">
              <Video size={10} className="text-violet-500" />
              Fathom
            </span>
          ) : task.source === "zoom" ? (
            <span className="flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border bg-blue-50/50 dark:bg-blue-950/15 border-blue-200/50 dark:border-blue-900/35 text-blue-700 dark:text-blue-400 shadow-sm">
              <Video size={10} className="text-blue-500" />
              Zoom
            </span>
          ) : task.source === "google_meet" ? (
            <span className="flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border bg-emerald-50/50 dark:bg-emerald-950/15 border-emerald-200/50 dark:border-emerald-900/35 text-emerald-700 dark:text-emerald-400 shadow-sm">
              <Video size={10} className="text-emerald-500" />
              Google Meet
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border bg-emerald-50/50 dark:bg-emerald-950/15 border-emerald-200/50 dark:border-emerald-900/35 text-emerald-700 dark:text-emerald-400 shadow-sm">
              <MessageCircle size={10} className="text-emerald-500" />
              WhatsApp
            </span>
          )}
        </div>
      </div>

      <div className="p-4 pt-0 flex flex-col gap-3">
        <h4 className={`font-semibold text-[14px] leading-snug text-gray-800 dark:text-gray-150 ${task.status === "done" ? "line-through text-gray-400 dark:text-gray-600" : ""}`}>
          {task.title}
        </h4>

        {task.isBlocked && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-lg p-2.5 flex items-start gap-2 text-xs text-red-800 dark:text-red-300 font-medium">
            <span className="text-sm flex-shrink-0">⚠️</span>
            <div className="flex-1 min-w-0">
              <span className="font-extrabold uppercase text-[10px] text-red-650 dark:text-red-400 block mb-0.5">Blocker Active</span>
              <p className="italic text-[11px] leading-relaxed break-words">"{task.blockerNote}"</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
              <User size={10} className="text-indigo-650 dark:text-indigo-400" />
            </div>
            <span className="font-bold text-gray-700 dark:text-gray-300">{task.assignedTo}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={11} className={overdue ? "text-red-500 dark:text-red-400" : "text-gray-400"} />
            <span className={overdue ? "text-red-600 dark:text-red-400 font-bold" : "font-semibold text-gray-600 dark:text-gray-300"}>
              {formatDate(task.deadline)}
            </span>
          </div>
        </div>

        <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5 bg-gray-50/80 dark:bg-[#1a1a1f] px-2 py-1.5 rounded-lg border border-gray-100 dark:border-white/5 font-semibold">
          <span className="whitespace-normal break-words">
            📁 {task.sourceGroup}
          </span>
        </div>

        <div className="border-t border-gray-100 dark:border-white/5 pt-3 mt-1">
          <button
            onClick={() => setShowSource((p) => !p)}
            className="flex items-center justify-between w-full text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-bold transition-colors cursor-pointer bg-transparent border-none outline-none"
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
                <div className="bg-[#f8fafc] dark:bg-black/30 border border-gray-200/50 dark:border-white/5 rounded-lg p-3 text-[11px] text-gray-700 dark:text-gray-350 relative shadow-inner">
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-500 dark:bg-indigo-700 rounded-l-lg" />
                  <p className="whitespace-normal leading-relaxed break-words font-medium italic">
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
              className="bg-red-50/50 dark:bg-red-950/10 border border-red-205 dark:border-red-900/25 rounded-xl p-3 flex flex-col gap-2 overflow-hidden"
            >
              <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Describe the Blocker / Question</span>
              <textarea
                value={tempNote}
                onChange={(e) => setTempNote(e.target.value)}
                placeholder="e.g. Missing copy assets from client..."
                className="w-full bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 rounded-lg p-2 text-xs text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-red-500 min-h-[60px] resize-none"
              />
              <div className="flex justify-end gap-1.5 mt-1">
                <button
                  onClick={() => setShowBlockerModal(false)}
                  className="px-2.5 py-1 text-[10px] font-bold text-gray-500 hover:bg-gray-200/50 dark:hover:bg-white/5 rounded-md cursor-pointer bg-transparent border-none"
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
                  className="px-3 py-1 bg-red-650 hover:bg-red-750 text-white text-[10px] font-bold rounded-md shadow-sm cursor-pointer border-none"
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
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg py-2 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] border-none cursor-pointer"
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
                  className={`w-full text-[11px] font-bold rounded-lg py-2 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] border cursor-pointer ${
                    task.isBlocked 
                      ? "bg-red-50 hover:bg-red-100 text-red-600 border-red-200 dark:bg-red-950/20 dark:hover:bg-red-955 dark:text-red-400 dark:border-red-900/30"
                      : "bg-white dark:bg-[#1a1a1f] hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 border-gray-200/80 dark:border-white/5 dark:hover:border-red-500/30"
                  }`}
                >
                  ⚠️ {task.isBlocked ? "Resolve Blocker" : "Report Blocker / Clarify"}
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
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-white dark:bg-white/5 rounded-xl border border-dashed border-gray-300 dark:border-white/10 shadow-sm w-full">
      <span className="text-3xl mb-2 grayscale opacity-50 dark:opacity-30">👻</span>
      <p className="text-gray-500 dark:text-gray-400 text-[13px] font-semibold">{message}</p>
    </div>
  );
}

// ─── STAT BOX ─────────────────────────────────────────────────────────────────

function StatBox({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-white dark:bg-[#18181b] rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
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
  const [selectedSource, setSelectedSource] = useState<"all" | "email" | "slack" | "whatsapp" | "fathom">("all");

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

  const sources: { id: "all" | "email" | "slack" | "whatsapp" | "fathom"; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "All My Tasks", icon: <Inbox size={13} /> },
    { id: "email", label: "Gmail", icon: <Mail size={13} /> },
    { id: "slack", label: "Slack Teams", icon: <MessageCircle size={13} className="rotate-90 text-purple-500" /> },
    { id: "whatsapp", label: "WhatsApp Chats", icon: <MessageCircle size={13} className="text-emerald-500" /> },
    { id: "fathom", label: "Fathom Meetings", icon: <Video size={13} className="text-violet-500" /> },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Employee Greeting Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-500 dark:from-indigo-950 dark:via-purple-900/40 dark:to-indigo-900/60 rounded-2xl p-6 md:p-8 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden border dark:border-white/5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="relative z-10 w-full">
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
            <Sparkles size={24} className="text-yellow-300 animate-pulse" />
            Employee Console: {empName}
          </h2>
          <p className="text-indigo-100 dark:text-indigo-200/80 text-sm md:text-base max-w-3xl leading-relaxed font-semibold">
            Track and complete your assigned deliverables. Flag blocker alerts directly to keep the Founder updated instantly, resolve dependencies seamlessly, and manage inbox/meeting extracted handoffs.
          </p>
        </div>
      </div>

      {/* Segmented Filter Control */}
      <div className="flex justify-between items-center bg-white dark:bg-[#121214] p-3 rounded-2xl border border-gray-200/60 dark:border-white/5 shadow-sm">
        <div className="flex flex-wrap gap-1.5 p-1 bg-gray-100/50 dark:bg-white/5 rounded-xl border border-gray-200/40 dark:border-white/5 shadow-inner">
          {sources.map((src) => {
            const active = selectedSource === src.id;
            return (
              <button
                key={src.id}
                onClick={() => setSelectedSource(src.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-250 cursor-pointer ${
                  active
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-white/5"
                }`}
              >
                {src.icon}
                {src.label}
              </button>
            );
          })}
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 px-3">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Scanner Sync Active</span>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Column 1: Active Tasks */}
        <div className="bg-indigo-50/20 dark:bg-indigo-950/5 rounded-2xl p-4 flex flex-col gap-4 border border-indigo-100/50 dark:border-indigo-950/20 shadow-sm min-h-[500px]">
          <div className="flex flex-col gap-1 px-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.5)] animate-pulse" />
                <h3 className="font-extrabold text-gray-800 dark:text-indigo-100 text-[15px]">My Active Tasks</h3>
              </div>
              <span className="bg-white dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-extrabold rounded-full px-2.5 py-1 border border-indigo-100/50 dark:border-indigo-900/30 shadow-sm">{sorted.length}</span>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-indigo-300/40 font-semibold">Deliverables assigned to you currently pending execution.</p>
          </div>

          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {sorted.length === 0 ? (
                <EmptyState message="All caught up! Excellent work. 🎉" />
              ) : (
                sorted.map((t) => (
                  <TaskCard key={t.id} task={t} onMarkDone={onMarkDone} onToggleBlocker={onToggleBlocker} />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Column 2: Completed */}
        <div className="bg-emerald-50/20 dark:bg-emerald-950/5 rounded-2xl p-4 flex flex-col gap-4 border border-emerald-100/40 dark:border-emerald-950/20 shadow-sm min-h-[500px]">
          <div className="flex flex-col gap-1 px-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                <h3 className="font-extrabold text-gray-800 dark:text-emerald-100 text-[15px]">Completed By Me</h3>
              </div>
              <span className="bg-white dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold rounded-full px-2.5 py-1 border border-emerald-100/40 dark:border-emerald-900/30 shadow-sm">{done.length}</span>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-emerald-300/40 font-semibold">Tasks you have successfully finalized.</p>
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
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-150 mb-1">My Tasks By Client</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{pending.length} pending deliverables assigned to you across all clients</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatBox icon={<BarChart2 size={18} className="text-indigo-600 dark:text-indigo-400" />} label="My Tasks" value={total} color="bg-indigo-50 dark:bg-indigo-950/20" />
        <StatBox icon={<AlertTriangle size={18} className="text-red-500 dark:text-red-400" />} label="High Priority" value={highPriority} color="bg-red-50 dark:bg-red-950/20" />
        <StatBox icon={<Clock size={18} className="text-orange-500 dark:text-orange-400" />} label="Overdue" value={overdue} color="bg-orange-50 dark:bg-orange-950/20" />
        <StatBox icon={<CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />} label="Completed" value={done} color="bg-green-50 dark:bg-green-950/20" />
      </div>

      <div className="flex flex-col gap-4">
        {CLIENTS.map((client) => {
          const clientTasks = empTasks.filter((t) => t.client === client);
          const clientDone = clientTasks.filter((t) => t.status === "done").length;
          const cc = CLIENT_COLORS[client];
          const open = !collapsed[client];

          return (
            <div key={client} className="bg-white dark:bg-[#18181b] rounded-xl shadow-md overflow-hidden border border-gray-100 dark:border-white/10">
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
                        <div className="flex-1 bg-gray-100 dark:bg-white/5 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${cc.header}`}
                            style={{ width: clientTasks.length ? `${(clientDone / clientTasks.length) * 100}%` : "0%" }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
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

  useEffect(() => {
    setMounted(true);
    loadTasks();
  }, []);

  const getEmployeeName = () => {
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

  const clearDesignation = () => {
    localStorage.removeItem("taskpulse_onboarding");
    addToast("Designation cleared!");
    router.push("/");
  };

  if (status === "loading" || loadingTasks) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs text-gray-500 font-semibold animate-pulse">Loading employee workspace...</p>
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
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] transition-colors duration-300">
      <ToastContainer toasts={toasts} dismiss={dismissToast} />

      <header className="sticky top-0 z-50 bg-white/80 dark:bg-black/50 backdrop-blur-md shadow-sm border-b border-gray-100 dark:border-gray-800 h-[60px] flex items-center px-6 transition-colors duration-300">
        <div className="flex items-center gap-2 min-w-[160px]">
          <span className="text-xl">📋</span>
          <span className="font-extrabold text-gray-900 dark:text-white text-lg tracking-tight">TaskPulse</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/20 dark:border-indigo-900/30">Staff</span>
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
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4 min-w-[260px] justify-end">
          {session?.user && (
            <div className="flex items-center gap-2 bg-gray-100/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-xl px-2 py-1 shadow-sm">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="w-5 h-5 rounded-full border border-gray-200/50 dark:border-white/10"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                  <User size={10} className="text-indigo-605 dark:text-indigo-400" />
                </div>
              )}
              <button
                onClick={clearDesignation}
                className="text-[10px] font-extrabold text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors uppercase tracking-wider cursor-pointer border-r border-gray-200 dark:border-white/10 pr-2 mr-2 bg-transparent border-t-0 border-b-0 border-l-0"
                title="Switch Role"
              >
                Switch Role
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-[10px] font-extrabold text-gray-500 hover:text-red-650 dark:text-gray-400 dark:hover:text-red-400 transition-colors uppercase tracking-wider cursor-pointer bg-transparent border-0 outline-none"
                title="Sign Out"
              >
                Sign Out
              </button>
            </div>
          )}

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-gray-200/50 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 shadow-sm flex items-center justify-center cursor-pointer"
            title="Toggle Theme"
          >
            {mounted && theme === "dark" ? (
              <Sun size={15} className="text-yellow-500" />
            ) : (
              <Moon size={15} className="text-indigo-606 dark:text-indigo-450" />
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
              <div className="bg-white dark:bg-[#121214] border border-gray-200/60 dark:border-white/5 rounded-2xl p-8 text-center max-w-xl mx-auto">
                <span className="text-4xl mb-4 block">📧</span>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Gmail Inbox Extraction</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                  Your email extractors are configured centrally by the organization Founder. Any new deliverables scanned and assigned to your roster profile will automatically appear in your active task column.
                </p>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer border-none"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
