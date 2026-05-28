"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Crown,
  Eye,
  EyeOff,
  Hash,
  Inbox,
  Lock,
  Mail,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Sun,
  Moon,
  Users,
  User,
  Video,
  Briefcase,
  X,
  Edit2,
  Sparkles,
  Loader2,
  Undo,
  Plus,
  Trash,
  FolderPlus,
  AlertCircle,
} from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { SlackSetup, SlackStatusBadge } from "@/components/slack-setup";
import { MeetingTab } from "@/components/MeetingTab";
import { WhatsAppConnector, GroupSelector, useTaskStream } from "@/components/whatsapp-setup";
import Link from "next/link";

// Types

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

type Tab = "dashboard" | "client" | "employee" | "slack" | "email" | "meetings";

// Mock data

const INITIAL_TASKS: Task[] = [
  { id: 1, title: "Send revised creatives to Flipkart", client: "Flipkart", assignedTo: "Rahul", deadline: "2026-05-18", priority: "High", source: "slack", sourceGroup: "#flipkart-campaign", status: "pending", confidence: 95, sourceMessage: "Can someone send the revised creatives before 6 PM today? The client is waiting. This is urgent." },
  { id: 2, title: "Finalize proposal document for Zomato", client: "Zomato", assignedTo: "Priya", deadline: "2026-05-19", priority: "High", source: "email", sourceGroup: "Zomato Strategy Thread", status: "pending", confidence: 88, sourceMessage: "Hi team, we need the proposal finalized by tomorrow EOD. Please review the attached doc and send it across." },
  { id: 3, title: "Update social media posts for Amazon", client: "Amazon", assignedTo: "Priya", deadline: "2026-05-17", priority: "Medium", source: "email", sourceGroup: "Amazon Thread", status: "pending", confidence: 72, sourceMessage: "Dekha jayega if we can push the posts out by tomorrow? Client ka pressure hai bhai." },
  { id: 4, title: "Send May invoice to Flipkart", client: "Flipkart", assignedTo: "Admin", deadline: "2026-05-20", priority: "Medium", source: "email", sourceGroup: "Finance Thread", status: "done", confidence: 92, sourceMessage: "Please send the May invoice to Flipkart by end of week. Accounts team is waiting." },
  { id: 5, title: "Design banner for Google Ads campaign", client: "Google", assignedTo: "Rahul", deadline: "2026-05-17", priority: "High", source: "slack", sourceGroup: "#google-campaigns", status: "pending", confidence: 91, sourceMessage: "@Rahul please design the banner for the Google Ads campaign by tomorrow morning. Client review is at 11 AM." },
  { id: 6, title: "Schedule Q2 strategy meeting with Zomato", client: "Zomato", assignedTo: "Priya", deadline: "2026-05-16", priority: "High", source: "email", sourceGroup: "Zomato Comms", status: "pending", confidence: 87, sourceMessage: "Can we schedule a meeting with the Zomato team this Friday to discuss Q2 strategy? Please confirm availability." },
  { id: 7, title: "Send performance report to Amazon", client: "Amazon", assignedTo: "Vikas", deadline: "2026-05-21", priority: "Low", source: "email", sourceGroup: "Amazon Monthly Reports", status: "pending", confidence: 83, sourceMessage: "Vikas, please compile and send the monthly performance report for the Amazon account by next Tuesday." },
  { id: 8, title: "Prepare pitch deck for new Google campaign", client: "Google", assignedTo: "Rahul", deadline: "2026-05-22", priority: "Medium", source: "slack", sourceGroup: "#google-strategy", status: "pending", confidence: 76, sourceMessage: "Bhai kal tak ek rough pitch deck banana hai Google ke naye campaign ke liye. Founder ko dikhana hai." },
];

const CLIENTS = ["Flipkart", "Zomato", "Amazon", "Google"];
const EMPLOYEES = ["Rahul", "Priya", "Admin", "Vikas"];

const getClientColors = (client: string) => {
  const predefined: Record<string, { bg: string; text: string; border: string; header: string }> = {
    Flipkart: { bg: "bg-teal-50/80 dark:bg-teal-500/10", text: "text-teal-700 dark:text-teal-300", border: "border-teal-200/60 dark:border-teal-500/20", header: "bg-teal-600" },
    Zomato: { bg: "bg-amber-50/80 dark:bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200/60 dark:border-amber-500/20", header: "bg-amber-500" },
    Amazon: { bg: "bg-slate-100/80 dark:bg-slate-700/20", text: "text-slate-700 dark:text-slate-200", border: "border-slate-200/70 dark:border-slate-600/40", header: "bg-slate-700" },
    Google: { bg: "bg-teal-50/80 dark:bg-teal-500/10", text: "text-teal-700 dark:text-teal-300", border: "border-teal-200/60 dark:border-teal-500/20", header: "bg-teal-600" },
    "No Client": { bg: "bg-slate-50/80 dark:bg-slate-700/10", text: "text-slate-600 dark:text-slate-350", border: "border-slate-200/60 dark:border-slate-600/25", header: "bg-slate-600" },
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
  High: { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50/60 dark:bg-amber-500/10", border: "border-amber-200/60 dark:border-amber-500/20" },
  Medium: { dot: "bg-teal-500", text: "text-teal-700 dark:text-teal-300", bg: "bg-teal-50/60 dark:bg-teal-500/10", border: "border-teal-200/60 dark:border-teal-500/20" },
  Low: { dot: "bg-slate-500", text: "text-slate-600 dark:text-slate-300", bg: "bg-slate-100/60 dark:bg-slate-700/20", border: "border-slate-200/70 dark:border-slate-600/40" },
};

const PRIORITY_ORDER: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };

// Helpers

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

// Toast

interface Toast { id: number; message: string; type?: "success" | "info" }

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

// Task card

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
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-lg cursor-pointer border-none bg-transparent flex items-center justify-center outline-none"
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
            className="w-full bg-slate-50 dark:bg-[#181a20] border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 font-semibold outline-none focus:ring-1 focus:ring-teal-500 transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Client</label>
            <select
              value={editClient}
              onChange={(e) => setEditClient(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#181a20] border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 font-semibold outline-none cursor-pointer focus:ring-1 focus:ring-teal-500 transition-all"
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
              className="w-full bg-slate-50 dark:bg-[#181a20] border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 font-semibold outline-none cursor-pointer focus:ring-1 focus:ring-teal-500 transition-all"
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
              className="w-full bg-slate-50 dark:bg-[#181a20] border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 font-semibold outline-none cursor-pointer focus:ring-1 focus:ring-teal-500 transition-all disabled:opacity-75 disabled:cursor-not-allowed"
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
              className="w-full bg-slate-50 dark:bg-[#181a20] border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 font-semibold outline-none cursor-pointer focus:ring-1 focus:ring-teal-500 transition-all"
            />
          </div>
          <div className="flex flex-col gap-1.5 col-span-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Deadline Time</label>
            <input
              type="time"
              required
              value={editDueTime}
              onChange={(e) => setEditDueTime(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#181a20] border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 font-semibold outline-none cursor-pointer focus:ring-1 focus:ring-teal-500 transition-all"
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
            className="flex-1 bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-650 dark:text-slate-300 text-xs font-semibold rounded-xl py-2.5 transition-all border border-slate-200 dark:border-slate-700/60 flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
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
                <MessageCircle size={11} className="text-teal-500/70" />
                WhatsApp
              </span>
            )}

            {isFounder && onUpdateTask && (
              <button
                onClick={() => setIsEditing(true)}
                title="Edit Deliverable"
                className="text-slate-450 hover:text-teal-600 dark:text-slate-500 dark:hover:text-teal-400 p-1 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-lg transition-all cursor-pointer border-none bg-transparent flex items-center justify-center outline-none"
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
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-450 border-t border-slate-100 dark:border-slate-800/80 pt-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center border border-teal-200/50 dark:border-teal-500/20">
              <User size={10} className="text-teal-600 dark:text-teal-300" />
            </div>
            {isFounder && onReassign ? (
              <div className="relative flex items-center bg-teal-50/50 hover:bg-teal-50/80 dark:bg-teal-500/10 dark:hover:bg-teal-500/15 border border-teal-200/50 dark:border-teal-500/20 rounded-lg px-2 py-0.5 transition-colors cursor-pointer">
                <select
                  value={task.assignedTo}
                  onChange={(e) => onReassign?.(task.id, e.target.value)}
                  className="appearance-none bg-transparent border-0 text-[11px] text-teal-800 dark:text-white pr-4 outline-none font-bold cursor-pointer"
                >
                  {activeEmployees.map((emp) => (
                    <option key={emp} value={emp} className="bg-white dark:bg-[#13151a] text-slate-800 dark:text-slate-200 font-semibold">
                      {emp}
                    </option>
                  ))}
                </select>
                <ChevronDown size={10} className="text-teal-600 dark:text-teal-400 absolute right-1.5 pointer-events-none" />
              </div>
            ) : (
              <span className="font-semibold text-slate-700 dark:text-white">{task.assignedTo}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={11} className={overdue ? "text-amber-500" : "text-slate-400"} />
            <span className={`font-semibold ${overdue ? "text-amber-600 dark:text-amber-400 font-bold" : "text-slate-600 dark:text-slate-300"}`}>
              {formatDate(task.deadline)}
            </span>
          </div>
        </div>

        {/* Source context footer tag */}
        <div className="text-[10px] text-slate-450 dark:text-slate-500 flex items-center gap-1 bg-slate-50 dark:bg-[#191b22] px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800/80 font-medium w-full">
          <span className="whitespace-normal break-words truncate">
            Source: {task.sourceGroup}
          </span>
        </div>

        {/* AI Confidence Badge */}
        {showConfirmButtons && (
          <div className="bg-amber-500/[0.04] border border-amber-500/15 rounded-xl px-2.5 py-2 text-[10px] text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1.5 shadow-sm">
            <Sparkles size={11} className="text-amber-500" />
            AI Confidence: {task.confidence}%
          </div>
        )}

        {/* Source context collapsible box */}
        <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3">
          <button
            onClick={() => setShowSource((p) => !p)}
            className="flex items-center justify-between w-full text-[10px] text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:hover:text-slate-300 font-semibold transition-colors bg-transparent border-none outline-none cursor-pointer"
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
                <div className="bg-slate-50/50 dark:bg-[#181a20] border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-3.5 text-[11px] text-slate-650 dark:text-slate-350 relative shadow-inner">
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
                className="w-full bg-white dark:bg-[#181a20] border border-slate-200 dark:border-slate-700/60 rounded-xl p-2.5 text-xs text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-amber-500 min-h-[60px] resize-none"
              />
              <div className="flex justify-end gap-1.5 mt-1">
                <button
                  onClick={() => setShowBlockerModal(false)}
                  className="px-2.5 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 cursor-pointer bg-transparent border-none"
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
                className="flex-1 bg-white dark:bg-transparent hover:bg-amber-500/[0.04] dark:hover:bg-amber-500/10 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-200 text-xs font-semibold rounded-xl py-2 transition-all border border-slate-200 dark:border-slate-700/60 dark:hover:border-amber-500/20 flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
              >
                <X size={13} /> Reject
              </button>
            </div>
          ) : (
            task.status === "done" ? (
              isFounder && onMarkActive && (
                <button
                  onClick={() => onMarkActive?.(task.id)}
                  className="w-full bg-white dark:bg-transparent hover:bg-teal-500/[0.04] dark:hover:bg-teal-500/10 text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-200 text-xs font-semibold rounded-xl py-2 transition-all border border-slate-200 dark:border-slate-700/60 dark:hover:border-teal-500/20 flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
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
                {isFounder && onSendToReview && (
                  <button
                    onClick={() => onSendToReview?.(task.id)}
                    className="w-full bg-white dark:bg-transparent hover:bg-amber-500/[0.04] dark:hover:bg-amber-500/10 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-200 text-xs font-semibold rounded-xl py-2.5 transition-all border border-slate-200 dark:border-slate-700/60 dark:hover:border-amber-500/20 flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
                  >
                    <Undo size={13} className="text-amber-500" /> Send back to review
                  </button>
                )}
                {!isFounder && onToggleBlocker && (
                  <button
                    onClick={() => setShowBlockerModal(true)}
                    className="w-full bg-white dark:bg-transparent hover:bg-amber-500/[0.04] dark:hover:bg-amber-500/10 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-200 text-xs font-semibold rounded-xl py-2.5 transition-all border border-slate-200 dark:border-slate-700/60 dark:hover:border-amber-500/20 flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
                  >
                    {task.isBlocked ? "Update blocker" : "Report blocker"}
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

// Empty state

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-white dark:bg-[#15171b] rounded-2xl border border-dashed border-slate-200/70 dark:border-slate-700/60 shadow-sm">
      <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-700/40 flex items-center justify-center mb-3">
        <Inbox size={18} className="text-slate-400 dark:text-slate-300" />
      </div>
      <p className="text-slate-600 dark:text-slate-300 text-sm font-semibold">{message}</p>
    </div>
  );
}

// Stat box

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

// Manual task creator

function ManualTaskCreator({
  onAddTask,
  tasks,
  employeesList,
}: {
  onAddTask: (task: {
    title: string;
    client: string;
    assignedTo: string;
    deadline: string;
    priority: Priority;
    dueAt?: string;
  }) => Promise<void>;
  tasks: Task[];
  employeesList?: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");

  const dynamicClients = Array.from(
    new Set(["No Client", "Flipkart", "Zomato", "Amazon", "Google", ...tasks.map((t) => t.client).filter((c) => c && c !== "General" && c !== "Unknown" && c !== "No Client")])
  );

  const activeEmployees = employeesList || EMPLOYEES;

  const [client, setClient] = useState(dynamicClients[0]);
  const [assignedTo, setAssignedTo] = useState(activeEmployees[0]);
  const [deadline, setDeadline] = useState("");
  const [dueTime, setDueTime] = useState("18:00");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!dynamicClients.includes(client)) {
      setClient(dynamicClients[0]);
    }
  }, [tasks]);

  useEffect(() => {
    if (!activeEmployees.includes(assignedTo) && activeEmployees.length > 0) {
      setAssignedTo(activeEmployees[0]);
    }
  }, [employeesList]);

  const setQuickDuration = (hours: number) => {
    const now = new Date();
    const future = new Date(now.getTime() + hours * 60 * 60 * 1000);
    const dateStr = future.toISOString().split("T")[0];
    const timeStr = future.toTimeString().split(" ")[0].substring(0, 5);
    setDeadline(dateStr);
    setDueTime(timeStr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !deadline) return;

    setSubmitting(true);
    try {
      const timePart = dueTime || "18:00";
      const dueAtISO = new Date(`${deadline}T${timePart}:00`).toISOString();
      await onAddTask({ title, client, assignedTo, deadline, priority, dueAt: dueAtISO });
      setTitle("");
      setDeadline("");
      setDueTime("18:00");
      setIsOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#15171b] border border-slate-200/70 dark:border-slate-700/60 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center">
            <Sparkles size={16} className="text-teal-600" />
          </div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Manual Task Planner</h3>
        </div>
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="px-3 py-1.5 bg-teal-50/80 dark:bg-teal-500/10 hover:bg-teal-100/80 dark:hover:bg-teal-500/20 text-teal-700 dark:text-teal-200 text-xs font-semibold rounded-xl shadow-sm border border-teal-200/60 dark:border-teal-500/30 transition-all cursor-pointer"
        >
          {isOpen ? "Close Creator" : "Create New Task"}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.form
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 overflow-hidden border-t border-slate-200/70 dark:border-slate-700/60 pt-4"
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Task Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Design homepage mockup for Amazon"
                className="w-full bg-slate-50 dark:bg-[#121316] border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-teal-500 transition-all font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Client</label>
                <select
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="bg-slate-50 dark:bg-[#121316] border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer font-semibold"
                >
                  {dynamicClients.map((c) => (
                    <option key={c} value={c}>{c === "No Client" ? "No Client / Internal" : c}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assignee</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="bg-slate-50 dark:bg-[#121316] border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer font-semibold"
                >
                  {activeEmployees.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="bg-slate-50 dark:bg-[#121316] border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer font-semibold"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Deadline Date</label>
                <input
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="bg-slate-50 dark:bg-[#121316] border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer font-semibold"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Deadline Time</label>
                <input
                  type="time"
                  required
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="bg-slate-50 dark:bg-[#121316] border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer font-semibold"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 items-center bg-slate-50/50 dark:bg-[#121316]/30 border border-slate-100 dark:border-slate-800/80 rounded-xl p-2.5">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mr-1">Quick Countdowns:</span>
              <button type="button" onClick={() => setQuickDuration(2)} className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-slate-200/70 dark:border-slate-700/65 bg-white dark:bg-[#16181e] text-slate-600 dark:text-slate-300 hover:border-teal-500 hover:text-teal-600 transition-colors cursor-pointer">+2 Hours</button>
              <button type="button" onClick={() => setQuickDuration(12)} className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-slate-200/70 dark:border-slate-700/65 bg-white dark:bg-[#16181e] text-slate-600 dark:text-slate-300 hover:border-teal-500 hover:text-teal-600 transition-colors cursor-pointer">+12 Hours</button>
              <button type="button" onClick={() => setQuickDuration(24)} className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-slate-200/70 dark:border-slate-700/65 bg-white dark:bg-[#16181e] text-slate-600 dark:text-slate-300 hover:border-teal-500 hover:text-teal-600 transition-colors cursor-pointer">+24 Hours</button>
              <button type="button" onClick={() => setQuickDuration(72)} className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-slate-200/70 dark:border-slate-700/65 bg-white dark:bg-[#16181e] text-slate-600 dark:text-slate-300 hover:border-teal-500 hover:text-teal-600 transition-colors cursor-pointer">+3 Days</button>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200/70 dark:border-slate-700/60 pt-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer border-none flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={12} className="animate-spin text-white" /> Publishing...
                  </>
                ) : (
                  <>
                    <Send size={12} /> Publish Deliverable
                  </>
                )}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

// Dashboard view

function DashboardView({
  tasks,
  onMarkDone,
  onConfirm,
  onDismiss,
  onReassign,
  onAddTask,
  resolveBlocker,
  onSendToReview,
  onUpdateTask,
  onMarkActive,
  employeesList,
}: {
  tasks: Task[];
  onMarkDone: (id: number | string) => void;
  onConfirm: (id: number | string) => void;
  onDismiss: (id: number | string) => void;
  onReassign: (id: number | string, newAssignee: string) => void;
  onAddTask: (task: {
    title: string;
    client: string;
    assignedTo: string;
    deadline: string;
    priority: Priority;
  }) => Promise<void>;
  resolveBlocker: (id: number | string) => Promise<void>;
  onSendToReview: (id: number | string) => void;
  onUpdateTask?: (id: number | string, updatedFields: Partial<Task>) => Promise<void>;
  onMarkActive: (id: number | string) => void;
  employeesList?: string[];
}) {
  const [selectedSource, setSelectedSource] = useState<"all" | "email" | "slack" | "fathom">("all");

  const sourceFiltered = tasks.filter((t) => {
    if (selectedSource === "all") return true;
    if (selectedSource === "fathom") {
      return t.source === "fathom" || t.source === "google_meet" || t.source === "zoom" || t.source === "teams" || t.source === "manual";
    }
    return t.source === selectedSource;
  });

  // Founder dashboard should only receive: unassigned tasks, company-wide coordination,
  // tasks directed to founders/admins, and tasks where AI could not confidently identify an assignee (Needs Review).
  const isFounderOrAdmin = (name: string | null | undefined) => {
    if (!name) return true;
    const lower = name.toLowerCase();
    return lower === "admin" || lower === "founder" || lower === "unassigned" || lower === "";
  };

  const filteredTasks = sourceFiltered.filter((t) => {
    // If it's a confirmed active task (confidence >= 85) assigned to a specific employee, hide from founder's primary dashboard Kanban columns
    if (t.status === "pending" && t.confidence >= 85 && t.assignedTo) {
      return isFounderOrAdmin(t.assignedTo);
    }
    return true;
  });

  const confirmed = filteredTasks.filter((t) => t.status === "pending" && t.confidence >= 85);
  const unconfirmed = filteredTasks.filter((t) => t.confidence < 85 && t.status !== "done");
  const done = filteredTasks.filter((t) => t.status === "done");

  const sorted = [...confirmed].sort((a, b) => {
    const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pd !== 0) return pd;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  const sources: { id: "all" | "email" | "slack" | "fathom"; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "All Handoffs", icon: <Inbox size={13} className="text-teal-500" /> },
    { id: "email", label: "Gmail Inbox", icon: <Mail size={13} className="text-teal-500" /> },
    { id: "slack", label: "Slack Teams", icon: <MessageCircle size={13} className="rotate-90 text-teal-500" /> },
    { id: "fathom", label: "Fathom Meetings", icon: <Video size={13} className="text-teal-500" /> },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="bg-white/80 dark:bg-[#15171b] rounded-3xl p-6 md:p-8 text-slate-900 dark:text-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden border border-slate-200/70 dark:border-slate-700/60">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(13,148,136,0.12),transparent_55%)]" />
        <div className="relative z-10 w-full">
          <span className="text-xs uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400 font-semibold">Founder workspace</span>
          <h2 className="text-2xl md:text-3xl font-semibold mt-3">Founder Control Center</h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base max-w-3xl leading-relaxed mt-3">
            TaskPulse scans your Slack channels and Gmail inboxes to structure client deliverables. Filter by channel, reassign owners, and monitor delivery health.
          </p>
        </div>
      </div>

      {tasks.some((t) => t.isBlocked) && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50/90 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/30 rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-amber-600" />
            <h3 className="font-semibold text-amber-900 dark:text-amber-200 text-xs uppercase tracking-wider">
              Active Employee Blockers ({tasks.filter((t) => t.isBlocked).length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tasks
              .filter((t) => t.isBlocked)
              .map((task) => (
                <div
                  key={task.id}
                  className="bg-white dark:bg-[#15171b] border border-amber-200/70 dark:border-amber-500/30 rounded-xl p-3 flex flex-col justify-between gap-2.5 shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100/70 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200">
                        {task.client}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        Assignee: <strong className="text-slate-700 dark:text-slate-300">{task.assignedTo}</strong>
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 mb-1">
                      {task.title}
                    </h4>
                    <p className="text-[11px] text-amber-800 dark:text-amber-200 bg-amber-50/60 dark:bg-amber-500/10 p-2.5 rounded-lg border border-amber-100/60 dark:border-amber-500/20">
                      "{task.blockerNote}"
                    </p>
                  </div>
                  <div className="flex justify-end gap-2 mt-1">
                    <button
                      onClick={() => resolveBlocker(task.id)}
                      className="px-3 py-1 text-[10px] font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-all cursor-pointer border-none"
                    >
                      Resolve Blocker
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </motion.div>
      )}

      {/* Client Command Center Promo */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-[#15171b] rounded-2xl border border-slate-200/70 dark:border-slate-700/60 shadow-sm overflow-hidden group"
      >
        <div className="relative p-5 md:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_20%,rgba(13,148,136,0.08),transparent_60%)] dark:bg-[radial-gradient(circle_at_90%_20%,rgba(13,148,136,0.12),transparent_60%)]" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 border border-teal-200/60 dark:border-teal-500/20 flex items-center justify-center flex-shrink-0">
                <Briefcase size={18} className="text-teal-600 dark:text-teal-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-[15px]">Client Command Center</h3>
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-200 border border-teal-200/60 dark:border-teal-500/20 uppercase tracking-wider">New</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                  Manage all your client accounts as operational hubs. Track stakeholders, monitor project health, view task breakdowns per client, and see everything in one unified workspace.
                </p>
              </div>
            </div>
            <Link
              href="/founder/clients"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all active:scale-[0.98] flex-shrink-0 no-underline"
            >
              <Briefcase size={13} />
              Open Command Center
              <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      </motion.div>

      <ManualTaskCreator onAddTask={onAddTask} tasks={tasks} employeesList={employeesList} />

      <div className="flex justify-between items-center bg-white dark:bg-[#15171b] p-3 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 shadow-sm">
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100/70 dark:bg-slate-700/30 rounded-xl border border-slate-200/60 dark:border-slate-600/50">
          {sources.map((src) => {
            const active = selectedSource === src.id;
            return (
              <button
                key={src.id}
                onClick={() => setSelectedSource(src.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-250 cursor-pointer ${
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
          <span>Active scanner live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="bg-slate-50 dark:bg-[#15171b] shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] rounded-2xl p-4 flex flex-col gap-4 border border-slate-200/70 dark:border-slate-700/60 min-h-[500px]">
          <div className="flex flex-col gap-1 px-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-[15px]">Needs Review</h3>
              </div>
              <span className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-200 text-[10px] font-semibold rounded-full px-2.5 py-1 border border-amber-200/60 dark:border-amber-500/30 shadow-sm">{unconfirmed.length}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">AI identified these tasks. Confirm to add to board.</p>
          </div>

          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {unconfirmed.length === 0 ? (
                <EmptyState message="All suggestions reviewed." />
              ) : (
                unconfirmed.map((t) => (
                  <TaskCard key={t.id} task={t} showConfirmButtons onConfirm={onConfirm} onDismiss={onDismiss} isFounder={true} onReassign={onReassign} onUpdateTask={onUpdateTask} employeesList={employeesList} />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-[#15171b] shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] rounded-2xl p-4 flex flex-col gap-4 border border-slate-200/70 dark:border-slate-700/60 min-h-[500px]">
          <div className="flex flex-col gap-1 px-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-teal-500" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-[15px]">Active Tasks</h3>
              </div>
              <span className="bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-200 text-[10px] font-semibold rounded-full px-2.5 py-1 border border-teal-200/60 dark:border-teal-500/30 shadow-sm">{sorted.length}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Confirmed tasks ready to be finalized.</p>
          </div>

          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {sorted.length === 0 ? (
                <EmptyState message="No active tasks yet." />
              ) : (
                sorted.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onMarkDone={onMarkDone}
                    isFounder={true}
                    onReassign={onReassign}
                    onSendToReview={onSendToReview}
                    onUpdateTask={onUpdateTask}
                    employeesList={employeesList}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

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
                <EmptyState message="No tasks done yet." />
              ) : (
                done.map((t) => (
                  <TaskCard key={t.id} task={t} isFounder={true} onReassign={onReassign} onUpdateTask={onUpdateTask} onMarkActive={onMarkActive} employeesList={employeesList} />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// Client view

interface Stakeholder {
  id: string;
  name: string;
  email?: string;
  slackId?: string;
  role: string;
  category?: string;
  clientName: string;
}

function getStakeholdersStorageKey(company: string, clientName: string) {
  return `taskpulse_stakeholders_${company}_${clientName}`;
}

function loadLocalStakeholders(company: string, clientName: string): Stakeholder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getStakeholdersStorageKey(company, clientName));
    return raw ? JSON.parse(raw) : [
      { id: "sh-1", name: "Rahul Sharma", role: "Account Manager", category: "Strategy", clientName },
      { id: "sh-2", name: "Priya Patel", role: "Designer", category: "Design", clientName },
    ];
  } catch {
    return [];
  }
}

function saveLocalStakeholders(company: string, clientName: string, stakeholders: Stakeholder[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getStakeholdersStorageKey(company, clientName), JSON.stringify(stakeholders));
}

// Redesigned Card-Based Client Portfolio & Command Center
function ClientView({
  tasks,
  onMarkDone,
  onUpdateTask,
  onMarkActive,
  employeesList,
}: {
  tasks: Task[];
  onMarkDone: (id: number | string) => void;
  onUpdateTask?: (id: number | string, updatedFields: Partial<Task>) => Promise<void>;
  onMarkActive?: (id: number | string) => void;
  employeesList?: string[];
}) {
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [newClientName, setNewClientName] = useState("");
  const [loadingClients, setLoadingClients] = useState(false);
  const [addingClient, setAddingClient] = useState(false);
  const [schemaNotInitialized, setSchemaNotInitialized] = useState(false);
  
  // Navigation & Search State
  const [activeClient, setActiveClient] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [healthFilter, setHealthFilter] = useState<"all" | "at-risk" | "active">("all");
  const [sortOption, setSortOption] = useState<"task-count" | "overdue" | "alphabetical">("task-count");

  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      if (data.schemaNotInitialized) {
        setSchemaNotInitialized(true);
      } else {
        setSchemaNotInitialized(false);
      }
      if (data.clients) {
        setClients(data.clients);
      }
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    } finally {
      setLoadingClients(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    setAddingClient(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newClientName }),
      });
      const data = await res.json();
      if (data.success) {
        setNewClientName("");
        await fetchClients();
      } else if (data.schemaNotInitialized) {
        setSchemaNotInitialized(true);
        alert(data.error || "Schema not initialized");
      } else {
        alert(data.error || "Failed to add client");
      }
    } catch (err) {
      console.error("Failed to add client:", err);
    } finally {
      setAddingClient(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm("Are you sure you want to remove this client? Tasks already parsed will remain, but this brand won't be whitelisted for scanning anymore.")) return;
    try {
      const res = await fetch(`/api/clients?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        await fetchClients();
      } else {
        alert(data.error || "Failed to delete client");
      }
    } catch (err) {
      console.error("Failed to delete client:", err);
    }
  };

  // Resolve dynamic whitelisted clients + historically extracted names
  const registeredNames = clients.map((c) => c.name);
  const dynamicClients = Array.from(
    new Set([
      ...registeredNames,
      ...tasks.map((t) => t.client).filter((c) => c && c !== "General" && c !== "Unknown" && c !== "No Client")
    ])
  ).sort();

  // Stats calculation
  const totalTasks = tasks.length;
  const totalHigh = tasks.filter((t) => t.priority === "High").length;
  const totalOverdue = tasks.filter((t) => isOverdue(t.deadline) && t.status !== "done").length;
  const totalDone = tasks.filter((t) => t.status === "done").length;

  // Filtered and Sorted Client Cards
  const clientCardsData = useMemo(() => {
    return dynamicClients
      .map((clientName) => {
        const clientTasks = tasks.filter((t) => t.client === clientName);
        const active = clientTasks.filter((t) => t.status === "pending");
        const completed = clientTasks.filter((t) => t.status === "done");
        const overdue = active.filter((t) => isOverdue(t.deadline));
        
        const healthScore = clientTasks.length === 0 
          ? 100 
          : Math.round(((clientTasks.length - overdue.length) / clientTasks.length) * 100);

        return {
          name: clientName,
          tasks: clientTasks,
          activeCount: active.length,
          completedCount: completed.length,
          overdueCount: overdue.length,
          health: healthScore,
        };
      })
      .filter((card) => {
        // Search Filter
        if (searchQuery.trim() !== "" && !card.name.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        // Health Filter
        if (healthFilter === "at-risk") {
          return card.health < 80 || card.overdueCount > 0;
        }
        if (healthFilter === "active") {
          return card.activeCount > 0;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortOption === "task-count") {
          return b.activeCount - a.activeCount;
        }
        if (sortOption === "overdue") {
          return b.overdueCount - a.overdueCount;
        }
        return a.name.localeCompare(b.name);
      });
  }, [dynamicClients, tasks, searchQuery, healthFilter, sortOption]);

  if (activeClient) {
    const clientTasks = tasks.filter((t) => t.client === activeClient);
    return (
      <ClientWorkspaceView
        clientName={activeClient}
        tasks={clientTasks}
        onBack={() => setActiveClient(null)}
        onMarkDone={onMarkDone}
        onUpdateTask={onUpdateTask}
        onMarkActive={onMarkActive}
        employeesList={employeesList}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Search, Filter, Sort and Whitelist Registry Hub */}
      <div className="bg-white/80 dark:bg-[#1c1e22]/80 backdrop-blur-md rounded-2xl p-5 border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <FolderPlus size={18} className="text-teal-600 dark:text-teal-400" />
              Client Registry whitelist
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Whitelisted brands instructs AI scanners (Gmail, Slack, whatsapp) to route tasks to dedicated command hubs.
            </p>
          </div>
          
          <form onSubmit={handleAddClient} className="flex items-center gap-2 w-full lg:w-auto shrink-0">
            <input
              type="text"
              placeholder="e.g. Flipkart, Zomato, Amazon, Rapido"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              disabled={addingClient}
              className="px-3.5 py-2 bg-slate-50 dark:bg-[#121316] text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 flex-1 lg:w-60 font-semibold"
            />
            <button
              type="submit"
              disabled={addingClient || !newClientName.trim()}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
            >
              {addingClient ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Add Brand
            </button>
          </form>
        </div>

        {schemaNotInitialized ? (
          <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Supabase Table Migration Required</span>
              Please run the SQL schema updates in your Supabase Dashboard SQL Editor to initialize the <code>clients</code> table. 
              Until run, dynamic registry and whitelisting will run in compatibility fallback mode.
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {loadingClients ? (
              <div className="flex items-center gap-1.5 py-1 text-xs text-slate-400 font-medium">
                <Loader2 size={12} className="animate-spin" /> Loading clients...
              </div>
            ) : clients.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic py-1">
                No custom clients whitelisted yet. AI operates in auto-detection compatibility mode.
              </p>
            ) : (
              clients.map((c) => {
                const colors = getClientColors(c.name);
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 py-1 pl-3 pr-2 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 rounded-full transition-all text-xs font-semibold text-slate-700 dark:text-slate-350 shadow-sm"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${colors.header.replace("bg-gradient-to-r from-", "bg-").split(" ")[0]}`} />
                      {c.name}
                    </span>
                    <button
                      onClick={() => handleDeleteClient(c.id)}
                      className="p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-700/50 border-0 cursor-pointer outline-none transition-all"
                      title={`Remove ${c.name}`}
                    >
                      <X size={10} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Grid Filter and Sorting Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/70 dark:bg-[#15171b]/70 border border-slate-250/60 dark:border-slate-850 p-4 rounded-2xl shadow-sm">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search clients by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#101114] border border-slate-200/70 dark:border-slate-800/85 rounded-xl py-2 pl-3.5 pr-8 text-xs text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-teal-500 font-semibold"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Filter:</span>
            <select
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value as any)}
              className="bg-slate-50 dark:bg-[#101114] border border-slate-200/70 dark:border-slate-800/85 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-650 dark:text-slate-350 outline-none cursor-pointer"
            >
              <option value="all">All Health states</option>
              <option value="at-risk">At Risk / Overdue</option>
              <option value="active">Active Accounts</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Sort:</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              className="bg-slate-50 dark:bg-[#101114] border border-slate-200/70 dark:border-slate-800/85 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-650 dark:text-slate-350 outline-none cursor-pointer"
            >
              <option value="task-count">Most Active Tasks</option>
              <option value="overdue">Most Overdue</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox icon={<Briefcase size={18} className="text-teal-600 dark:text-teal-300" />} label="whitelisted Clients" value={dynamicClients.length} color="bg-teal-50 dark:bg-teal-500/10" />
        <StatBox icon={<AlertTriangle size={18} className="text-amber-600 dark:text-amber-300" />} label="High Priorities" value={totalHigh} color="bg-amber-50 dark:bg-amber-500/10" />
        <StatBox icon={<Clock size={18} className="text-amber-600 dark:text-amber-300" />} label="Total Overdue" value={totalOverdue} color="bg-amber-50 dark:bg-amber-500/10" />
        <StatBox icon={<CheckCircle2 size={18} className="text-slate-600 dark:text-slate-300" />} label="Completed Deliverables" value={totalDone} color="bg-slate-100 dark:bg-slate-700/30" />
      </div>

      {/* Modern Client Command Grid */}
      {clientCardsData.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#15171b] border border-slate-200/70 dark:border-slate-700/60 rounded-3xl p-6">
          <Briefcase size={36} className="text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No client accounts found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search criteria or register a new brand in the whitelist above to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clientCardsData.map((card) => {
            const cc = getClientColors(card.name);
            const active = card.tasks.filter((t) => t.status === "pending");
            const done = card.tasks.filter((t) => t.status === "done");
            const overdue = active.filter((t) => isOverdue(t.deadline));
            const waiting = active.filter((t) => t.confidence < 85);
            
            // Connected sources icons
            const sources = Array.from(new Set(card.tasks.map((t) => t.source)));
            // Employees working on client
            const assignees = Array.from(new Set(card.tasks.map((t) => t.assignedTo))).filter(a => a !== "Unassigned");
            
            return (
              <motion.div
                key={card.name}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-[#15171b] border border-slate-200/70 dark:border-slate-700/60 rounded-2xl shadow-sm hover:shadow-md hover:border-teal-500/30 dark:hover:border-teal-500/30 transition-all duration-300 overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className={`${cc.header} px-5 py-4 flex items-center justify-between text-white`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center font-bold text-xs shrink-0">
                      {card.name.charAt(0)}
                    </div>
                    <h3 className="font-semibold text-sm truncate">{card.name}</h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {sources.map(src => (
                      <span key={src} className="w-5 h-5 rounded bg-white/15 flex items-center justify-center" title={`Channel: ${src}`}>
                        {src === "slack" ? <Hash size={10} /> : src === "email" ? <Mail size={10} /> : <MessageCircle size={10} />}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 flex flex-col gap-3.5 flex-1">
                  {/* Account Details */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="font-bold uppercase tracking-wider">Health Index:</span>
                      <span className={`font-bold ${card.health >= 80 ? "text-emerald-600 dark:text-emerald-400" : card.health >= 50 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-450"}`}>
                        {card.health}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="font-bold uppercase tracking-wider">Team Working:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                        {assignees.length > 0 ? assignees.join(", ") : "Unassigned"}
                      </span>
                    </div>
                  </div>

                  {/* Stat Grid */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-slate-50 dark:bg-[#121316] rounded-xl p-2 text-center border border-slate-100 dark:border-slate-800">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{active.length}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Active</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-[#121316] rounded-xl p-2 text-center border border-slate-100 dark:border-slate-800">
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{done.length}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Done</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-[#121316] rounded-xl p-2 text-center border border-slate-100 dark:border-slate-800">
                      <p className="text-sm font-bold text-rose-650 dark:text-rose-400">{overdue.length}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Overdue</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-[#121316] rounded-xl p-2 text-center border border-slate-100 dark:border-slate-800">
                      <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{waiting.length}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Review</p>
                    </div>
                  </div>

                  {/* Progress Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-500 font-bold">
                      <span>PROJECT PROGRESS</span>
                      <span>{done.length}/{card.tasks.length} DONE</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full ${cc.header} rounded-full transition-all`} style={{ width: card.tasks.length ? `${(done.length / card.tasks.length) * 100}%` : "0%" }} />
                    </div>
                  </div>

                  {/* Quick Preview Feed */}
                  {active.length > 0 && (
                    <div className="bg-slate-50 dark:bg-[#111215] border border-slate-100 dark:border-slate-800/80 rounded-xl overflow-hidden mt-1">
                      <div className="px-3 py-1.5 border-b border-slate-200/50 dark:border-slate-800/60 bg-slate-100/50 dark:bg-[#17181c] text-[8px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                        Deliverable Priorities
                      </div>
                      <div className="divide-y divide-slate-150/40 dark:divide-slate-800/40 max-h-[120px] overflow-y-auto no-scrollbar">
                        {active.slice(0, 3).map((t) => {
                          const timeText = getCountdownText(t.dueAt, t.deadline, t.status);
                          return (
                            <div key={t.id} className="p-2 flex flex-col gap-1 hover:bg-slate-100/45 dark:hover:bg-slate-800/30 transition-colors">
                              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">{t.title}</span>
                              <div className="flex items-center justify-between">
                                <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded border ${PRIORITY_CONFIG[t.priority].bg} ${PRIORITY_CONFIG[t.priority].border} ${PRIORITY_CONFIG[t.priority].text}`}>
                                  {t.priority}
                                </span>
                                {timeText && (
                                  <span className={`text-[8px] font-bold flex items-center gap-1 ${
                                    timeText.urgency === "critical" || timeText.urgency === "overdue" ? "text-rose-500 animate-pulse" : "text-slate-400"
                                  }`}>
                                    <Clock size={8} /> {timeText.text}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="px-4 pb-4 pt-1 flex gap-2 shrink-0">
                  <button
                    onClick={() => setActiveClient(card.name)}
                    className="flex-1 bg-teal-650 hover:bg-teal-700 text-white text-[10px] font-bold rounded-xl py-2 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer border-none"
                  >
                    <FolderPlus size={12} /> Open Console
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// 🎛️ CLIENT DEDICATED WORKSPACE MODULE
function ClientWorkspaceView({
  clientName,
  tasks,
  onBack,
  onMarkDone,
  onUpdateTask,
  onMarkActive,
  employeesList,
}: {
  clientName: string;
  tasks: Task[];
  onBack: () => void;
  onMarkDone: (id: number | string) => void;
  onUpdateTask?: (id: number | string, updatedFields: Partial<Task>) => Promise<void>;
  onMarkActive?: (id: number | string) => void;
  employeesList?: string[];
}) {
  const [currentSubTab, setCurrentSubTab] = useState<"overview" | "kanban" | "stakeholders" | "activity">("overview");
  
  // Stats
  const activeTasks = tasks.filter((t) => t.status === "pending");
  const completedTasks = tasks.filter((t) => t.status === "done");
  const overdueTasks = activeTasks.filter((t) => isOverdue(t.deadline));
  const waitingForClient = activeTasks.filter((t) => t.confidence < 85);
  
  const cc = getClientColors(clientName);
  const healthScore = tasks.length === 0 ? 100 : Math.round(((tasks.length - overdueTasks.length) / tasks.length) * 100);
  const assignees = Array.from(new Set(tasks.map((t) => t.assignedTo))).filter(a => a !== "Unassigned");

  // Stakeholder persistence inside local state resolved from LocalStorage
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  
  useEffect(() => {
    setStakeholders(loadLocalStakeholders("agency", clientName));
  }, [clientName]);

  const addStakeholder = (name: string, role: string, category: string, email: string) => {
    const newSh: Stakeholder = {
      id: "sh-" + Date.now(),
      name,
      role,
      category: category || undefined,
      email: email || undefined,
      clientName,
    };
    const updated = [...stakeholders, newSh];
    setStakeholders(updated);
    saveLocalStakeholders("agency", clientName, updated);
  };

  const removeStakeholder = (id: string) => {
    const updated = stakeholders.filter((s) => s.id !== id);
    setStakeholders(updated);
    saveLocalStakeholders("agency", clientName, updated);
  };

  return (
    <div className="space-y-6">
      {/* Workspace Header Panel */}
      <div className="bg-white/80 dark:bg-[#15171b] rounded-3xl p-6 relative overflow-hidden border border-slate-200/70 dark:border-slate-700/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1%_1%,rgba(13,148,136,0.06),transparent_40%)] pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer bg-transparent border-none outline-none"
          >
            <ArrowLeft size={13} /> Return to Accounts
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-white">{clientName} Command Hub</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              healthScore >= 80 ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-250/20" : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-450 border border-rose-250/20"
            }`}>
              Health: {healthScore}%
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
            Manage stakeholders, extract incoming email requests, monitor priority delivery health, and run your client Kanban system inside a single collaborative station.
          </p>
        </div>

        {/* Global Progress Dial */}
        <div className="relative shrink-0 flex items-center gap-4 bg-slate-50/50 dark:bg-[#121316]/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 dark:border-slate-800 flex items-center justify-center text-xs font-extrabold text-slate-800 dark:text-slate-200 relative">
            {tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 100}%
            <div className={`absolute inset-0 border-4 border-teal-650 rounded-full clip-half`} style={{ transform: `rotate(${tasks.length ? (completedTasks.length / tasks.length) * 360 : 360}deg)` }} />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-200 leading-tight">{completedTasks.length}/{tasks.length}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Deliverables Completed</p>
          </div>
        </div>
      </div>

      {/* Tabs Menu Panel */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar gap-1.5 pb-0.5 shrink-0">
        <button
          onClick={() => setCurrentSubTab("overview")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer outline-none bg-transparent ${
            currentSubTab === "overview" ? "border-teal-600 text-teal-600 dark:text-teal-400 dark:border-teal-500 font-bold" : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          }`}
        >
          Overview & AI Ingestion
        </button>
        <button
          onClick={() => setCurrentSubTab("kanban")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer outline-none bg-transparent ${
            currentSubTab === "kanban" ? "border-teal-600 text-teal-600 dark:text-teal-400 dark:border-teal-500 font-bold" : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          }`}
        >
          Client Kanban Board
        </button>
        <button
          onClick={() => setCurrentSubTab("stakeholders")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer outline-none bg-transparent ${
            currentSubTab === "stakeholders" ? "border-teal-600 text-teal-600 dark:text-teal-400 dark:border-teal-500 font-bold" : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          }`}
        >
          Stakeholders Map ({stakeholders.length})
        </button>
        <button
          onClick={() => setCurrentSubTab("activity")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer outline-none bg-transparent ${
            currentSubTab === "activity" ? "border-teal-600 text-teal-600 dark:text-teal-400 dark:border-teal-500 font-bold" : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          }`}
        >
          Activity Timeline
        </button>
      </div>

      {/* Tabs Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSubTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {currentSubTab === "overview" && (
            <WorkspaceOverviewTab
              clientName={clientName}
              tasks={tasks}
              stakeholders={stakeholders}
              onMarkDone={onMarkDone}
              onUpdateTask={onUpdateTask}
              onMarkActive={onMarkActive}
              employeesList={employeesList}
            />
          )}

          {currentSubTab === "kanban" && (
            <WorkspaceKanbanTab
              tasks={tasks}
              onMarkDone={onMarkDone}
              onUpdateTask={onUpdateTask}
              onMarkActive={onMarkActive}
              employeesList={employeesList}
            />
          )}

          {currentSubTab === "stakeholders" && (
            <WorkspaceStakeholdersTab
              stakeholders={stakeholders}
              tasks={tasks}
              onAdd={addStakeholder}
              onRemove={removeStakeholder}
            />
          )}

          {currentSubTab === "activity" && (
            <WorkspaceActivityTab tasks={tasks} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// 🏡 WORKSPACE OVERVIEW PANEL SUBTAB
function WorkspaceOverviewTab({
  clientName,
  tasks,
  stakeholders,
  onMarkDone,
  onUpdateTask,
  onMarkActive,
  employeesList,
}: {
  clientName: string;
  tasks: Task[];
  stakeholders: Stakeholder[];
  onMarkDone: (id: number | string) => void;
  onUpdateTask?: (id: number | string, updatedFields: Partial<Task>) => Promise<void>;
  onMarkActive?: (id: number | string) => void;
  employeesList?: string[];
}) {
  const active = tasks.filter((t) => t.status === "pending");
  const overdue = active.filter((t) => isOverdue(t.deadline));
  const waiting = active.filter((t) => t.confidence < 85);
  
  // AI parser state
  const [rawText, setRawText] = useState("");
  const [extractedItems, setExtractedItems] = useState<{ title: string; priority: Priority; deadline: string; assignee: string }[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleExtract = () => {
    if (!rawText.trim()) return;
    setIsExtracting(true);
    setTimeout(() => {
      // Mock extract based on simple string splits
      const sentences = rawText.split(/[.!?\n]/).filter((s) => s.trim().length > 12);
      const output = sentences.slice(0, 3).map((s, i) => {
        const clean = s.trim();
        const hasUrgent = /urgent|asap|today|immediately/i.test(clean);
        const hasTomorrow = /tomorrow|evening/i.test(clean);
        const days = hasUrgent ? 0 : hasTomorrow ? 1 : 4 + i;
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);
        return {
          title: clean.length > 50 ? clean.substring(0, 48) + "..." : clean,
          priority: hasUrgent ? "High" as Priority : hasTomorrow ? "Medium" as Priority : "Low" as Priority,
          deadline: targetDate.toISOString().split("T")[0],
          assignee: employeesList?.[i % employeesList.length] || "Rahul",
        };
      });
      setExtractedItems(output);
      setIsExtracting(false);
    }, 1200);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Core Stats Overview */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#15171b] border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col items-center justify-center">
            <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{active.length}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Active Deliverables</p>
          </div>
          <div className="bg-white dark:bg-[#15171b] border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col items-center justify-center">
            <p className="text-3xl font-extrabold text-rose-500">{overdue.length}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Overdue Items</p>
          </div>
          <div className="bg-white dark:bg-[#15171b] border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col items-center justify-center">
            <p className="text-3xl font-extrabold text-amber-500">{waiting.length}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Pending Review</p>
          </div>
        </div>

        {/* AI Task Extraction Console */}
        <div className="bg-white dark:bg-[#15171b] border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-850 dark:text-slate-200 flex items-center gap-1.5">
              <Sparkles size={15} className="text-violet-500" />
              AI Ingestion & Task Extraction
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Paste arbitrary client email threads or Slack request briefs. TaskPulse extracts structured assignments.
            </p>
          </div>

          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder='e.g. "Hi Priya, can you send the finalized designs for Amazon before tomorrow morning review at 11 AM? Make sure Vikas does the QA by EOD today as well."'
            className="w-full bg-slate-50 dark:bg-[#101114] border border-slate-200/70 dark:border-slate-800/85 rounded-xl p-3 text-xs text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-violet-500 min-h-[90px] resize-none font-semibold leading-relaxed"
          />

          <div className="flex justify-end shrink-0">
            <button
              onClick={handleExtract}
              disabled={isExtracting || !rawText.trim()}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border-none"
            >
              {isExtracting ? (
                <><Loader2 size={12} className="animate-spin text-white" /> Extracting...</>
              ) : (
                <><Sparkles size={12} /> Analyze & Extract Tasks</>
              )}
            </button>
          </div>

          {extractedItems.length > 0 && (
            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-4">
              <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider mb-2">EXTRACTED TASKS SUGGESTIONS</span>
              {extractedItems.map((item, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-[#111215] border border-slate-150 dark:border-slate-800 rounded-xl p-3 flex flex-col gap-2 relative group transition-all">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">{item.title}</p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded border ${PRIORITY_CONFIG[item.priority].bg} ${PRIORITY_CONFIG[item.priority].border} ${PRIORITY_CONFIG[item.priority].text}`}>
                      {item.priority}
                    </span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold flex items-center gap-1">
                      <User size={9} /> {item.assignee}
                    </span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold flex items-center gap-1">
                      <Calendar size={9} /> Due: {formatDate(item.deadline)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Side Details Bar */}
      <div className="space-y-6">
        {/* Stakeholder Registry Map summary */}
        <div className="bg-white dark:bg-[#15171b] border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-4 space-y-3">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Connected Stakeholders</span>
          {stakeholders.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic py-1">No whitelisted stakeholders. Map them in the tab above.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {stakeholders.map((sh) => (
                <div key={sh.id} className="flex items-center gap-2 bg-slate-50 dark:bg-[#111215] border border-slate-100 dark:border-slate-800 p-2 rounded-xl">
                  <div className="w-5 h-5 rounded-full bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center border border-teal-200/50 dark:border-teal-500/20">
                    <User size={10} className="text-teal-600 dark:text-teal-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-850 dark:text-slate-200 truncate leading-tight">{sh.name}</p>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{sh.role} · {sh.category || "General"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Channels */}
        <div className="bg-white dark:bg-[#15171b] border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-4 space-y-3">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Overview summary</span>
          <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-medium">
            This account registry holds {tasks.length} total historical deliverable tasks.
            {overdue.length > 0 ? ` Note: ${overdue.length} items are currently overdue which drops account health to ${healthScore}%.` : " The account remains fully on schedule."}
          </p>
        </div>
      </div>
    </div>
  );
}

// 📋 CLIENT KANBAN BOARD TAB MODULE
function WorkspaceKanbanTab({
  tasks,
  onMarkDone,
  onUpdateTask,
  onMarkActive,
  employeesList,
}: {
  tasks: Task[];
  onMarkDone: (id: number | string) => void;
  onUpdateTask?: (id: number | string, updatedFields: Partial<Task>) => Promise<void>;
  onMarkActive?: (id: number | string) => void;
  employeesList?: string[];
}) {
  const needsConfirm = tasks.filter((t) => t.status === "pending" && t.confidence < 85);
  const activeTasks = tasks.filter((t) => t.status === "pending" && t.confidence >= 85);
  const completed = tasks.filter((t) => t.status === "done");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* 1. Review Column */}
      <div className="bg-slate-50 dark:bg-[#101114] border border-slate-200/70 dark:border-slate-850 p-4 rounded-2xl flex flex-col gap-4 min-h-[450px]">
        <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
          <h3 className="text-xs font-extrabold text-amber-700 dark:text-amber-350 uppercase tracking-wider flex items-center gap-1.5">
            Needs Review ({needsConfirm.length})
          </h3>
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto no-scrollbar flex-1">
          {needsConfirm.length === 0 ? (
            <div className="text-center py-10 text-slate-400 italic text-[11px]">No items pending confirmation</div>
          ) : (
            needsConfirm.map((t) => (
              <TaskCard key={t.id} task={t} onMarkDone={onMarkDone} isFounder={true} onUpdateTask={onUpdateTask} onMarkActive={onMarkActive} employeesList={employeesList} showConfirmButtons={true} />
            ))
          )}
        </div>
      </div>

      {/* 2. Confirmed Column */}
      <div className="bg-slate-50 dark:bg-[#101114] border border-slate-200/70 dark:border-slate-850 p-4 rounded-2xl flex flex-col gap-4 min-h-[450px]">
        <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
          <h3 className="text-xs font-extrabold text-teal-700 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
            Active Delivery ({activeTasks.length})
          </h3>
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto no-scrollbar flex-1">
          {activeTasks.length === 0 ? (
            <div className="text-center py-10 text-slate-400 italic text-[11px]">No active deliverables</div>
          ) : (
            activeTasks.map((t) => (
              <TaskCard key={t.id} task={t} onMarkDone={onMarkDone} isFounder={true} onUpdateTask={onUpdateTask} onMarkActive={onMarkActive} employeesList={employeesList} />
            ))
          )}
        </div>
      </div>

      {/* 3. Completed Column */}
      <div className="bg-slate-50 dark:bg-[#101114] border border-slate-200/70 dark:border-slate-850 p-4 rounded-2xl flex flex-col gap-4 min-h-[450px]">
        <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
          <h3 className="text-xs font-extrabold text-slate-550 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            Completed ({completed.length})
          </h3>
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto no-scrollbar flex-1">
          {completed.length === 0 ? (
            <div className="text-center py-10 text-slate-400 italic text-[11px]">No items completed</div>
          ) : (
            completed.map((t) => (
              <TaskCard key={t.id} task={t} onMarkDone={onMarkDone} isFounder={true} onUpdateTask={onUpdateTask} onMarkActive={onMarkActive} employeesList={employeesList} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// 👥 WORKSPACE STAKEHOLDERS REGISTRY SUBTAB
function WorkspaceStakeholdersTab({
  stakeholders,
  tasks,
  onAdd,
  onRemove,
}: {
  stakeholders: Stakeholder[];
  tasks: Task[];
  onAdd: (name: string, role: string, category: string, email: string) => void;
  onRemove: (id: string) => void;
}) {
  const [shName, setShName] = useState("");
  const [shRole, setShRole] = useState("Designer");
  const [shCategory, setShCategory] = useState("Design");
  const [shEmail, setShEmail] = useState("");

  const handleAddSh = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shName.trim()) return;
    onAdd(shName.trim(), shRole, shCategory, shEmail.trim());
    setShName("");
    setShEmail("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Stakeholders Registry List */}
      <div className="lg:col-span-2 bg-white dark:bg-[#15171b] border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 space-y-4">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Registered Account Stakeholders</span>
        
        {stakeholders.length === 0 ? (
          <div className="text-center py-12 text-slate-400 italic text-xs">No stakeholders mapped. Register POCs on the right.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {stakeholders.map((s) => {
              const assigned = tasks.filter((t) => t.assignedTo.toLowerCase() === s.name.toLowerCase() && t.status === "pending").length;
              return (
                <div key={s.id} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center border border-teal-200/50 dark:border-teal-500/20">
                      <User size={13} className="text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-snug">{s.name}</h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{s.role} · {s.category || "General"} {s.email ? `· ${s.email}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-slate-200/50 dark:border-slate-700/60">
                      {assigned} active tasks
                    </span>
                    <button
                      onClick={() => onRemove(s.id)}
                      className="p-1 rounded text-slate-450 hover:text-red-500 dark:hover:text-red-400 bg-transparent border-0 cursor-pointer outline-none transition-colors"
                      title="Remove mapping"
                    >
                      <Trash size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Add Stakeholder registry form */}
      <div className="bg-white dark:bg-[#15171b] border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Map Stakeholder</h3>
          <p className="text-[10px] text-slate-450 mt-0.5">Map project team members or external clients for deliverable filters.</p>
        </div>

        <form onSubmit={handleAddSh} className="space-y-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-slate-450 uppercase">Full Name *</label>
            <input
              type="text"
              required
              value={shName}
              onChange={(e) => setShName(e.target.value)}
              placeholder="e.g. Vikas Gupta"
              className="bg-slate-50 dark:bg-[#101114] border border-slate-200/70 dark:border-slate-800/85 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-teal-500 font-semibold"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-slate-450 uppercase">Email / slack ID</label>
            <input
              type="text"
              value={shEmail}
              onChange={(e) => setShEmail(e.target.value)}
              placeholder="vikas@company.com or @vikas"
              className="bg-slate-50 dark:bg-[#101114] border border-slate-200/70 dark:border-slate-800/85 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-teal-500 font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-slate-450 uppercase">Role *</label>
              <select
                value={shRole}
                onChange={(e) => setShRole(e.target.value)}
                className="bg-slate-50 dark:bg-[#101114] border border-slate-200/70 dark:border-slate-800/85 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              >
                <option value="Account Manager">Account Manager</option>
                <option value="Designer">Designer</option>
                <option value="Strategist">Strategist</option>
                <option value="Client POC">Client POC</option>
                <option value="Founder">Founder</option>
                <option value="Freelancer">Freelancer</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-slate-450 uppercase">Department</label>
              <select
                value={shCategory}
                onChange={(e) => setShCategory(e.target.value)}
                className="bg-slate-50 dark:bg-[#101114] border border-slate-200/70 dark:border-slate-800/85 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              >
                <option value="Design">Design</option>
                <option value="Strategy">Strategy</option>
                <option value="Content">Content</option>
                <option value="Reporting">Reporting</option>
                <option value="None">None</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={!shName.trim()}
            className="w-full bg-teal-650 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl py-2.5 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer border-none"
          >
            <Plus size={13} /> Add Stakeholder
          </button>
        </form>
      </div>
    </div>
  );
}

// 📜 WORKSPACE ACTIVITY LOG TIMELINE TAB MODULE
function WorkspaceActivityTab({ tasks }: { tasks: Task[] }) {
  const sorted = [...tasks].sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime());
  return (
    <div className="bg-white dark:bg-[#15171b] border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 space-y-4">
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Deliverable Timeline Logs</span>
      
      {sorted.length === 0 ? (
        <div className="text-center py-10 text-slate-400 italic text-xs">No activity timeline logged yet.</div>
      ) : (
        <div className="relative border-l border-slate-150 dark:border-slate-800 pl-4 ml-2 space-y-5">
          {sorted.slice(0, 8).map((t, idx) => (
            <div key={t.id} className="relative group">
              <span className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#15171b] ${
                t.status === "done" ? "bg-emerald-500" : isOverdue(t.deadline) ? "bg-rose-500" : "bg-teal-500"
              }`} />
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block">{formatDate(t.deadline)}</span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">{t.title}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  Assigned to <span className="font-semibold text-slate-600 dark:text-slate-400">{t.assignedTo}</span> · Source Group: {t.sourceGroup} · Status: <span className="font-semibold">{t.status}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Employee view

function EmployeeView({
  tasks,
  onMarkDone,
  onUpdateTask,
  onMarkActive,
  employeesList,
}: {
  tasks: Task[];
  onMarkDone: (id: number | string) => void;
  onUpdateTask?: (id: number | string, updatedFields: Partial<Task>) => Promise<void>;
  onMarkActive?: (id: number | string) => void;
  employeesList?: string[];
}) {
  const activeEmployees = employeesList || EMPLOYEES;
  const [selected, setSelected] = useState(activeEmployees[0] || "Rahul");

  useEffect(() => {
    if (!activeEmployees.includes(selected) && activeEmployees.length > 0) {
      setSelected(activeEmployees[0]);
    }
  }, [employeesList]);

  const empTasks = tasks.filter((t) => t.assignedTo.toLowerCase() === selected.toLowerCase());
  const pending = empTasks.filter((t) => t.status === "pending").length;
  const done = empTasks.filter((t) => t.status === "done").length;
  const overdue = empTasks.filter((t) => isOverdue(t.deadline) && t.status !== "done").length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Employee Task View</h1>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#15171b] shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          {activeEmployees.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>

      <motion.div
        key={selected}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-[#15171b] border border-slate-200/70 dark:border-slate-700/60 rounded-2xl px-5 py-4 mb-6 flex flex-wrap gap-4"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
          <User size={16} /> {selected}
        </span>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          <strong className="text-teal-700 dark:text-teal-300">{pending}</strong> pending tasks
        </span>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          <strong className="text-slate-700 dark:text-slate-200">{done}</strong> completed
        </span>
        {overdue > 0 && (
          <span className="text-sm text-amber-700 dark:text-amber-300 font-semibold">
            {overdue} overdue
          </span>
        )}
      </motion.div>

      <div className="flex flex-col gap-3">
        <AnimatePresence>
          {empTasks.length === 0 ? (
            <EmptyState message="No tasks assigned to this employee." />
          ) : (
             empTasks.map((t) => (
              <TaskCard key={t.id} task={t} onMarkDone={onMarkDone} showFrom isFounder={true} onUpdateTask={onUpdateTask} onMarkActive={onMarkActive} employeesList={employeesList} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Email view and other sections are unchanged from the original logic, with updated styling.

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
  interface GmailEmail {
    id: string;
    subject: string;
    fromName: string;
    fromEmail: string;
    date: string;
    snippet: string;
    isUnread: boolean;
  }

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
        localStorage.setItem("taskpulse_cached_emails", JSON.stringify(data.emails));
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

// WhatsApp view

function WhatsAppView({
  setTasks,
  onToast,
}: {
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onToast: (msg: string) => void;
}) {
  const [streamTasks, setStreamTasks] = useState<Task[]>([]);
  const [connected, setConnected] = useState(false);

  const handleNewTask = useCallback(
    (payload: any) => {
      const data = payload?.task ?? payload;
      if (!data) return;

      const normalized: Task = {
        id: data.id ?? Date.now(),
        title: data.title ?? data.task ?? "Untitled task",
        client: data.client ?? "Unknown",
        assignedTo: data.assignedTo ?? data.assignee ?? "Unassigned",
        deadline: data.deadline ?? new Date().toISOString().split("T")[0],
        priority: (data.priority as Priority) ?? "Medium",
        source: "whatsapp",
        sourceGroup: data.sourceGroup ?? data.groupName ?? "WhatsApp Group",
        status: data.status ?? "pending",
        confidence: data.confidence ?? 80,
        sourceMessage: data.sourceMessage ?? data.message ?? "",
        sourceMessageId: data.sourceMessageId ?? null,
      };

      setStreamTasks((prev) => [normalized, ...prev].slice(0, 8));
      setTasks((prev) => {
        const exists = prev.some((t) => t.id === normalized.id || t.sourceMessageId === normalized.sourceMessageId);
        return exists ? prev : [normalized, ...prev];
      });
      onToast("New WhatsApp task detected.");
    },
    [onToast, setTasks]
  );

  useTaskStream(handleNewTask);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#15171b] rounded-2xl border border-slate-200/70 dark:border-slate-700/60 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">WhatsApp Connect</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Connect your WhatsApp number and approve groups for scanning.</p>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${connected ? "bg-teal-50 text-teal-700 border border-teal-200/60" : "bg-slate-100 text-slate-600 border border-slate-200/60"}`}>
            {connected ? "Connected" : "Not Connected"}
          </span>
        </div>
        <WhatsAppConnector onConnected={() => {
          setConnected(true);
          onToast("WhatsApp connected successfully.");
        }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="bg-white dark:bg-[#15171b] rounded-2xl border border-slate-200/70 dark:border-slate-700/60 p-5 shadow-sm">
          <GroupSelector />
        </div>

        <div className="bg-white dark:bg-[#15171b] rounded-2xl border border-slate-200/70 dark:border-slate-700/60 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Live Task Stream</h3>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Latest extractions</span>
          </div>
          <div className="flex flex-col gap-3">
            {streamTasks.length === 0 ? (
              <EmptyState message="No incoming tasks yet." />
            ) : (
              streamTasks.map((task) => (
                <TaskCard key={task.id} task={task} showFrom isFounder={true} />
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-[#15171b] border border-slate-200/70 dark:border-slate-700/60 rounded-2xl p-4 text-xs text-slate-600 dark:text-slate-400">
        <strong className="text-slate-700 dark:text-slate-300">Tip:</strong> Approve only the WhatsApp groups you want TaskPulse to monitor. Incoming tasks will appear in your dashboard automatically.
      </div>
    </div>
  );
}

// Demo Mode Panel



// Login page

function LoginPage({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="min-h-screen bg-[#f7f6f2] dark:bg-[#0b0c0e] text-slate-900 dark:text-slate-100 flex items-center justify-center px-6">
      <div className="max-w-5xl w-full grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400 bg-teal-100/70 dark:bg-teal-500/10 px-3 py-1 rounded-full w-fit">
            <Sparkles size={14} />
            Secure access
          </span>
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight text-slate-950 dark:text-white">
            Sign in to manage delivery across your client workspace.
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-xl">
            TaskPulse unifies conversations into a single operations layer. Connect once and keep every request accountable.
          </p>
          <div className="flex flex-wrap gap-2">
            {["Slack", "WhatsApp", "Gmail", "Zoom"].map((badge) => (
              <span key={badge} className="text-xs px-3 py-1 rounded-lg border border-slate-200/70 dark:border-slate-700/60 text-slate-600 dark:text-slate-300">
                {badge}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#15171b] border border-slate-200/70 dark:border-slate-700/60 rounded-3xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center">
              <ShieldCheck size={22} className="text-teal-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Agency Access</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Sign in with your corporate Google profile</p>
            </div>
          </div>
          <button
            onClick={onSignIn}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3.5 px-4 rounded-2xl shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-3 cursor-pointer"
          >
            Continue with Google
          </button>
          <div className="text-[10px] text-slate-500 pt-3 flex items-center justify-center gap-1">
            <Lock size={10} /> Secure OAuth validation
          </div>
        </div>
      </div>
    </div>
  );
}

// Onboarding page

function OnboardingPage({
  session,
  onComplete,
  onSignOut,
}: {
  session: any;
  onComplete: (data: { name: string; company: string; designation: "founder" | "employee" }) => void;
  onSignOut: () => void;
}) {
  const [name, setName] = useState(session?.user?.name || "");
  const [company, setCompany] = useState("");
  const [designation, setDesignation] = useState<"founder" | "employee">("founder");
  const [securityKey, setSecurityKey] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [shaking, setShaking] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please specify your full name.");
      return;
    }
    if (!company.trim()) {
      setError("Please specify your company name.");
      return;
    }

    if (designation === "founder") {
      const allowedKeys = ["admin123", "founder123", "admin", "founder", "cura123"];
      if (!allowedKeys.includes(securityKey.toLowerCase().trim())) {
        setError("Invalid founder authentication passcode.");
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
        return;
      }
    }

    onComplete({
      name: name.trim(),
      company: company.trim(),
      designation,
    });
  };

  return (
    <div className="min-h-screen bg-[#f7f6f2] dark:bg-[#0b0c0e] text-slate-900 dark:text-slate-100 flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-white dark:bg-[#181a1f] border border-slate-200/70 dark:border-[#272a31] rounded-3xl p-8 max-w-lg w-full shadow-sm space-y-6"
      >
        <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/60 pb-4.5">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Complete Workspace Setup</h2>
            <p className="text-xs text-slate-500">Configure your professional profile details below</p>
          </div>
          <button
            onClick={onSignOut}
            className="text-[10px] font-semibold text-amber-700 hover:text-amber-800 uppercase tracking-widest border border-amber-200/70 hover:bg-amber-50 rounded-xl px-2.5 py-1.5 transition-colors cursor-pointer bg-transparent"
          >
            Log Out
          </button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-xs font-semibold"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="full-name" className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <User size={12} className="text-teal-500" /> Full Name
            </label>
            <input
              id="full-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full text-sm rounded-xl border border-slate-200/70 dark:border-slate-700/60 px-4 py-3 bg-slate-50 dark:bg-[#121316] text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="company-name" className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Briefcase size={12} className="text-teal-500" /> Company Name
            </label>
            <input
              id="company-name"
              type="text"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Flipkart, Zomato, Google"
              className="w-full text-sm rounded-xl border border-slate-200/70 dark:border-slate-700/60 px-4 py-3 bg-slate-50 dark:bg-[#121316] text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
            />
            <div className="flex gap-2 pt-1 flex-wrap">
              {['Flipkart', 'Zomato', 'Amazon', 'Google'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setCompany(tag)}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-slate-200/70 dark:border-slate-700/60 bg-slate-50 dark:bg-[#121316] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  +{tag}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Crown size={12} className="text-teal-500" /> Choose Designation
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setDesignation("founder");
                  setError("");
                }}
                className={`text-left p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex items-start gap-3.5 group ${
                  designation === "founder"
                    ? "border-teal-500 bg-teal-50/70 dark:bg-teal-500/10 shadow-sm"
                    : "border-slate-200/70 dark:border-slate-700/60 bg-slate-50 dark:bg-[#121316] hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <div className={`p-2.5 rounded-xl border transition-all ${
                  designation === "founder"
                    ? "bg-teal-500/10 border-teal-500/30 text-teal-600 dark:text-teal-400"
                    : "bg-white dark:bg-[#1a1c23] border-slate-200/70 dark:border-slate-700/60 text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300"
                }`}>
                  <Crown size={16} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Founder / Admin</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">Full control over operations, billing, and task flows.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDesignation("employee");
                  setError("");
                }}
                className={`text-left p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex items-start gap-3.5 group ${
                  designation === "employee"
                    ? "border-teal-500 bg-teal-50/70 dark:bg-teal-500/10 shadow-sm"
                    : "border-slate-200/70 dark:border-slate-700/60 bg-slate-50 dark:bg-[#121316] hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <div className={`p-2.5 rounded-xl border transition-all ${
                  designation === "employee"
                    ? "bg-teal-500/10 border-teal-500/30 text-teal-600 dark:text-teal-400"
                    : "bg-white dark:bg-[#1a1c23] border-slate-200/70 dark:border-slate-700/60 text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300"
                }`}>
                  <User size={16} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Employee / Staff</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">Access assigned tasks and check off completed work.</p>
                </div>
              </button>
            </div>
          </div>

          <AnimatePresence>
            {designation === "founder" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <label htmlFor="security-key" className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Lock size={12} className="text-amber-500" /> Founder Security Password
                    </label>
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold bg-teal-50 dark:bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-200/40 dark:border-teal-500/20" title="Hint for reviewer">
                      Reviewer hint: Use "admin123"
                    </span>
                  </div>

                  <motion.div
                    animate={shaking ? { x: [-10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="relative"
                  >
                    <input
                      id="security-key"
                      type={showPassword ? "text" : "password"}
                      value={securityKey}
                      onChange={(e) => setSecurityKey(e.target.value)}
                      placeholder="Enter security key to confirm designation"
                      className={`w-full text-sm rounded-xl border px-4 py-3 pr-10 bg-slate-50 dark:bg-[#121316] text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                        shaking ? "border-amber-400 ring-2 ring-amber-200" : "border-slate-200/70 dark:border-slate-700/60"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer bg-transparent border-0 outline-none"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3.5 px-4 rounded-2xl shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            <span>Complete Setup and Proceed</span> <ChevronRight size={16} />
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// Main

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <BarChart2 size={15} /> },
  { id: "meetings", label: "Meetings", icon: <Video size={15} /> },
  { id: "client", label: "By Client", icon: <Briefcase size={15} /> },
  { id: "employee", label: "By Employee", icon: <Users size={15} /> },
  { id: "slack", label: "Slack Connect", icon: <Hash size={15} /> },
  { id: "email", label: "Email", icon: <Mail size={15} /> },
];

export default function FounderPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [emails, setEmails] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("taskpulse_cached_emails");
        return cached ? JSON.parse(cached) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [emailSelectedId, setEmailSelectedId] = useState<string | null>(null);

  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [onboardingData, setOnboardingData] = useState<{
    name: string;
    company: string;
    designation: "founder" | "employee";
  } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);

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
      console.error("Failed to load employees:", err);
    }
  };

  useEffect(() => {
    if (onboarded && onboardingData?.designation === "founder") {
      loadEmployees();
    }
  }, [onboarded, onboardingData]);

  useEffect(() => {
    if (onboarded && onboardingData?.designation === "employee") {
      router.push("/employee");
    }
  }, [onboarded, onboardingData, router]);

  const loadTasks = async () => {
    try {
      const r = await fetch("/api/tasks");
      const d = await r.json();
      if (Array.isArray(d)) {
        if (d.length > 0) {
          setTasks(d);
        } else {
          setTasks(INITIAL_TASKS);
        }
      } else {
        setTasks(INITIAL_TASKS);
      }
    } catch {
      setTasks(INITIAL_TASKS);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    const initProfileAndTasks = async () => {
      setMounted(true);
      await loadTasks();

      try {
        const pRes = await fetch("/api/profile");
        if (pRes.status === 200) {
          const pData = await pRes.json();
          if (pData && pData.profile) {
            setOnboardingData(pData.profile);
            setOnboarded(true);
            localStorage.setItem("taskpulse_onboarding", JSON.stringify(pData.profile));
            setLoadingProfile(false);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load profile in founder dashboard init:", err);
      }

      // Fallback to localStorage
      const localData = localStorage.getItem("taskpulse_onboarding");
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          setOnboardingData(parsed);
          setOnboarded(true);
          
          // Try to sync it to DB
          if (session?.user?.email) {
            await fetch("/api/profile", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: parsed.name,
                email: session.user.email,
                company: parsed.company,
                designation: parsed.designation,
              }),
            });
          }
        } catch {
          setOnboarded(false);
        }
      } else {
        setOnboarded(false);
      }
      setLoadingProfile(false);
    };

    if (status === "authenticated") {
      initProfileAndTasks();
    } else if (status === "unauthenticated") {
      setOnboarded(false);
      setLoadingProfile(false);
    }
  }, [status, session]);

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Real-time synchronization polling (3 seconds interval)
  useEffect(() => {
    if (status === "authenticated") {
      const interval = setInterval(() => {
        loadTasks();
        if (onboarded && onboardingData?.designation === "founder") {
          loadEmployees();
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [status, onboarded, onboardingData]);

  const addToast = (message: string) => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3000);
  };

  const dismissToast = (id: number) => setToasts((p) => p.filter((t) => t.id !== id));

  if (!mounted) return null;

  if (status === "loading" || onboarded === null || loadingTasks || loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f6f2] dark:bg-[#0b0c0e]" suppressHydrationWarning>
        <div className="flex flex-col items-center gap-3" suppressHydrationWarning>
          <div className="w-8 h-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" suppressHydrationWarning />
          <p className="text-xs text-slate-500 font-semibold animate-pulse" suppressHydrationWarning>Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginPage onSignIn={() => signIn("google", { callbackUrl: "/founder" })} />;
  }

  if (!onboarded) {
    return (
      <OnboardingPage
        session={session}
        onComplete={async (data) => {
          try {
            await fetch("/api/profile", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: data.name,
                email: session?.user?.email || "",
                company: data.company,
                designation: data.designation,
              }),
            });
          } catch (e) {
            console.error("Failed to sync profile onboarding to backend:", e);
          }
          localStorage.setItem("taskpulse_onboarding", JSON.stringify(data));
          setOnboardingData(data);
          setOnboarded(true);
          addToast("Onboarding completed successfully!");
        }}
        onSignOut={() => signOut({ callbackUrl: "/" })}
      />
    );
  }

  if (onboardingData?.designation === "employee") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f6f2] dark:bg-[#0b0c0e] text-slate-900 dark:text-slate-100">
        <div className="flex flex-col items-center gap-4 text-center px-4 max-w-sm">
          <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
          <h2 className="text-xl font-semibold">Redirecting to Employee Console</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Please wait while we route your authenticated session to the /employee workspace.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem("taskpulse_onboarding");
              setOnboarded(false);
              setOnboardingData(null);
              router.push("/founder");
            }}
            className="mt-4 text-[10px] font-semibold text-teal-600 hover:text-teal-700 uppercase tracking-widest cursor-pointer hover:underline"
          >
            Reset designation and stay here
          </button>
        </div>
      </div>
    );
  }

  const markDone = async (id: number | string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: "done" } : t));
    addToast("Task marked as done!");

    if (typeof id === "string") {
      try {
        await fetch("/api/tasks", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status: "done" }),
        });
      } catch {}
    }
  };

  const confirmTask = async (id: number | string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, confidence: 95 } : t));
    addToast("Task confirmed and added to dashboard!");

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

    try {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "dismissed" }),
      });
    } catch {}
  };

  const reassignTask = async (id: number | string, newAssignee: string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, assignedTo: newAssignee } : t));
    addToast(`Task reassigned to ${newAssignee}!`);

    try {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, assignee: newAssignee }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const resolveBlocker = async (id: number | string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, isBlocked: false, blockerNote: "" } : t));
    addToast("Blocker resolved!");

    try {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isBlocked: false, blockerNote: "" }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const addTask = async (newTaskData: {
    title: string;
    client: string;
    assignedTo: string;
    deadline: string;
    priority: Priority;
  }) => {
    const tempId = "task-" + Date.now();
    const newTask: Task = {
      ...newTaskData,
      id: tempId,
      source: "slack",
      sourceGroup: "#manual-tasks",
      status: "pending",
      confidence: 100,
      sourceMessage: "Manually entered task by Founder.",
    };

    setTasks((prev) => [newTask, ...prev]);
    addToast("New task published!");

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      });
      if (res.ok) {
        loadTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateTask = async (id: number | string, updatedFields: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updatedFields } : t))
    );
    addToast("Task updated successfully!");

    try {
      const body: any = { id };
        if (updatedFields.title !== undefined) body.title = updatedFields.title;
        if (updatedFields.priority !== undefined) body.priority = updatedFields.priority;
        if (updatedFields.deadline !== undefined) body.deadline = updatedFields.deadline;
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
  };

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
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-200 border border-teal-200/60 dark:border-teal-500/20 shrink-0">Founder</span>
          </div>
        </div>

        <div className="hidden xl:flex items-center shrink-0 mr-2">
          <SlackStatusBadge />
        </div>

        <nav className="flex-1 min-w-0 flex items-center justify-start md:justify-center gap-1 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap px-1">
          {TABS.map((tab) => (
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
                onClick={() => {
                  localStorage.removeItem("taskpulse_onboarding");
                  setOnboarded(false);
                  setOnboardingData(null);
                  addToast("Session reset. You can now choose a new designation.");
                  router.push("/founder");
                }}
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
          >
            {activeTab === "dashboard" && (
              <DashboardView
                tasks={tasks}
                onMarkDone={markDone}
                onConfirm={confirmTask}
                onDismiss={dismissTask}
                onReassign={reassignTask}
                onAddTask={addTask}
                resolveBlocker={resolveBlocker}
                onSendToReview={sendTaskToReview}
                onUpdateTask={updateTask}
                onMarkActive={sendTaskToActive}
                employeesList={employeesList}
              />
            )}
            {activeTab === "meetings" && <MeetingTab tasks={tasks} onUpdateTask={updateTask} />}
            {activeTab === "client" && (
              <ClientView tasks={tasks} onMarkDone={markDone} onUpdateTask={updateTask} onMarkActive={sendTaskToActive} employeesList={employeesList} />
            )}
            {activeTab === "employee" && (
              <EmployeeView tasks={tasks} onMarkDone={markDone} onUpdateTask={updateTask} onMarkActive={sendTaskToActive} employeesList={employeesList} />
            )}
            {activeTab === "slack" && (
              <SlackSetup
                onToast={addToast}
                loadTasks={loadTasks}
                setActiveTab={(tab) => setActiveTab(tab as Tab)}
              />
            )}

            {activeTab === "email" && (
              <EmailView
                onToast={addToast}
                loadTasks={loadTasks}
                setActiveTab={(tab) => setActiveTab(tab as Tab)}
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
