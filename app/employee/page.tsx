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
  Sparkles,
  RefreshCw,
  Crown,
  ShieldCheck,
  Undo,
  Edit2,
  Plus,
  Trash,
  FolderPlus,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { SlackSetup, SlackStatusBadge } from "@/components/slack-setup";
import { MeetingTab } from "@/components/MeetingTab";
import { useSession, signIn, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type Priority = "High" | "Medium" | "Low";
type Source = "email" | "slack" | "zoom" | "google_meet" | "fathom" | "whatsapp";
type Status = "pending" | "done" | "dismissed";

interface Task {
  id: number | string;
  title: string;
  client: string;
  assignedTo: string;
  deadline: string;
  dueAt?: string | null;
  meetingId?: string | null;
  priority: Priority;
  source: Source;
  sourceGroup: string;
  status: Status;
  confidence: number;
  sourceMessage: string;
  sourceMessageId?: string | null;
  isBlocked?: boolean;
  blockerNote?: string;
}

type Tab = "dashboard" | "client" | "slack" | "email" | "meetings";

// ─── DATA CONFIGURATIONS ──────────────────────────────────────────────────────

const EMPLOYEES = ["Rahul", "Priya", "Admin", "Vikas"];
const CLIENTS = ["Flipkart", "Zomato", "Amazon", "Google"];

const getClientColors = (client: string) => {
  const predefined: Record<string, { bg: string; text: string; border: string; header: string }> = {
    Flipkart: { bg: "bg-teal-50/80 dark:bg-teal-500/10", text: "text-teal-700 dark:text-teal-300", border: "border-teal-200/60 dark:border-teal-500/20", header: "bg-teal-600" },
    Zomato: { bg: "bg-amber-50/80 dark:bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200/60 dark:border-amber-500/20", header: "bg-amber-500" },
    Amazon: { bg: "bg-slate-100/80 dark:bg-slate-700/20", text: "text-slate-700 dark:text-slate-205", border: "border-slate-200/70 dark:border-slate-600/40", header: "bg-slate-700" },
    Google: { bg: "bg-teal-50/80 dark:bg-teal-500/10", text: "text-teal-700 dark:text-teal-300", border: "border-teal-200/60 dark:border-teal-500/20", header: "bg-teal-600" },
    "No Client": { bg: "bg-slate-50/80 dark:bg-slate-700/10", text: "text-slate-600 dark:text-slate-355", border: "border-slate-200/60 dark:border-slate-600/25", header: "bg-slate-600" },
  };

  if (client && predefined[client]) return predefined[client];

  // Dynamic colors based on string hashing
  const palettes = [
    { bg: "bg-indigo-50/80 dark:bg-indigo-500/10", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-200/60 dark:border-indigo-500/20", header: "bg-indigo-650 dark:bg-indigo-850" },
    { bg: "bg-rose-50/80 dark:bg-rose-500/10", text: "text-rose-700 dark:text-rose-300", border: "border-rose-200/60 dark:border-rose-500/20", header: "bg-rose-650 dark:bg-rose-850" },
    { bg: "bg-emerald-50/80 dark:bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200/60 dark:border-emerald-500/20", header: "bg-emerald-650 dark:bg-emerald-850" },
    { bg: "bg-violet-50/80 dark:bg-violet-500/10", text: "text-violet-700 dark:text-violet-300", border: "border-violet-200/60 dark:border-violet-500/20", header: "bg-violet-650 dark:bg-violet-850" },
    { bg: "bg-sky-50/80 dark:bg-sky-500/10", text: "text-sky-700 dark:text-sky-300", border: "border-sky-200/60 dark:border-sky-500/20", header: "bg-sky-600 dark:bg-sky-800" },
  ];

  const str = client || "General";
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % palettes.length;
  return palettes[index];
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

function getCountdownText(dueAtStr?: string | null, deadlineStr?: string | null, status?: string) {
  if (status === "done") {
    return { text: "Completed", urgency: "done" };
  }

  let targetTime: number;
  if (dueAtStr) {
    targetTime = new Date(dueAtStr).getTime();
  } else if (deadlineStr) {
    // Treat date as EOD
    targetTime = new Date(`${deadlineStr}T23:59:59`).getTime();
  } else {
    return null;
  }

  const now = Date.now();
  const diff = targetTime - now;

  if (diff <= 0) {
    const hoursOverdue = Math.abs(Math.floor(diff / (1000 * 60 * 60)));
    if (hoursOverdue < 1) {
      const minsOverdue = Math.abs(Math.floor(diff / (1000 * 60)));
      return { text: `Overdue by ${minsOverdue}m`, urgency: "overdue" };
    }
    return { text: `Overdue by ${hoursOverdue}h`, urgency: "overdue" };
  }

  const mins = Math.floor((diff / (1000 * 60)) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 0) {
    return { text: `${days}d ${hours}h remaining`, urgency: days > 2 ? "low" : "medium" };
  }
  if (hours > 0) {
    return { text: `${hours}h ${mins}m left`, urgency: hours > 2 ? "medium" : "high" };
  }
  return { text: `Due in ${mins}m`, urgency: "critical" };
}

function getUrgencyBadge(urgency: string, text: string) {
  let badgeStyles = "";
  switch (urgency) {
    case "done":
      badgeStyles = "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-500/20";
      break;
    case "overdue":
      badgeStyles = "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-350 border-rose-200/60 dark:border-rose-500/20";
      break;
    case "critical":
      badgeStyles = "bg-rose-500 text-white border-rose-600 dark:bg-rose-600 dark:border-rose-700 shadow-[0_0_8px_rgba(244,63,94,0.3)] animate-pulse";
      break;
    case "high":
      badgeStyles = "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-500/20";
      break;
    case "medium":
      badgeStyles = "bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200/60 dark:border-teal-500/20";
      break;
    case "low":
    default:
      badgeStyles = "bg-slate-50 dark:bg-slate-700/10 text-slate-655 dark:text-slate-400 border-slate-200/60 dark:border-slate-600/25";
      break;
  }

  return (
    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border ${badgeStyles}`}>
      <Clock size={10} className={urgency === "critical" || urgency === "overdue" ? "animate-pulse" : ""} />
      {text}
    </span>
  );
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
  onConfirm,
  onDismiss,
  onReassign,
  onToggleBlocker,
  onSendToReview,
  onUpdateTask,
  onMarkActive,
  showConfirmButtons = false,
  showFrom = false,
  isFounder = false,
  employeesList,
}: {
  task: Task;
  onMarkDone?: (id: number | string) => void;
  onConfirm?: (id: number | string) => void;
  onDismiss?: (id: number | string) => void;
  onReassign?: (id: number | string, newAssignee: string) => void;
  onToggleBlocker?: (id: number | string, isBlocked: boolean, note?: string) => void;
  onSendToReview?: (id: number | string) => void;
  onUpdateTask?: (id: number | string, updatedFields: Partial<Task>) => Promise<void>;
  onMarkActive?: (id: number | string) => void;
  showConfirmButtons?: boolean;
  showFrom?: boolean;
  isFounder?: boolean;
  employeesList?: string[];
}) {
  const [showSource, setShowSource] = useState(false);
  const [showBlockerModal, setShowBlockerModal] = useState(false);
  const [tempNote, setTempNote] = useState(task.blockerNote || "");
  const pc = PRIORITY_CONFIG[task.priority];
  const cc = getClientColors(task.client);
  const overdue = isOverdue(task.deadline) && task.status !== "done";

  const activeEmployees = employeesList || EMPLOYEES;

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editClient, setEditClient] = useState(task.client);
  const [editPriority, setEditPriority] = useState<Priority>(task.priority);
  const [editAssignee, setEditAssignee] = useState(task.assignedTo);
  const [editDeadline, setEditDeadline] = useState(task.deadline);
  const [editDueTime, setEditDueTime] = useState(
    task.dueAt ? new Date(task.dueAt).toTimeString().split(" ")[0].substring(0, 5) : "18:00"
  );

  const [timerText, setTimerText] = useState<{ text: string; urgency: string } | null>(null);

  useEffect(() => {
    const updateTimer = () => {
      const res = getCountdownText(task.dueAt, task.deadline, task.status);
      setTimerText(res);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 10000); // update every 10s
    return () => clearInterval(interval);
  }, [task.dueAt, task.deadline, task.status]);

  useEffect(() => {
    setEditTitle(task.title);
    setEditClient(task.client);
    setEditPriority(task.priority);
    setEditAssignee(task.assignedTo);
    setEditDeadline(task.deadline);
    setEditDueTime(task.dueAt ? new Date(task.dueAt).toTimeString().split(" ")[0].substring(0, 5) : "18:00");
  }, [task]);

  if (isEditing) {
    return (
      <motion.div
        layout
        className="bg-white dark:bg-[#13151a] rounded-2xl shadow-md border border-teal-500/20 dark:border-teal-500/10 p-5 flex flex-col gap-4 transition-all duration-300"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
          <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider flex items-center gap-2">
            <Edit2 size={13} className="text-teal-500" /> Edit Deliverable
          </span>
          <button
            onClick={() => setIsEditing(false)}
            className="text-slate-455 hover:text-slate-655 transition-colors p-1 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-lg cursor-pointer border-none bg-transparent flex items-center justify-center outline-none"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Task Title</label>
          <input
            type="text"
            required
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#181a20] border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-750 dark:text-slate-202 font-semibold outline-none focus:ring-1 focus:ring-teal-500 transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Client</label>
            <select
              value={editClient}
              onChange={(e) => setEditClient(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#181a20] border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-750 dark:text-slate-202 font-semibold outline-none cursor-pointer focus:ring-1 focus:ring-teal-500 transition-all"
            >
              <option value="No Client">No Client / Internal</option>
              {Array.from(new Set(["Flipkart", "Zomato", "Amazon", "Google", task.client]))
                .filter(c => c && c !== "No Client" && c !== "General")
                .map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Priority</label>
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value as Priority)}
              className="w-full bg-slate-50 dark:bg-[#181a20] border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-750 dark:text-slate-202 font-semibold outline-none cursor-pointer focus:ring-1 focus:ring-teal-500 transition-all"
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5 col-span-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assignee</label>
            <select
              value={editAssignee}
              disabled={!isFounder}
              onChange={(e) => setEditAssignee(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#181a20] border border-slate-200 dark:border-slate-705 rounded-xl px-3 py-2 text-xs text-slate-705 dark:text-slate-202 font-semibold outline-none cursor-pointer focus:ring-1 focus:ring-teal-500 transition-all disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {activeEmployees.map((emp) => (
                <option key={emp} value={emp}>{emp}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 col-span-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Deadline Date</label>
            <input
              type="date"
              required
              value={editDeadline}
              onChange={(e) => setEditDeadline(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#181a20] border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-705 dark:text-slate-202 font-semibold outline-none cursor-pointer"
            />
          </div>
          <div className="flex flex-col gap-1.5 col-span-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Deadline Time</label>
            <input
              type="time"
              required
              value={editDueTime}
              onChange={(e) => setEditDueTime(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#181a20] border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-705 dark:text-slate-202 font-semibold outline-none cursor-pointer"
            />
          </div>
        </div>

        <div className="flex gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 mt-1">
          <button
            onClick={async () => {
              if (editTitle.trim()) {
                const combinedDueAt = new Date(`${editDeadline}T${editDueTime || "18:00"}:00`).toISOString();
                await onUpdateTask?.(task.id, {
                  title: editTitle.trim(),
                  client: editClient,
                  priority: editPriority,
                  assignedTo: editAssignee,
                  deadline: editDeadline,
                  dueAt: combinedDueAt,
                });
                setIsEditing(false);
              }
            }}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl py-2.5 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] border-none cursor-pointer"
          >
            <CheckCircle2 size={13} /> Save
          </button>
          <button
            onClick={() => {
              setEditTitle(task.title);
              setEditClient(task.client);
              setEditPriority(task.priority);
              setEditAssignee(task.assignedTo);
              setEditDeadline(task.deadline);
              setEditDueTime(task.dueAt ? new Date(task.dueAt).toTimeString().split(" ")[0].substring(0, 5) : "18:00");
              setIsEditing(false);
            }}
            className="flex-1 bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-655 dark:text-slate-300 text-xs font-semibold rounded-xl py-2.5 transition-all border border-slate-200 dark:border-slate-700/60 flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <X size={13} /> Cancel
          </button>
        </div>
      </motion.div>
    );
  }

  const getUrgencyStyles = (urgency?: string) => {
    switch (urgency) {
      case "overdue":
      case "critical":
        return "border-rose-500/80 dark:border-rose-500/50 ring-2 ring-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.15)] dark:shadow-[0_0_16px_rgba(244,63,94,0.2)] animate-pulse";
      case "high":
        return "border-amber-500/70 dark:border-amber-500/40 ring-1 ring-amber-500/10 shadow-[0_0_8px_rgba(245,158,11,0.08)]";
      case "medium":
        return "border-teal-500/30 dark:border-teal-500/20 shadow-sm";
      case "low":
      default:
        return "border-slate-200/80 dark:border-slate-800/80 shadow-sm";
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={`bg-white dark:bg-[#13151a] rounded-2xl shadow-sm border transition-all duration-300 overflow-hidden group ${
        task.isBlocked
          ? "border-amber-500/40 dark:border-amber-500/25 bg-amber-500/[0.01]"
          : getUrgencyStyles(timerText?.urgency)
      } hover:shadow-md hover:border-teal-500/30 dark:hover:border-teal-500/30`}
    >
      <div className="p-5 flex flex-col gap-4">
        {/* Header tags and metadata */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-[#191b22] text-slate-600 dark:text-slate-400">
              {task.client === "No Client" ? "No Client / Internal" : task.client}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-[#191b22] text-slate-655 dark:text-slate-400">
              <span className={`w-1 h-1 rounded-full ${pc.dot}`} />
              {task.priority}
            </span>
            {timerText && getUrgencyBadge(timerText.urgency, timerText.text)}
          </div>

          <div className="flex items-center gap-2">
            {task.source === "slack" ? (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                <MessageCircle size={11} className="rotate-90 text-teal-500/70" />
                Slack
              </span>
            ) : task.source === "email" ? (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                <Mail size={11} className="text-teal-500/70" />
                Gmail
              </span>
            ) : task.source === "fathom" ? (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                <Video size={11} className="text-teal-500/70" />
                Fathom
              </span>
            ) : task.source === "zoom" ? (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                <Video size={11} className="text-teal-500/70" />
                Zoom
              </span>
            ) : task.source === "google_meet" ? (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                <Video size={11} className="text-teal-500/70" />
                Meet
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                <Inbox size={11} className="text-teal-500/70" />
                Feed
              </span>
            )}

            {isFounder && onUpdateTask && (
              <button
                onClick={() => setIsEditing(true)}
                title="Edit Deliverable"
                className="text-slate-455 hover:text-teal-600 dark:text-slate-500 dark:hover:text-teal-400 p-1 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-lg transition-all cursor-pointer border-none bg-transparent flex items-center justify-center outline-none"
              >
                <Edit2 size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Task Title */}
        <h4 className={`text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100 leading-snug ${
          task.status === "done" ? "line-through text-slate-400 dark:text-slate-500" : ""
        }`}>
          {task.title}
        </h4>

        {/* Blocker Alert Box */}
        {task.isBlocked && (
          <div className="bg-amber-500/[0.04] border border-amber-500/20 text-amber-900 dark:text-amber-300 rounded-xl p-3 flex items-start gap-2.5 text-xs font-medium">
            <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="font-bold uppercase text-[9px] tracking-wider text-amber-700 dark:text-amber-200 block mb-0.5">Blocker reported</span>
              <p className="text-[11px] leading-relaxed break-words">"{task.blockerNote}"</p>
            </div>
          </div>
        )}

        {/* Assignee & Deadline Row */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-455 border-t border-slate-100 dark:border-slate-800/80 pt-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center border border-teal-200/50 dark:border-teal-500/20">
              <User size={10} className="text-teal-600 dark:text-teal-300" />
            </div>
            {isFounder && onReassign ? (
              <select
                value={task.assignedTo}
                onChange={(e) => onReassign?.(task.id, e.target.value)}
                className="bg-transparent border-0 rounded-lg py-0.5 text-xs text-slate-700 dark:text-slate-205 outline-none focus:ring-1 focus:ring-teal-500 font-semibold cursor-pointer transition-colors"
              >
                {activeEmployees.map((emp) => (
                  <option key={emp} value={emp}>{emp}</option>
                ))}
              </select>
            ) : (
              <span className="font-semibold text-slate-700 dark:text-white">{task.assignedTo}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={11} className={overdue ? "text-amber-500" : "text-slate-400"} />
            <span className={`font-semibold ${overdue ? "text-amber-600 dark:text-amber-400 font-bold" : "text-slate-655 dark:text-slate-300"}`}>
              {formatDate(task.deadline)}
            </span>
          </div>
        </div>

        {/* Source context footer tag */}
        <div className="text-[10px] text-slate-405 dark:text-slate-500 flex items-center gap-1 bg-slate-50 dark:bg-[#191b22] px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800/80 font-medium w-full">
          <span className="whitespace-normal break-words truncate">
            Source: {task.sourceGroup}
          </span>
        </div>

        {/* AI Confidence Badge */}
        {showConfirmButtons && (
          <div className="bg-amber-500/[0.04] border border-amber-500/15 rounded-xl px-2.5 py-2 text-[10px] text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1.5 shadow-sm">
            <Sparkles size={11} className="text-amber-555" />
            AI Confidence: {task.confidence}%
          </div>
        )}

        {/* Source context collapsible box */}
        <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3">
          <button
            onClick={() => setShowSource((p) => !p)}
            className="flex items-center justify-between w-full text-[10px] text-slate-400 dark:text-slate-500 hover:text-slate-655 dark:hover:text-slate-350 font-semibold transition-colors bg-transparent border-none outline-none cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              {showSource ? <EyeOff size={11} /> : <Eye size={11} />}
              {showSource ? "Hide source message" : "View source context"}
            </span>
            <ChevronDown size={11} className={`transform transition-transform duration-300 ${showSource ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {showSource && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-slate-50/50 dark:bg-[#181a20] border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-3.5 text-[11px] text-slate-650 dark:text-slate-355 relative shadow-inner">
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-teal-500 dark:bg-teal-500 rounded-l-lg" />
                  <p className="whitespace-normal leading-relaxed break-words font-medium italic">
                    "{task.sourceMessage}"
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* inline Blocker raise form */}
        <AnimatePresence>
          {showBlockerModal && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-amber-500/[0.04] border border-amber-500/20 rounded-xl p-3 flex flex-col gap-2 overflow-hidden"
            >
              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Describe the blocker</span>
              <textarea
                value={tempNote}
                onChange={(e) => setTempNote(e.target.value)}
                placeholder="e.g. Missing copy assets from client..."
                className="w-full bg-white dark:bg-[#181a20] border border-slate-200 dark:border-slate-705 rounded-xl p-2.5 text-xs text-slate-750 dark:text-slate-205 outline-none focus:ring-1 focus:ring-amber-500 min-h-[60px] resize-none"
              />
              <div className="flex justify-end gap-1.5 mt-1">
                <button
                  onClick={() => setShowBlockerModal(false)}
                  className="px-2.5 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 cursor-pointer bg-transparent border-none"
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
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded-lg shadow-sm cursor-pointer border-none"
                >
                  Raise Blocker
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Buttons section */}
        <div className="flex flex-col gap-2">
          {showConfirmButtons ? (
            <div className="flex gap-2">
              <button
                onClick={() => onConfirm?.(task.id)}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl py-2 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] border-none cursor-pointer"
              >
                <CheckCircle2 size={13} /> Accept
              </button>
              <button
                onClick={() => onDismiss?.(task.id)}
                className="flex-1 bg-white dark:bg-transparent hover:bg-amber-500/[0.04] dark:hover:bg-amber-500/10 text-slate-655 dark:text-slate-350 hover:text-amber-700 dark:hover:text-amber-200 text-xs font-semibold rounded-xl py-2 transition-all border border-slate-200 dark:border-slate-700/60 dark:hover:border-amber-500/20 flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
              >
                <X size={13} /> Reject
              </button>
            </div>
          ) : (
            task.status === "done" ? (
              onMarkActive && (
                <button
                  onClick={() => onMarkActive?.(task.id)}
                  className="w-full bg-white dark:bg-transparent hover:bg-teal-500/[0.04] dark:hover:bg-teal-500/10 text-slate-655 dark:text-slate-305 hover:text-teal-700 dark:hover:text-teal-200 text-xs font-semibold rounded-xl py-2 transition-all border border-slate-200 dark:border-slate-700/60 dark:hover:border-teal-500/20 flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  <Undo size={13} className="text-teal-500 dark:text-teal-400" /> Send back to active
                </button>
              )
            ) : (
              <div className="flex flex-col gap-1.5">
                {onMarkDone && (
                  <button
                    onClick={() => onMarkDone?.(task.id)}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl py-2.5 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] border-none cursor-pointer"
                  >
                    <CheckCircle2 size={13} /> Mark as Done
                  </button>
                )}
                {onSendToReview && (
                  <button
                    onClick={() => onSendToReview?.(task.id)}
                    className="w-full bg-white dark:bg-transparent hover:bg-amber-500/[0.04] dark:hover:bg-amber-500/10 text-slate-655 dark:text-slate-305 hover:text-amber-700 dark:hover:text-amber-200 text-xs font-semibold rounded-xl py-2.5 transition-all border border-slate-200 dark:border-slate-700/60 dark:hover:border-amber-500/20 flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
                  >
                    <Undo size={13} className="text-amber-500" /> Send back to review
                  </button>
                )}
                {onToggleBlocker && (
                  <button
                    onClick={() => {
                      if (task.isBlocked) {
                        onToggleBlocker?.(task.id, false, "");
                      } else {
                        setShowBlockerModal(true);
                      }
                    }}
                    className={`w-full text-xs font-semibold rounded-xl py-2.5 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] border cursor-pointer ${
                      task.isBlocked
                        ? "bg-amber-500/[0.04] hover:bg-amber-500/[0.08] text-amber-700 dark:text-amber-200 border-amber-200/60 dark:border-amber-500/20"
                        : "bg-white hover:bg-slate-50 dark:bg-transparent dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 dark:hover:border-amber-500/20"
                    }`}
                  >
                    {task.isBlocked ? "Resolve blocker" : "Report blocker"}
                  </button>
                )}
              </div>
            )
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
  onConfirm,
  onDismiss,
  onToggleBlocker,
  onSendToReview,
  onMarkActive,
  onUpdateTask,
  employeesList,
}: {
  tasks: Task[];
  empName: string;
  onMarkDone: (id: number | string) => void;
  onConfirm: (id: number | string) => void;
  onDismiss: (id: number | string) => void;
  onToggleBlocker: (id: number | string, isBlocked: boolean, note?: string) => void;
  onSendToReview: (id: number | string) => void;
  onMarkActive: (id: number | string) => void;
  onUpdateTask: (id: number | string, updatedFields: Partial<Task>) => Promise<void>;
  employeesList: string[];
}) {
  const [selectedSource, setSelectedSource] = useState<"all" | "email" | "slack" | "fathom">("all");

  const sourceFiltered = tasks.filter((t) => {
    if (selectedSource === "all") return true;
    if (selectedSource === "fathom") {
      return t.source === "fathom" || t.source === "google_meet" || t.source === "zoom" || t.source === "teams" || t.source === "manual";
    }
    return t.source === selectedSource;
  });
  // Strictly filter to current logged-in employee (case-insensitive)
  const filteredTasks = sourceFiltered.filter((t) => t.assignedTo && t.assignedTo.toLowerCase() === empName.toLowerCase());

  const confirmed = filteredTasks.filter((t) => t.status === "pending" && t.confidence >= 85);
  const unconfirmed = filteredTasks.filter((t) => t.confidence < 85 && t.status !== "done" && t.status !== "dismissed");
  const done = filteredTasks.filter((t) => t.status === "done");

  const sorted = [...confirmed].sort((a, b) => {
    const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pd !== 0) return pd;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  const sources: { id: "all" | "email" | "slack" | "fathom"; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "All My Tasks", icon: <Inbox size={13} className="text-teal-500" /> },
    { id: "email", label: "Gmail Inbox", icon: <Mail size={13} className="text-teal-500" /> },
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
          <span className="inline-block w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          <span>Sync active</span>
        </div>
      </div>

      {/* 3-Column Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Column 1: Needs Review */}
        <div className="bg-slate-50 dark:bg-[#15171b] shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] rounded-2xl p-4 flex flex-col gap-4 border border-slate-200/70 dark:border-slate-700/60 min-h-[500px]">
          <div className="flex flex-col gap-1 px-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-[15px]">Needs Review</h3>
              </div>
              <span className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-200 text-[10px] font-semibold rounded-full px-2.5 py-1 border border-amber-200/60 dark:border-amber-500/30 shadow-sm">{unconfirmed.length}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Imported tasks (Slack/Email) that you need to confirm or reject.</p>
          </div>

          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {unconfirmed.length === 0 ? (
                <EmptyState message="All suggestions reviewed." />
              ) : (
                unconfirmed.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    showConfirmButtons
                    onConfirm={onConfirm}
                    onDismiss={onDismiss}
                    isFounder={false}
                    onUpdateTask={onUpdateTask}
                    employeesList={employeesList}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Column 2: Active Tasks */}
        <div className="bg-slate-50 dark:bg-[#15171b] shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] rounded-2xl p-4 flex flex-col gap-4 border border-slate-200/70 dark:border-slate-700/60 min-h-[500px]">
          <div className="flex flex-col gap-1 px-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-teal-500" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-[15px]">Active Tasks</h3>
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
                  <TaskCard
                    key={t.id}
                    task={t}
                    onMarkDone={onMarkDone}
                    isFounder={false}
                    onSendToReview={onSendToReview}
                    onUpdateTask={onUpdateTask}
                    employeesList={employeesList}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Column 3: Completed */}
        <div className="bg-slate-50 dark:bg-[#15171b] shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] rounded-2xl p-4 flex flex-col gap-4 border border-slate-200/70 dark:border-slate-700/60 min-h-[500px]">
          <div className="flex flex-col gap-1 px-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-400" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-[15px]">Completed</h3>
              </div>
              <span className="bg-slate-100 dark:bg-slate-700/40 text-slate-700 dark:text-slate-200 text-[10px] font-semibold rounded-full px-2.5 py-1 border border-slate-200/60 dark:border-slate-600/50 shadow-sm">{done.length}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Tasks marked as done successfully.</p>
          </div>

          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {done.length === 0 ? (
                <EmptyState message="No completed tasks yet." />
              ) : (
                done.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    isFounder={false}
                    onMarkActive={onMarkActive}
                    onUpdateTask={onUpdateTask}
                    employeesList={employeesList}
                  />
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
  onConfirm,
  onDismiss,
  onToggleBlocker,
  onSendToReview,
  onMarkActive,
  onUpdateTask,
  employeesList,
}: {
  tasks: Task[];
  empName: string;
  onMarkDone: (id: number | string) => void;
  onConfirm: (id: number | string) => void;
  onDismiss: (id: number | string) => void;
  onToggleBlocker: (id: number | string, isBlocked: boolean, note?: string) => void;
  onSendToReview: (id: number | string) => void;
  onMarkActive: (id: number | string) => void;
  onUpdateTask: (id: number | string, updatedFields: Partial<Task>) => Promise<void>;
  employeesList: string[];
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  useEffect(() => {
    const fetchClients = async () => {
      setLoadingClients(true);
      try {
        const res = await fetch("/api/clients");
        const data = await res.json();
        if (data.clients) {
          setClients(data.clients);
        }
      } catch (err) {
        console.error("Failed to fetch clients on employee console:", err);
      } finally {
        setLoadingClients(false);
      }
    };
    fetchClients();
  }, []);

  // Combine manually whitelisted database clients and historically extracted client names to remain 100% robust and safe
  const registeredNames = clients.map((c) => c.name);
  const dynamicClients = Array.from(
    new Set([
      ...registeredNames,
      ...tasks.map((t) => t.client).filter((c) => c && c !== "General" && c !== "Unknown")
    ])
  ).sort();

  const empTasks = tasks.filter((t) => t.assignedTo && t.assignedTo.toLowerCase() === empName.toLowerCase());
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
        {dynamicClients.map((client) => {
          const clientTasks = empTasks.filter((t) => t.client === client);
          const clientDone = clientTasks.filter((t) => t.status === "done").length;
          const cc = getClientColors(client);
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
                              <TaskCard
                                key={t.id}
                                task={t}
                                showConfirmButtons={t.confidence < 85 && t.status !== "done" && t.status !== "dismissed"}
                                onConfirm={onConfirm}
                                onDismiss={onDismiss}
                                onMarkDone={onMarkDone}
                                onToggleBlocker={onToggleBlocker}
                                onSendToReview={onSendToReview}
                                onMarkActive={onMarkActive}
                                onUpdateTask={onUpdateTask}
                                isFounder={false}
                                employeesList={employeesList}
                              />
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

// Email View component for employee Gmail sync

function EmailView({
  onToast,
  loadTasks,
  setActiveTab,
  tasks,
  emails,
  setEmails,
  loading,
  setLoading,
  selectedId,
  setSelectedId,
}: {
  onToast: (msg: string) => void;
  loadTasks: () => Promise<void>;
  setActiveTab: (tab: Tab) => void;
  tasks: Task[];
  emails: any[];
  setEmails: React.Dispatch<React.SetStateAction<any[]>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  selectedId: string | null;
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const [syncing, setSyncing] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);

  const getAvatarStyle = (name: string) => {
    const colors = [
      { bg: "bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-300", border: "border-teal-200/60 dark:border-teal-500/30" },
      { bg: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300", border: "border-amber-200/60 dark:border-amber-500/30" },
      { bg: "bg-slate-100 text-slate-600 dark:bg-slate-700/30 dark:text-slate-300", border: "border-slate-200/60 dark:border-slate-600/50" },
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const fetchRawEmails = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/gmail/inbox", { priority: "low" } as any);
      if (res.status === 401) {
        disconnectGmail();
        if (!silent) setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.emails) {
        setEmails(data.emails);
        if (data.emails.length > 0 && !selectedId) {
          setSelectedId(data.emails[0].id);
        }
      } else if (data.error) {
        if (!silent) onToast(`Error: ${data.error}`);
      }
    } catch (e) {
      if (!silent) onToast("Failed to fetch emails.");
    }
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    const emailCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("gmail_email="));
    if (emailCookie) {
      const email = decodeURIComponent(emailCookie.split("=")[1]);
      if (email) {
        setConnectedEmail(email);
        if (emails.length === 0) {
          fetchRawEmails(false);
        } else {
          fetchRawEmails(true);
        }
      }
    }
  }, []);

  const disconnectGmail = () => {
    document.cookie = "gmail_token=; Path=/; Max-Age=0";
    document.cookie = "gmail_email=; Path=/; Max-Age=0";
    document.cookie = "gmail_refresh_token=; Path=/; Max-Age=0";
    setConnectedEmail(null);
    setEmails([]);
    setSelectedId(null);
    onToast("Gmail disconnected.");
  };

  const syncAndAnalyzeWithAI = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/gmail");
      if (res.status === 401) {
        onToast("Not authenticated. Please connect Gmail first.");
        setSyncing(false);
        return;
      }
      const data = await res.json();
      if (data.tasks) {
        await loadTasks();
        await fetchRawEmails();
        onToast(`Successfully synced inbox. Extracted ${data.tasks.length} tasks.`);
      } else if (data.error) {
        onToast(`Error: ${data.error}`);
      }
    } catch (e) {
      onToast("AI sync failed.");
    }
    setSyncing(false);
  };

  const selectedEmail = emails.find((e) => e.id === selectedId);
  const associatedTask = selectedEmail ? tasks.find((t) => t.sourceMessageId === selectedEmail.id) : null;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Mail className="text-teal-600" size={24} />
            Email Integration
          </h1>
          {connectedEmail ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block w-2 h-2 rounded-full bg-teal-500" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Connected: <strong className="text-slate-800 dark:text-slate-200">{connectedEmail}</strong>
              </span>
              <button
                onClick={disconnectGmail}
                className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-300 dark:hover:text-amber-200 ml-2 underline cursor-pointer font-medium"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-slate-400" />
              Not connected
            </p>
          )}
        </div>

        {connectedEmail && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchRawEmails()}
              disabled={loading || syncing}
              className="flex items-center gap-2 bg-white dark:bg-[#15171b] border border-slate-200/70 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 px-3.5 py-1.5 rounded-lg font-semibold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-all text-sm disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-slate-400" : ""} />
              Refresh
            </button>

            <button
              onClick={syncAndAnalyzeWithAI}
              disabled={loading || syncing}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-1.5 rounded-lg font-semibold shadow-sm transition-all text-sm disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
            >
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {syncing ? "Analyzing inbox..." : "Sync and analyze"}
            </button>
          </div>
        )}
      </div>

      {!connectedEmail ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-slate-200/70 dark:border-slate-700/60 rounded-2xl p-12 text-center bg-white dark:bg-[#15171b] shadow-sm">
          <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center text-teal-600 mb-4 border border-teal-200/60 dark:border-teal-500/30">
            <Mail size={32} />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">Connect Your Gmail Account</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
            TaskPulse uses secure Google OAuth to scan your inbox and parse deliverables into tasks.
          </p>
          <button
            onClick={() => { window.location.href = "/api/auth/login"; }}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-sm transition-all text-sm cursor-pointer"
          >
            Connect Gmail Securely
          </button>
        </div>
      ) : (
        <div className="flex rounded-2xl overflow-hidden shadow-sm border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-[#15171b]" style={{ height: "calc(100vh - 240px)", minHeight: 480 }}>
          <div className="w-96 flex-shrink-0 border-r border-slate-200/70 dark:border-slate-700/60 flex flex-col bg-white dark:bg-[#111318]">
            <div className="border-b border-slate-200/70 dark:border-slate-700/60 bg-slate-50 dark:bg-[#15171b] px-4 py-3 font-semibold text-sm text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Inbox size={15} className="text-teal-500" />
                Inbox ({emails.length} email{emails.length !== 1 ? "s" : ""})
              </span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {loading && emails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-slate-500 gap-2">
                  <Loader2 size={24} className="animate-spin text-teal-500" />
                  <p className="text-xs">Loading emails from Gmail...</p>
                </div>
              ) : emails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-slate-500 text-center px-4">
                  <Mail size={24} className="mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-semibold">Your Gmail inbox is empty</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-1 max-w-[200px]">Or we could not fetch messages. Click Refresh to retry.</p>
                </div>
              ) : (
                emails.map((e) => {
                  const avatar = getAvatarStyle(e.fromName);
                  const isSelected = selectedId === e.id;

                  return (
                    <button
                      key={e.id}
                      onClick={() => setSelectedId(e.id)}
                      className={`w-full text-left px-4 py-3 flex gap-3 transition-colors text-xs items-start cursor-pointer border-b border-slate-100 dark:border-slate-800 ${
                        isSelected
                          ? "bg-teal-50/60 dark:bg-teal-500/10 border-l-[3px] border-l-teal-500"
                          : e.isUnread
                            ? "bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
                            : "bg-white dark:bg-[#111318] hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-semibold border text-sm shadow-sm ${avatar.bg} ${avatar.border}`}>
                        {e.fromName ? e.fromName.charAt(0).toUpperCase() : "?"}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <p className={`text-xs truncate max-w-[170px] ${e.isUnread ? "font-semibold text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-400"}`}>
                            {e.fromName}
                          </p>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0 ml-1 font-medium">{e.date}</span>
                        </div>

                        <p className={`text-xs truncate mb-0.5 ${e.isUnread ? "font-semibold text-slate-800 dark:text-slate-200" : "text-slate-600 dark:text-slate-400"}`}>
                          {e.subject}
                        </p>

                        <p className="text-[11px] text-slate-500 dark:text-slate-500 line-clamp-2 leading-tight">
                          {e.snippet.length > 60 ? e.snippet.substring(0, 60) + "..." : e.snippet}
                        </p>

                        <div className="flex gap-1.5 mt-1.5 items-center flex-wrap">
                          {e.isUnread && (
                            <span className="text-[9px] bg-teal-600 text-white font-semibold px-1.5 py-0.5 rounded tracking-wide uppercase shadow-sm">
                              Unread
                            </span>
                          )}
                          {associatedTask && (
                            <span className="text-[9px] bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-200 font-semibold px-1.5 py-0.5 rounded border border-teal-200/60 dark:border-teal-500/30 flex items-center gap-0.5 shadow-sm">
                              <Sparkles size={8} /> Synced Task
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-white dark:bg-[#15171b] overflow-y-auto">
            <div className="bg-teal-600 dark:bg-teal-700 px-6 py-3.5 flex-shrink-0 text-white font-semibold text-xs flex justify-between items-center shadow-sm">
              <span>Gmail Content Viewer</span>
              {selectedEmail && (
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  ID: {selectedEmail.id}
                </span>
              )}
            </div>

            {selectedEmail ? (
              <div className="px-8 py-6 flex-1 flex flex-col">
                <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-4 leading-snug">
                  {selectedEmail.subject}
                </h2>

                <div className="flex flex-col md:flex-row md:justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-6 pb-6 border-b border-slate-200/70 dark:border-slate-700/60">
                  <div className="flex flex-col gap-1">
                    <span>
                      <strong className="text-slate-700 dark:text-slate-300">From:</strong> {selectedEmail.fromName}{" "}
                      <span className="text-slate-400 dark:text-slate-500">&lt;{selectedEmail.fromEmail}&gt;</span>
                    </span>
                    <span>
                      <strong className="text-slate-700 dark:text-slate-300">To:</strong> me (via OAuth API)
                    </span>
                  </div>
                  <div className="md:text-right">
                    <span>
                      <strong className="text-slate-700 dark:text-slate-300">Date:</strong> {selectedEmail.date}
                    </span>
                  </div>
                </div>

                <div className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm mb-8 max-w-3xl whitespace-pre-wrap font-sans bg-slate-50/30 dark:bg-white/[0.02] p-6 rounded-xl border border-slate-200/70 dark:border-slate-700/60 flex-1">
                  {selectedEmail.snippet}
                </div>

                {associatedTask ? (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-teal-50/50 dark:bg-teal-500/10 border border-teal-200/70 dark:border-teal-500/30 rounded-xl p-5"
                  >
                    <h3 className="font-semibold text-teal-800 dark:text-teal-200 text-sm mb-3 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-teal-500" />
                      TaskPulse Extracted Task
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-4">
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mb-0.5">Task Title</p>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{associatedTask.title}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mb-0.5">Assigned To</p>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <User size={12} className="text-teal-400" /> {associatedTask.assignedTo}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mb-0.5">Priority</p>
                        <span className={`inline-block font-semibold text-[10px] px-2 py-0.5 rounded-full ${
                          associatedTask.priority === "High" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200" :
                          associatedTask.priority === "Medium" ? "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-200" :
                          "bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-200"
                        }`}>
                          {associatedTask.priority}
                        </span>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mb-0.5">Deadline</p>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <Calendar size={12} className="text-teal-400" /> {formatDate(associatedTask.deadline)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab("dashboard")}
                      className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg px-4 py-2 transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 size={12} />
                      View on Dashboard
                    </button>
                  </motion.div>
                ) : (
                  <div className="bg-slate-50 dark:bg-[#15171b] border border-slate-200/70 dark:border-slate-700/60 rounded-xl p-5 text-center text-slate-500 dark:text-slate-400 text-xs flex flex-col items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-500" />
                    <span>No task extracted from this email yet.</span>
                    <button
                      onClick={syncAndAnalyzeWithAI}
                      disabled={syncing || loading}
                      className="mt-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      Scan Inbox
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                <Mail size={36} className="mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-semibold">No Email Selected</p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 font-medium">Select an email from the inbox list to read it.</p>
              </div>
            )}
          </div>
        </div>
      )}
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
  const [employees, setEmployees] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [emailSelectedId, setEmailSelectedId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { theme, setTheme, resolvedTheme } = useTheme();
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

  const loadEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setEmployees(data);
        }
      }
    } catch (err) {
      console.error("Failed to load employees in employee portal:", err);
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
      loadEmployees();
    } else if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, session]);

  // Real-time synchronization polling (3 seconds interval)
  useEffect(() => {
    if (status === "authenticated") {
      const interval = setInterval(() => {
        loadTasks();
        loadEmployees();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [status]);

  const getEmployeeName = () => {
    if (profile?.name) return profile.name;
    return session?.user?.name || "Rahul";
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

  const confirmTask = async (id: number | string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, confidence: 95 } : t));
    addToast("Task confirmed and added to active!");

    if (typeof id === "string") {
      try {
        await fetch("/api/tasks", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status: "confirmed" }),
        });
      } catch {}
    }
  };

  const sendTaskToReview = async (id: number | string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, confidence: 80 } : t));
    addToast("Task sent back to review!");

    if (typeof id === "string") {
      try {
        await fetch("/api/tasks", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status: "unconfirmed" }),
        });
      } catch {}
    }
  };

  const sendTaskToActive = async (id: number | string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: "pending", confidence: 95 } : t
      )
    );
    addToast("Task sent back to active!");

    if (typeof id === "string") {
      try {
        await fetch("/api/tasks", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status: "confirmed" }),
        });
      } catch {}
    }
  };

  const dismissTask = async (id: number | string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    addToast("Task dismissed.");

    if (typeof id === "string") {
      try {
        await fetch("/api/tasks", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status: "dismissed" }),
        });
      } catch {}
    }
  };

  const updateTask = async (id: number | string, updatedFields: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updatedFields } : t))
    );
    addToast("Task updated successfully!");

    if (typeof id === "string") {
      try {
        const body: any = { id };
        if (updatedFields.title !== undefined) body.title = updatedFields.title;
        if (updatedFields.priority !== undefined) body.priority = updatedFields.priority;
        if (updatedFields.deadline !== undefined) body.deadline = updatedFields.deadline;
        if (updatedFields.dueAt !== undefined) body.dueAt = updatedFields.dueAt;
        if (updatedFields.client !== undefined) body.client = updatedFields.client;
        if (updatedFields.assignedTo !== undefined) body.assignee = updatedFields.assignedTo;
        if (updatedFields.isBlocked !== undefined) body.isBlocked = updatedFields.isBlocked;
        if (updatedFields.blockerNote !== undefined) body.blockerNote = updatedFields.blockerNote;

        await fetch("/api/tasks", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch (err) {
        console.error("Failed to update task on backend:", err);
      }
    }
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

  if (!mounted || status === "loading" || loadingTasks || loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f6f2] dark:bg-[#0b0c0e]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
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

  const employeesList = Array.from(new Set([
    ...employees.map((e) => e.name),
    "Rahul", "Priya", "Admin", "Vikas"
  ]));

  return (
    <div className="min-h-screen bg-[#f7f6f2] dark:bg-[#0b0c0e] transition-colors duration-300">
      <ToastContainer toasts={toasts} dismiss={dismissToast} />

      <header className="sticky top-0 z-50 bg-[#f7f6f2]/90 dark:bg-[#0e0f12]/90 backdrop-blur-md border-b border-slate-200/70 dark:border-[#1c1d22] h-[64px] flex items-center justify-between px-4 md:px-6 transition-colors duration-300 w-full max-w-full overflow-hidden">
        <div className="flex items-center gap-2 md:gap-3 shrink-0 mr-2 min-w-0">
          <Link
            href="/"
            className="hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center text-xs font-semibold shrink-0">TP</div>
            <span className="font-semibold text-slate-900 dark:text-white text-base md:text-lg tracking-tight hidden sm:inline truncate">TaskPulse</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-200 border border-teal-200/60 dark:border-teal-500/20 shrink-0">Staff</span>
          </div>
        </div>

        <div className="hidden xl:flex items-center shrink-0 mr-2">
          <SlackStatusBadge />
        </div>

        <nav className="flex-1 min-w-0 flex items-center justify-start md:justify-center gap-1 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap px-1">
          {TABS_CONFIG.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer border-0 shrink-0 select-none ${
                activeTab === tab.id
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-700/40"
              }`}
            >
              {tab.icon}
              <span className="hidden lg:inline">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0 justify-end ml-2">
          {session?.user && (
            <div className="flex items-center gap-1.5 md:gap-2 bg-white/70 dark:bg-slate-700/30 border border-slate-200/60 dark:border-slate-600/50 rounded-xl px-1.5 md:px-2 py-1 shadow-sm shrink-0 min-w-0">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="w-5 h-5 rounded-full border border-slate-200/60 dark:border-slate-600/50 shrink-0"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center border border-teal-200/60 dark:border-teal-500/20 shrink-0">
                  <User size={10} className="text-teal-600 dark:text-teal-300" />
                </div>
              )}
              <button
                onClick={clearDesignation}
                className="text-[10px] font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-300 dark:hover:text-teal-200 transition-colors uppercase tracking-wider cursor-pointer border-r border-slate-200/60 dark:border-slate-600/50 pr-1.5 md:pr-2 mr-1.5 md:mr-2 bg-transparent border-t-0 border-b-0 border-l-0 flex items-center gap-1"
                title="Switch Role"
              >
                <RefreshCw size={10} className="md:hidden" />
                <span className="hidden md:inline">Switch Role</span>
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-[10px] font-semibold text-slate-500 hover:text-amber-700 dark:text-slate-400 dark:hover:text-amber-300 transition-colors uppercase tracking-wider cursor-pointer bg-transparent border-0 outline-none flex items-center gap-1"
                title="Sign Out"
              >
                <X size={10} className="md:hidden" />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            </div>
          )}

          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-700/40 transition-all border border-slate-200/60 dark:border-slate-600/50 hover:border-slate-300 dark:hover:border-slate-500 shadow-sm flex items-center justify-center cursor-pointer shrink-0"
            title="Toggle Theme"
          >
            {mounted && resolvedTheme === "dark" ? (
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
                onConfirm={confirmTask}
                onDismiss={dismissTask}
                onToggleBlocker={toggleBlocker}
                onSendToReview={sendTaskToReview}
                onMarkActive={sendTaskToActive}
                onUpdateTask={updateTask}
                employeesList={employeesList}
              />
            )}
            {activeTab === "meetings" && <MeetingTab tasks={tasks} onUpdateTask={updateTask} />}
            {activeTab === "client" && (
              <ClientView
                tasks={tasks}
                empName={empName}
                onMarkDone={markDone}
                onConfirm={confirmTask}
                onDismiss={dismissTask}
                onToggleBlocker={toggleBlocker}
                onSendToReview={sendTaskToReview}
                onMarkActive={sendTaskToActive}
                onUpdateTask={updateTask}
                employeesList={employeesList}
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
              <EmailView
                onToast={addToast}
                loadTasks={loadTasks}
                setActiveTab={setActiveTab}
                tasks={tasks}
                emails={emails}
                setEmails={setEmails}
                loading={loadingEmails}
                setLoading={setLoadingEmails}
                selectedId={emailSelectedId}
                setSelectedId={setEmailSelectedId}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
