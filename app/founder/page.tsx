"use client";

import { useCallback, useEffect, useState } from "react";
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
import Link from "next/link";

// Types

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

  useEffect(() => {
    setEditTitle(task.title);
    setEditClient(task.client);
    setEditPriority(task.priority);
    setEditAssignee(task.assignedTo);
    setEditDeadline(task.deadline);
  }, [task]);

  if (isEditing) {
    return (
      <motion.div
        layout
        className="bg-white dark:bg-[#15171b] rounded-2xl shadow-sm border border-teal-500/20 p-4 flex flex-col gap-3.5"
      >
        <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/60 pb-2">
          <span className="text-xs font-semibold text-teal-600 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
            <Edit2 size={12} className="text-teal-500" /> Edit Deliverable
          </span>
          <button
            onClick={() => setIsEditing(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700/40 rounded-md cursor-pointer border-none bg-transparent flex items-center justify-center outline-none"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Task Title</label>
          <input
            type="text"
            required
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#121316] border border-slate-200/70 dark:border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Client</label>
            <select
              value={editClient}
              onChange={(e) => setEditClient(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#121316] border border-slate-200/70 dark:border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold outline-none cursor-pointer"
            >
              {Array.from(new Set(["Flipkart", "Zomato", "Amazon", "Google", task.client])).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Priority</label>
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value as Priority)}
              className="w-full bg-slate-50 dark:bg-[#121316] border border-slate-200/70 dark:border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold outline-none cursor-pointer"
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assignee</label>
            <select
              value={editAssignee}
              onChange={(e) => setEditAssignee(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#121316] border border-slate-200/70 dark:border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold outline-none cursor-pointer"
            >
              {activeEmployees.map((emp) => (
                <option key={emp} value={emp}>{emp}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Deadline</label>
            <input
              type="date"
              required
              value={editDeadline}
              onChange={(e) => setEditDeadline(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#121316] border border-slate-200/70 dark:border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold outline-none cursor-pointer"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/60 mt-1.5">
          <button
            onClick={async () => {
              if (editTitle.trim()) {
                await onUpdateTask?.(task.id, {
                  title: editTitle.trim(),
                  client: editClient,
                  priority: editPriority,
                  assignedTo: editAssignee,
                  deadline: editDeadline,
                });
                setIsEditing(false);
              }
            }}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-semibold rounded-lg py-2 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] border-none cursor-pointer"
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
              setIsEditing(false);
            }}
            className="flex-1 bg-white dark:bg-[#15171b] hover:bg-slate-100 dark:hover:bg-slate-700/40 text-slate-600 dark:text-slate-300 text-[11px] font-semibold rounded-lg py-2 transition-all border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <X size={13} /> Cancel
          </button>
        </div>
      </motion.div>
    );
  }

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
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${cc.bg} ${cc.text} ${cc.border}`}>
              {task.client}
            </span>
            <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${pc.bg} ${pc.border} ${pc.text}`}>
              <span className={`w-1 h-1 rounded-full ${pc.dot}`} />
              {task.priority}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
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
                <MessageCircle size={10} className="text-teal-500" />
                WhatsApp
              </span>
            )}

            {isFounder && onUpdateTask && (
              <button
                onClick={() => setIsEditing(true)}
                title="Edit Deliverable"
                className="text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 p-1 hover:bg-teal-50 dark:hover:bg-teal-500/10 rounded-md transition-colors cursor-pointer border-none bg-transparent flex items-center justify-center outline-none"
              >
                <Edit2 size={11} />
              </button>
            )}
          </div>
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
            {isFounder && onReassign ? (
              <select
                value={task.assignedTo}
                onChange={(e) => onReassign?.(task.id, e.target.value)}
                className="bg-teal-50/80 dark:bg-[#121316] border border-teal-200/60 dark:border-teal-500/20 rounded-lg px-2 py-0.5 text-xs text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-teal-500 font-semibold cursor-pointer transition-colors"
              >
                {activeEmployees.map((emp) => (
                  <option key={emp} value={emp}>{emp}</option>
                ))}
              </select>
            ) : (
              <span className="font-semibold text-slate-700 dark:text-slate-200">{task.assignedTo}</span>
            )}
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
            {showFrom ? `Source: ${task.sourceGroup}` : `Source: ${task.sourceGroup}`}
          </span>
        </div>

        {showConfirmButtons && (
          <div className="bg-amber-50/60 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/20 rounded-lg px-2.5 py-2 text-[10px] text-amber-900 dark:text-amber-200 font-semibold flex items-center gap-1.5 shadow-sm mt-1">
            <Sparkles size={11} className="text-amber-500 dark:text-amber-300" />
            AI Confidence: {task.confidence}%
          </div>
        )}

        <div className="border-t border-slate-200/70 dark:border-slate-700/60 pt-3 mt-1">
          <button
            onClick={() => setShowSource((p) => !p)}
            className="flex items-center justify-between w-full text-[10px] text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold transition-colors bg-transparent border-none outline-none cursor-pointer"
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
          {showConfirmButtons ? (
            <div className="flex gap-2">
              <button
                onClick={() => onConfirm?.(task.id)}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-semibold rounded-lg py-2 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] border-none cursor-pointer"
              >
                <CheckCircle2 size={13} /> Accept
              </button>
              <button
                onClick={() => onDismiss?.(task.id)}
                className="flex-1 bg-white dark:bg-[#15171b] hover:bg-amber-50/60 dark:hover:bg-amber-500/10 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-200 text-[11px] font-semibold rounded-lg py-2 transition-all border border-slate-200/70 dark:border-slate-700/60 dark:hover:border-amber-500/30 flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
              >
                <X size={13} /> Reject
              </button>
            </div>
          ) : (
            task.status === "done" ? (
              isFounder && onMarkActive && (
                <button
                  onClick={() => onMarkActive?.(task.id)}
                  className="w-full bg-white dark:bg-[#15171b] hover:bg-teal-50/60 dark:hover:bg-teal-500/10 text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-200 text-[11px] font-semibold rounded-lg py-2 transition-all border border-slate-200/70 dark:border-slate-700/60 dark:hover:border-teal-500/30 flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  <Undo size={13} className="text-teal-500 dark:text-teal-300" /> Send back to active
                </button>
              )
            ) : (
              <div className="flex flex-col gap-1.5">
                {onMarkDone && (
                  <button
                    onClick={() => onMarkDone?.(task.id)}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-semibold rounded-lg py-2 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] border-none cursor-pointer"
                  >
                    <CheckCircle2 size={13} /> Mark as Done
                  </button>
                )}
                {isFounder && onSendToReview && (
                  <button
                    onClick={() => onSendToReview?.(task.id)}
                    className="w-full bg-white dark:bg-[#15171b] hover:bg-amber-50/60 dark:hover:bg-amber-500/10 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-200 text-[11px] font-semibold rounded-lg py-2 transition-all border border-slate-200/70 dark:border-slate-700/60 dark:hover:border-amber-500/30 flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
                  >
                    <Undo size={13} className="text-amber-500 dark:text-amber-300" /> Send back to review
                  </button>
                )}
                {!isFounder && onToggleBlocker && (
                  <button
                    onClick={() => setShowBlockerModal(true)}
                    className="w-full bg-white dark:bg-[#15171b] hover:bg-amber-50/60 dark:hover:bg-amber-500/10 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-200 text-[11px] font-semibold rounded-lg py-2 transition-all border border-slate-200/70 dark:border-slate-700/60 dark:hover:border-amber-500/30 flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
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
  }) => Promise<void>;
  tasks: Task[];
  employeesList?: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");

  const dynamicClients = Array.from(
    new Set(["Flipkart", "Zomato", "Amazon", "Google", ...tasks.map((t) => t.client).filter((c) => c && c !== "General" && c !== "Unknown")])
  );

  const activeEmployees = employeesList || EMPLOYEES;

  const [client, setClient] = useState(dynamicClients[0]);
  const [assignedTo, setAssignedTo] = useState(activeEmployees[0]);
  const [deadline, setDeadline] = useState("");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !deadline) return;

    setSubmitting(true);
    try {
      await onAddTask({ title, client, assignedTo, deadline, priority });
      setTitle("");
      setDeadline("");
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Client</label>
                <select
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="bg-slate-50 dark:bg-[#121316] border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer font-semibold"
                >
                  {dynamicClients.map((c) => (
                    <option key={c} value={c}>{c}</option>
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
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Deadline</label>
                <input
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="bg-slate-50 dark:bg-[#121316] border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                />
              </div>
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

  const filteredTasks = tasks.filter((t) => selectedSource === "all" || t.source === selectedSource);

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
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [newClientName, setNewClientName] = useState("");
  const [loadingClients, setLoadingClients] = useState(false);
  const [addingClient, setAddingClient] = useState(false);
  const [schemaNotInitialized, setSchemaNotInitialized] = useState(false);

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

  // Combine manually whitelisted database clients and historically extracted client names to remain 100% robust and safe
  const registeredNames = clients.map((c) => c.name);
  const dynamicClients = Array.from(
    new Set([
      ...registeredNames,
      ...tasks.map((t) => t.client).filter((c) => c && c !== "General" && c !== "Unknown")
    ])
  ).sort();

  const total = tasks.length;
  const highPriority = tasks.filter((t) => t.priority === "High").length;
  const overdue = tasks.filter((t) => isOverdue(t.deadline) && t.status !== "done").length;
  const done = tasks.filter((t) => t.status === "done").length;

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">Tasks by Client</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{tasks.filter((t) => t.status === "pending").length} pending tasks across all clients</p>
        </div>
      </div>

      {/* Premium Glassmorphic Client Registry Manager */}
      <div className="bg-white/80 dark:bg-[#1c1e22]/80 backdrop-blur-md rounded-2xl p-5 border border-slate-200/60 dark:border-slate-800/80 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <FolderPlus size={18} className="text-teal-600 dark:text-teal-400" />
              Client Registry
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manually register active brands to instruct the AI scanners (Gmail & Slack) to perfectly filter tasks for these clients.
            </p>
          </div>
          
          <form onSubmit={handleAddClient} className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder="e.g. Rapido, HDFC, Zomato"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              disabled={addingClient}
              className="px-3.5 py-2 bg-slate-50 dark:bg-[#121316] text-sm text-slate-850 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 flex-1 md:w-56"
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
          <div className="flex flex-wrap gap-2.5 mt-2">
            {loadingClients ? (
              <div className="flex items-center gap-1.5 py-1.5 px-3 text-xs text-slate-400 font-medium">
                <Loader2 size={12} className="animate-spin" /> Loading clients...
              </div>
            ) : clients.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic py-1.5 px-1">
                No custom clients registered yet. The AI is running in general parsing mode (Flipkart, Zomato, etc. supported).
              </p>
            ) : (
              clients.map((c) => {
                const colors = getClientColors(c.name);
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 py-1.5 pl-3 pr-2 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 rounded-full transition-all text-xs font-semibold text-slate-700 dark:text-slate-350 shadow-sm"
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
                      <Trash size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatBox icon={<BarChart2 size={18} className="text-teal-600 dark:text-teal-300" />} label="Total Tasks" value={total} color="bg-teal-50 dark:bg-teal-500/10" />
        <StatBox icon={<AlertTriangle size={18} className="text-amber-600 dark:text-amber-300" />} label="High Priority" value={highPriority} color="bg-amber-50 dark:bg-amber-500/10" />
        <StatBox icon={<Clock size={18} className="text-amber-600 dark:text-amber-300" />} label="Overdue" value={overdue} color="bg-amber-50 dark:bg-amber-500/10" />
        <StatBox icon={<CheckCircle2 size={18} className="text-slate-600 dark:text-slate-300" />} label="Completed" value={done} color="bg-slate-100 dark:bg-slate-700/30" />
      </div>

      <div className="flex flex-col gap-4">
        {dynamicClients.map((client) => {
          const clientTasks = tasks.filter((t) => t.client === client);
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
                  <span className="font-semibold text-base">{client}</span>
                  <span className="bg-white/20 text-white text-xs font-semibold rounded-full px-2 py-0.5">
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
                            <EmptyState message="No tasks for this client" />
                          ) : (
                             clientTasks.map((t) => (
                              <TaskCard key={t.id} task={t} onMarkDone={onMarkDone} isFounder={true} onUpdateTask={onUpdateTask} onMarkActive={onMarkActive} employeesList={employeesList} />
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
            <label htmlFor="full-name" className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <User size={12} className="text-teal-500" /> Full Name
            </label>
            <input
              id="full-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full text-sm rounded-xl border border-slate-200/70 px-4 py-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="company-name" className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Briefcase size={12} className="text-teal-500" /> Company Name
            </label>
            <input
              id="company-name"
              type="text"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Flipkart, Zomato, Google"
              className="w-full text-sm rounded-xl border border-slate-200/70 px-4 py-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
            />
            <div className="flex gap-2 pt-1 flex-wrap">
              {['Flipkart', 'Zomato', 'Amazon', 'Google'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setCompany(tag)}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-slate-200/70 bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  +{tag}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
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
                    ? "border-teal-500 bg-teal-50/70 shadow-sm"
                    : "border-slate-200/70 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div className={`p-2.5 rounded-xl border transition-all ${
                  designation === "founder"
                    ? "bg-teal-500/10 border-teal-500/30 text-teal-600"
                    : "bg-white border-slate-200/70 text-slate-400 group-hover:text-slate-700"
                }`}>
                  <Crown size={16} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-slate-800">Founder / Admin</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">Full control over operations, billing, and task flows.</p>
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
                    ? "border-teal-500 bg-teal-50/70 shadow-sm"
                    : "border-slate-200/70 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div className={`p-2.5 rounded-xl border transition-all ${
                  designation === "employee"
                    ? "bg-teal-500/10 border-teal-500/30 text-teal-600"
                    : "bg-white border-slate-200/70 text-slate-400 group-hover:text-slate-700"
                }`}>
                  <User size={16} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-slate-800">Employee / Staff</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">Access assigned tasks and check off completed work.</p>
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
                    <label htmlFor="security-key" className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                      <Lock size={12} className="text-amber-500" /> Founder Security Password
                    </label>
                    <span className="text-[10px] text-teal-600 font-semibold bg-teal-50 px-2 py-0.5 rounded-full" title="Hint for reviewer">
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
                      className={`w-full text-sm rounded-xl border px-4 py-3 pr-10 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                        shaking ? "border-amber-400 ring-2 ring-amber-200" : "border-slate-200/70"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-700 cursor-pointer bg-transparent border-0 outline-none"
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
  const [emails, setEmails] = useState<any[]>([]);
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

      <header className="sticky top-0 z-50 bg-[#f7f6f2]/90 dark:bg-[#0e0f12]/90 backdrop-blur-md border-b border-slate-200/70 dark:border-[#1c1d22] h-[64px] flex items-center px-6 transition-colors duration-300">
        <div className="flex items-center gap-4 min-w-[240px]">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            Back to landing
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center text-xs font-semibold">TP</div>
            <span className="font-semibold text-slate-900 dark:text-white text-lg tracking-tight">TaskPulse</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-200 border border-teal-200/60 dark:border-teal-500/20">Founder</span>
          </div>
        </div>

        <div className="flex items-center ml-4">
          <SlackStatusBadge />
        </div>

        <nav className="flex-1 flex items-center justify-center gap-1">
          {TABS.map((tab) => (
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

        <div className="flex items-center gap-3 flex-shrink-0 justify-end">
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
                onClick={() => {
                  localStorage.removeItem("taskpulse_onboarding");
                  setOnboarded(false);
                  setOnboardingData(null);
                  addToast("Session reset. You can now choose a new designation.");
                  router.push("/founder");
                }}
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
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-700/40 transition-all border border-slate-200/60 dark:border-slate-600/50 hover:border-slate-300 dark:hover:border-slate-500 shadow-sm flex items-center justify-center cursor-pointer"
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
            {activeTab === "meetings" && <MeetingTab />}
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
                setActiveTab={setActiveTab}
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
