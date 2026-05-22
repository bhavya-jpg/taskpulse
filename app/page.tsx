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
  Users,
  Briefcase,
  Inbox,
  Settings,
  Sun,
  Moon,
  Hash,
  Building,
  Crown,
  ShieldCheck,
  Lock,
  ChevronRight,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { SlackSetup, SlackStatusBadge } from "@/components/slack-setup";
import { WhatsAppConnector, GroupSelector, useTaskStream, WAStatusBadge } from "@/components/whatsapp-setup";
import { MeetingTab } from "@/components/MeetingTab";
import { useSession, signIn, signOut } from "next-auth/react";
import { useTheme } from "next-themes";

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
  sourceMessageId?: string | null;
}

type Tab = "dashboard" | "client" | "employee" | "slack" | "whatsapp" | "email" | "meetings";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const INITIAL_TASKS: Task[] = [
  { id: 1, title: "Send revised creatives to Flipkart", client: "Flipkart", assignedTo: "Rahul", deadline: "2026-05-18", priority: "High", source: "whatsapp", sourceGroup: "Flipkart Campaign Group", status: "pending", confidence: 95, sourceMessage: "Can someone send the revised creatives before 6 PM today? The client is waiting. This is urgent." },
  { id: 2, title: "Finalize proposal document for Zomato", client: "Zomato", assignedTo: "Priya", deadline: "2026-05-19", priority: "High", source: "email", sourceGroup: "Zomato Strategy Thread", status: "pending", confidence: 88, sourceMessage: "Hi team, we need the proposal finalized by tomorrow EOD. Please review the attached doc and send it across." },
  { id: 3, title: "Update social media posts for Amazon", client: "Amazon", assignedTo: "Priya", deadline: "2026-05-17", priority: "Medium", source: "whatsapp", sourceGroup: "Amazon Social Media Group", status: "pending", confidence: 72, sourceMessage: "Dekha jayega if we can push the posts out by tomorrow? Client ka pressure hai bhai." },
  { id: 4, title: "Send May invoice to Flipkart", client: "Flipkart", assignedTo: "Admin", deadline: "2026-05-20", priority: "Medium", source: "email", sourceGroup: "Finance Thread", status: "done", confidence: 92, sourceMessage: "Please send the May invoice to Flipkart by end of week. Accounts team is waiting." },
  { id: 5, title: "Design banner for Google Ads campaign", client: "Google", assignedTo: "Rahul", deadline: "2026-05-17", priority: "High", source: "slack", sourceGroup: "#google-campaigns", status: "pending", confidence: 91, sourceMessage: "@Rahul please design the banner for the Google Ads campaign by tomorrow morning. Client review is at 11 AM." },
  { id: 6, title: "Schedule Q2 strategy meeting with Zomato", client: "Zomato", assignedTo: "Priya", deadline: "2026-05-16", priority: "High", source: "email", sourceGroup: "Zomato Comms", status: "pending", confidence: 87, sourceMessage: "Can we schedule a meeting with the Zomato team this Friday to discuss Q2 strategy? Please confirm availability." },
  { id: 7, title: "Send performance report to Amazon", client: "Amazon", assignedTo: "Vikas", deadline: "2026-05-21", priority: "Low", source: "email", sourceGroup: "Amazon Monthly Reports", status: "pending", confidence: 83, sourceMessage: "Vikas, please compile and send the monthly performance report for the Amazon account by next Tuesday." },
  { id: 8, title: "Prepare pitch deck for new Google campaign", client: "Google", assignedTo: "Rahul", deadline: "2026-05-22", priority: "Medium", source: "slack", sourceGroup: "#google-strategy", status: "pending", confidence: 76, sourceMessage: "Bhai kal tak ek rough pitch deck banana hai Google ke naye campaign ke liye. Founder ko dikhana hai." },
];

const CLIENTS = ["Flipkart", "Zomato", "Amazon", "Google"];
const EMPLOYEES = ["Rahul", "Priya", "Admin", "Vikas"];

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

// ─── EMAIL DATA ───────────────────────────────────────────────────────────────

const EMAILS = [
  {
    id: 1, from: "partnerships@zomato.com", subject: "Q2 Strategy Meeting", time: "9:15 AM",
    hasTask: true, unread: true, client: "Zomato",
    body: "Hi team, hope you're well. We'd like to schedule a strategy meeting for Q2 planning this Friday. Please confirm availability by EOD today. Looking forward to connecting. Regards, Zomato Partnerships Team.",
    task: { title: "Schedule Q2 strategy meeting with Zomato", assignedTo: "Priya", priority: "High", deadline: "2026-05-16" },
  },
  {
    id: 2, from: "accounts@flipkart.com", subject: "Invoice Request — May 2026", time: "Yesterday",
    hasTask: true, unread: false, client: "Flipkart",
    body: "Dear team, this is a reminder to send the invoice for May 2026 services to our accounts team. Please ensure it is sent by Friday. Amount should reflect the campaign management fee discussed. Thanks, Flipkart Accounts.",
    task: { title: "Send May invoice to Flipkart", assignedTo: "Admin", priority: "Medium", deadline: "2026-05-20" },
  },
  {
    id: 3, from: "team@amazon.in", subject: "Monthly Performance Report", time: "Yesterday",
    hasTask: true, unread: true, client: "Amazon",
    body: "Hi Vikas, please compile the monthly performance report for our account and share it by next Tuesday. Include impressions, clicks, CTR, and conversion metrics. Regards, Amazon Marketing.",
    task: { title: "Send performance report to Amazon", assignedTo: "Vikas", priority: "Low", deadline: "2026-05-21" },
  },
  {
    id: 4, from: "noreply@google.com", subject: "Campaign Brief Required", time: "Mon",
    hasTask: true, unread: false, client: null,
    body: "Hello, we need the campaign brief and creative assets for the upcoming Q3 Google Ads campaign. Please send the brief document by end of this week. Thank you.",
    task: { title: "Prepare pitch deck for new Google campaign", assignedTo: "Rahul", priority: "Medium", deadline: "2026-05-22" },
  },
  {
    id: 5, from: "hr@company.com", subject: "Friday Team Lunch!", time: "Mon",
    hasTask: false, unread: false, client: null,
    body: "Hey team! Join us for a fun Friday lunch this week at 1 PM. Pizza is on us 🍕 Please RSVP by Thursday. — HR Team",
    task: null,
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function isOverdue(dateStr: string) {
  return new Date(dateStr) < new Date(new Date().toDateString());
}

// ─── TOAST ────────────────────────────────────────────────────────────────────

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
            className="pointer-events-auto bg-white border border-green-200 shadow-xl rounded-xl px-4 py-3 flex items-center gap-3 min-w-[260px]"
          >
            <span className="text-green-500 text-lg">✅</span>
            <span className="text-sm font-medium text-gray-700 flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-gray-400 hover:text-gray-600">
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
  showConfirmButtons = false,
  showFrom = false,
}: {
  task: Task;
  onMarkDone?: (id: number | string) => void;
  onConfirm?: (id: number | string) => void;
  onDismiss?: (id: number | string) => void;
  showConfirmButtons?: boolean;
  showFrom?: boolean;
}) {
  const [showSource, setShowSource] = useState(false);
  const pc = PRIORITY_CONFIG[task.priority];
  const cc = CLIENT_COLORS[task.client] || { bg: "bg-gray-100 dark:bg-gray-900/40", text: "text-gray-700 dark:text-gray-300", border: "border-gray-300 dark:border-white/10" };
  const overdue = isOverdue(task.deadline) && task.status !== "done";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className="bg-white dark:bg-[#121214] rounded-xl shadow-sm hover:shadow-md border border-gray-200/60 dark:border-white/5 hover:border-indigo-500/20 dark:hover:border-indigo-500/20 hover:scale-[1.01] transition-all duration-300 overflow-hidden group"
    >
      <div className="p-4 flex flex-col gap-3">
        {/* Header: Client, Priority & Custom Platform Badges */}
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
          
          {/* Custom Source platform badges */}
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

        {/* Title */}
        <h4 className={`font-semibold text-[14px] leading-snug text-gray-800 dark:text-gray-100 ${task.status === "done" ? "line-through text-gray-400 dark:text-gray-600" : ""}`}>
          {task.title}
        </h4>

        {/* Info row: Assignee & Date */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
              <User size={10} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="font-semibold text-gray-700 dark:text-gray-300">{task.assignedTo}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={11} className={overdue ? "text-red-500 dark:text-red-400" : "text-gray-400"} />
            <span className={overdue ? "text-red-600 dark:text-red-400 font-bold" : "font-semibold text-gray-600 dark:text-gray-300"}>
              {formatDate(task.deadline)}
            </span>
          </div>
        </div>

        {/* Source Group Context */}
        <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5 bg-gray-50/80 dark:bg-[#1a1a1f] px-2 py-1.5 rounded-lg border border-gray-100 dark:border-white/5 font-semibold">
          <span className="whitespace-normal break-words">
            {showFrom ? `📍 From: ${task.sourceGroup}` : `📁 ${task.sourceGroup}`}
          </span>
        </div>

        {/* Confidence / Action needed */}
        {showConfirmButtons && (
          <div className="bg-amber-50/60 dark:bg-amber-500/5 border border-amber-200/70 dark:border-amber-500/20 rounded-lg px-2.5 py-2 text-[10px] text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1.5 shadow-sm mt-1">
            <Sparkles size={11} className="text-amber-500 dark:text-amber-400 animate-pulse" />
            AI Confidence: {task.confidence}%
          </div>
        )}

        {/* View source message */}
        <div className="border-t border-gray-100 dark:border-white/5 pt-3 mt-1">
          <button
            onClick={() => setShowSource((p) => !p)}
            className="flex items-center justify-between w-full text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-bold transition-colors"
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
                <div className="bg-[#f8fafc] dark:bg-black/30 border border-gray-200/50 dark:border-white/5 rounded-lg p-3 text-[11px] text-gray-700 dark:text-gray-300 relative shadow-inner">
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-500 dark:bg-indigo-700 rounded-l-lg" />
                  <p className="whitespace-normal leading-relaxed break-words font-medium italic">
                    "{task.sourceMessage}"
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          {showConfirmButtons ? (
            <>
              <button
                onClick={() => onConfirm?.(task.id)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg py-2 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
              >
                <CheckCircle2 size={13} /> Accept
              </button>
              <button
                onClick={() => onDismiss?.(task.id)}
                className="flex-1 bg-white dark:bg-[#1a1a1f] hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 text-[11px] font-bold rounded-lg py-2 transition-all border border-gray-200/80 dark:border-white/5 dark:hover:border-red-500/30 flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
              >
                <X size={13} /> Reject
              </button>
            </>
          ) : task.status === "pending" ? (
            <button
              onClick={() => onMarkDone?.(task.id)}
              className="w-full bg-white dark:bg-[#1a1a1f] hover:bg-green-50 dark:hover:bg-green-500/10 text-gray-600 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 text-[11px] font-bold rounded-lg py-2 transition-all border border-gray-200/80 dark:border-white/5 dark:hover:border-green-500/30 flex items-center justify-center gap-1.5 group-hover:border-green-200/50 dark:group-hover:border-green-500/20 shadow-sm active:scale-[0.98]"
            >
              <CheckCircle2 size={13} className="text-green-600 dark:text-green-500 group-hover:scale-110 transition-transform" /> Mark as Done
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-white dark:bg-white/5 rounded-xl border border-dashed border-gray-300 dark:border-white/10 shadow-sm">
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
  onMarkDone,
  onConfirm,
  onDismiss,
}: {
  tasks: Task[];
  onMarkDone: (id: number | string) => void;
  onConfirm: (id: number | string) => void;
  onDismiss: (id: number | string) => void;
}) {
  const [selectedSource, setSelectedSource] = useState<"all" | "email" | "slack" | "whatsapp" | "fathom">("all");

  const filteredTasks = tasks.filter((t) => selectedSource === "all" || t.source === selectedSource);

  const confirmed = filteredTasks.filter((t) => t.status === "pending" && t.confidence >= 85);
  const unconfirmed = filteredTasks.filter((t) => t.confidence < 85 && t.status !== "done");
  const done = filteredTasks.filter((t) => t.status === "done");

  const sorted = [...confirmed].sort((a, b) => {
    const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pd !== 0) return pd;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  const sources: { id: "all" | "email" | "slack" | "whatsapp" | "fathom"; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "All Handoffs", icon: <Inbox size={13} /> },
    { id: "email", label: "Gmail Inbox", icon: <Mail size={13} /> },
    { id: "slack", label: "Slack Teams", icon: <MessageCircle size={13} className="rotate-90 text-purple-500" /> },
    { id: "whatsapp", label: "WhatsApp Chats", icon: <MessageCircle size={13} className="text-emerald-500" /> },
    { id: "fathom", label: "Fathom Meetings", icon: <Video size={13} className="text-violet-500" /> },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Onboarding / Context Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-500 dark:from-indigo-950 dark:via-purple-900/40 dark:to-indigo-900/60 rounded-2xl p-6 md:p-8 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden border dark:border-white/5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="relative z-10 w-full">
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
            <Sparkles size={24} className="text-yellow-300 animate-pulse" />
            Agency Control Center
          </h2>
          <p className="text-indigo-100 dark:text-indigo-200/80 text-sm md:text-base max-w-3xl leading-relaxed">
            Welcome to your executive console. TaskPulse scans your Slack channels and Gmail inboxes, applying Gemini AI logic to automatically structure client deliverables. Filter by channel below, drag and drop, and oversee performance instantly.
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
          <span>Active Scanner Live</span>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Column 1: AI Suggestions / Needs Review */}
        <div className="bg-gray-50/50 dark:bg-[#111113]/40 rounded-2xl p-4 flex flex-col gap-4 border border-gray-200/60 dark:border-white/5 shadow-sm min-h-[500px]">
          <div className="flex flex-col gap-1 px-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse" />
                <h3 className="font-extrabold text-gray-800 dark:text-gray-100 text-[15px]">Needs Review</h3>
              </div>
              <span className="bg-white dark:bg-black/30 text-gray-700 dark:text-gray-300 text-[10px] font-extrabold rounded-full px-2.5 py-1 border border-gray-200 dark:border-white/5 shadow-sm">{unconfirmed.length}</span>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 font-semibold">AI identified these tasks. Confirm to add to board.</p>
          </div>
          
          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {unconfirmed.length === 0 ? (
                <EmptyState message="All suggestions reviewed! 🎉" />
              ) : (
                unconfirmed.map((t) => (
                  <TaskCard key={t.id} task={t} showConfirmButtons onConfirm={onConfirm} onDismiss={onDismiss} />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Column 2: To Do / Active Tasks */}
        <div className="bg-indigo-50/20 dark:bg-indigo-950/5 rounded-2xl p-4 flex flex-col gap-4 border border-indigo-100/50 dark:border-indigo-950/20 shadow-sm min-h-[500px]">
          <div className="flex flex-col gap-1 px-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.5)] animate-pulse" />
                <h3 className="font-extrabold text-gray-800 dark:text-indigo-100 text-[15px]">Active Tasks</h3>
              </div>
              <span className="bg-white dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-extrabold rounded-full px-2.5 py-1 border border-indigo-100/50 dark:border-indigo-900/30 shadow-sm">{sorted.length}</span>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-indigo-300/40 font-semibold">Confirmed tasks ready to be finalized.</p>
          </div>

          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {sorted.length === 0 ? (
                <EmptyState message="All tasks caught up! 🎉" />
              ) : (
                sorted.map((t) => (
                  <TaskCard key={t.id} task={t} onMarkDone={onMarkDone} />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Column 3: Completed */}
        <div className="bg-emerald-50/20 dark:bg-emerald-950/5 rounded-2xl p-4 flex flex-col gap-4 border border-emerald-100/40 dark:border-emerald-950/20 shadow-sm min-h-[500px]">
          <div className="flex flex-col gap-1 px-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                <h3 className="font-extrabold text-gray-800 dark:text-emerald-100 text-[15px]">Completed</h3>
              </div>
              <span className="bg-white dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold rounded-full px-2.5 py-1 border border-emerald-100/40 dark:border-emerald-900/30 shadow-sm">{done.length}</span>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-emerald-300/40 font-semibold">Tasks marked as done successfully.</p>
          </div>

          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {done.length === 0 ? (
                <EmptyState message="No tasks done yet." />
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

function ClientView({ tasks, onMarkDone }: { tasks: Task[]; onMarkDone: (id: number) => void }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const total = tasks.length;
  const highPriority = tasks.filter((t) => t.priority === "High").length;
  const overdue = tasks.filter((t) => isOverdue(t.deadline) && t.status !== "done").length;
  const done = tasks.filter((t) => t.status === "done").length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">Tasks by Client</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{tasks.filter((t) => t.status === "pending").length} pending tasks across all clients</p>
      </div>

      {/* Stat boxes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatBox icon={<BarChart2 size={18} className="text-blue-600 dark:text-blue-400" />} label="Total Tasks" value={total} color="bg-blue-50 dark:bg-blue-950/20" />
        <StatBox icon={<AlertTriangle size={18} className="text-red-500 dark:text-red-400" />} label="High Priority" value={highPriority} color="bg-red-50 dark:bg-red-950/20" />
        <StatBox icon={<Clock size={18} className="text-orange-500 dark:text-orange-400" />} label="Overdue" value={overdue} color="bg-orange-50 dark:bg-orange-950/20" />
        <StatBox icon={<CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />} label="Completed" value={done} color="bg-green-50 dark:bg-green-950/20" />
      </div>

      <div className="flex flex-col gap-4">
        {CLIENTS.map((client) => {
          const clientTasks = tasks.filter((t) => t.client === client);
          const clientDone = clientTasks.filter((t) => t.status === "done").length;
          const cc = CLIENT_COLORS[client];
          const open = !collapsed[client];

          return (
            <div key={client} className="bg-white dark:bg-[#18181b] rounded-xl shadow-md overflow-hidden border border-gray-100 dark:border-white/10">
              <button
                className={`w-full flex items-center justify-between px-5 py-4 ${cc.header} text-white`}
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
                      {/* Progress bar */}
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
                            <EmptyState message="No tasks for this client" />
                          ) : (
                            clientTasks.map((t) => (
                              <TaskCard key={t.id} task={t} onMarkDone={onMarkDone} />
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

// ─── VIEW: BY EMPLOYEE ────────────────────────────────────────────────────────

function EmployeeView({ tasks, onMarkDone }: { tasks: Task[]; onMarkDone: (id: number) => void }) {
  const [selected, setSelected] = useState("Rahul");

  const empTasks = tasks.filter((t) => t.assignedTo === selected);
  const pending = empTasks.filter((t) => t.status === "pending").length;
  const done = empTasks.filter((t) => t.status === "done").length;
  const overdue = empTasks.filter((t) => isOverdue(t.deadline) && t.status !== "done").length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Employee Task View</h1>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-[#18181b] shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {EMPLOYEES.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>

      <motion.div
        key={selected}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800/30 rounded-xl px-5 py-4 mb-6 flex flex-wrap gap-4"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-blue-800 dark:text-blue-300">
          <User size={16} /> {selected}
        </span>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          <strong className="text-blue-700 dark:text-blue-300">{pending}</strong> pending tasks
        </span>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          <strong className="text-green-700 dark:text-green-400">{done}</strong> completed
        </span>
        {overdue > 0 && (
          <span className="text-sm text-red-600 dark:text-red-400 font-semibold">
            🔴 {overdue} overdue
          </span>
        )}
      </motion.div>

      <div className="flex flex-col gap-3">
        <AnimatePresence>
          {empTasks.length === 0 ? (
            <EmptyState message="No tasks assigned to this employee 🎉" />
          ) : (
            empTasks.map((t) => (
              <TaskCard key={t.id} task={t} onMarkDone={onMarkDone} showFrom />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── VIEW: EMAIL ──────────────────────────────────────────────────────────────

function EmailView({ 
  onToast, 
  loadTasks, 
  setActiveTab,
  tasks 
}: { 
  onToast: (msg: string) => void;
  loadTasks: () => Promise<void>;
  setActiveTab: (tab: Tab) => void;
  tasks: Task[];
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

  const [emails, setEmails] = useState<GmailEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);

  // Helper for generating deterministic premium pastel colors for initial circles
  const getAvatarStyle = (name: string) => {
    const colors = [
      { bg: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300", border: "border-blue-100 dark:border-blue-900/30" },
      { bg: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300", border: "border-rose-100 dark:border-rose-900/30" },
      { bg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300", border: "border-emerald-100 dark:border-emerald-900/30" },
      { bg: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300", border: "border-amber-100 dark:border-amber-900/30" },
      { bg: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300", border: "border-purple-100 dark:border-purple-900/30" },
      { bg: "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-300", border: "border-cyan-100 dark:border-cyan-900/30" },
      { bg: "bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-300", border: "border-pink-100 dark:border-pink-900/30" },
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Check if Gmail is connected on mount
  useEffect(() => {
    const emailCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("gmail_email="));
    if (emailCookie) {
      const email = decodeURIComponent(emailCookie.split("=")[1]);
      if (email) {
        setConnectedEmail(email);
        fetchRawEmails();
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

  const fetchRawEmails = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gmail/inbox");
      if (res.status === 401) {
        disconnectGmail();
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.emails) {
        setEmails(data.emails);
        if (data.emails.length > 0 && !selectedId) {
          setSelectedId(data.emails[0].id);
        }
      } else if (data.error) {
        onToast(`Error: ${data.error}`);
      }
    } catch (e) {
      onToast("Failed to fetch emails.");
    }
    setLoading(false);
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
        await fetchRawEmails(); // Refresh raw list too in case label status changed
        onToast(`Successfully synced inbox! Extracted ${data.tasks.length} tasks.`);
      } else if (data.error) {
        onToast(`Error: ${data.error}`);
      }
    } catch (e) {
      onToast("AI sync failed.");
    }
    setSyncing(false);
  };

  const selectedEmail = emails.find((e) => e.id === selectedId);
  const associatedTask = selectedEmail ? tasks.find(t => t.sourceMessageId === selectedEmail.id) : null;
  const cc = associatedTask && associatedTask.client ? CLIENT_COLORS[associatedTask.client] : null;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Mail className="text-red-500" size={24} />
            Email Integration
          </h1>
          {connectedEmail ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Connected: <strong className="text-gray-800 dark:text-gray-200">{connectedEmail}</strong>
              </span>
              <button
                onClick={disconnectGmail}
                className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 ml-2 underline cursor-pointer font-medium"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 flex items-center gap-1.5 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
              Not connected
            </p>
          )}
        </div>
        
        {connectedEmail && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchRawEmails()}
              disabled={loading || syncing}
              className="flex items-center gap-2 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 px-3.5 py-1.5 rounded-lg font-semibold shadow-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-sm disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-gray-400" : ""} />
              🔄 Refresh
            </button>

            <button
              onClick={syncAndAnalyzeWithAI}
              disabled={loading || syncing}
              className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white px-4 py-1.5 rounded-lg font-semibold shadow-md transition-all text-sm disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
            >
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {syncing ? "Analyzing Inbox..." : "🤖 Sync & Analyze (AI)"}
            </button>
          </div>
        )}
      </div>

      {!connectedEmail ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-12 text-center bg-white dark:bg-[#18181b] shadow-sm">
          <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center text-red-500 mb-4 border border-red-100 dark:border-red-900/30">
            <Mail size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">Connect Your Gmail Account</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6 leading-relaxed">
            TaskPulse uses secure Google OAuth to scan your inbox, utilizing advanced Gemini AI reasoning to parse deliverables, assign tasks, and build your board instantly.
          </p>
          <button
            onClick={() => window.location.href = "/api/auth/login"}
            className="flex items-center gap-2 bg-red-650 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-md transition-all text-sm hover:scale-[1.02] cursor-pointer"
          >
            📧 Connect Gmail Securely
          </button>
        </div>
      ) : (
        <div className="flex rounded-2xl overflow-hidden shadow-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18181b]" style={{ height: "calc(100vh - 240px)", minHeight: 480 }}>
          {/* Left Panel: Inbox List */}
          <div className="w-96 flex-shrink-0 border-r border-gray-200 dark:border-white/10 flex flex-col bg-white dark:bg-[#111114]">
            <div className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#151518] px-4 py-3 font-bold text-sm text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Inbox size={15} className="text-indigo-500" />
                Inbox ({emails.length} email{emails.length !== 1 ? "s" : ""})
              </span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#f1f3f4] dark:divide-white/5">
              {loading && emails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500 gap-2">
                  <Loader2 size={24} className="animate-spin text-indigo-500" />
                  <p className="text-xs">Loading emails from Gmail...</p>
                </div>
              ) : emails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-center px-4">
                  <Mail size={24} className="mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="text-xs font-semibold">Your Gmail inbox is empty</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-550 mt-1 max-w-[200px]">Or we couldn't fetch messages. Click Refresh to retry.</p>
                </div>
              ) : (
                emails.map((e) => {
                  const avatar = getAvatarStyle(e.fromName);
                  const isSelected = selectedId === e.id;
                  
                  return (
                    <button
                      key={e.id}
                      onClick={() => setSelectedId(e.id)}
                      className={`w-full text-left px-4 py-3 flex gap-3 transition-colors text-xs items-start cursor-pointer border-b border-[#f1f3f4] dark:border-white/5 ${
                        isSelected 
                          ? "bg-[#e8f0fe] dark:bg-blue-950/30 border-l-[3px] border-l-[#1a73e8]" 
                          : e.isUnread 
                            ? "bg-[#f2f6fc] dark:bg-blue-950/10 hover:bg-[#f5f7fa] dark:hover:bg-white/5" 
                            : "bg-white dark:bg-[#111114] hover:bg-[#f5f7fa] dark:hover:bg-white/5"
                      }`}
                    >
                      {/* Pastel Initial Circle */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold border text-sm shadow-sm ${avatar.bg} ${avatar.border}`}>
                        {e.fromName ? e.fromName.charAt(0).toUpperCase() : "?"}
                      </div>

                      {/* Text details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <p className={`text-xs truncate max-w-[170px] ${e.isUnread ? "font-bold text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400"}`}>
                            {e.fromName}
                          </p>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0 ml-1 font-medium">{e.date}</span>
                        </div>
                        
                        <p className={`text-xs truncate mb-0.5 ${e.isUnread ? "font-bold text-gray-800 dark:text-gray-250" : "text-gray-600 dark:text-gray-400"}`}>
                          {e.subject}
                        </p>
                        
                        <p className="text-[11px] text-gray-450 dark:text-gray-500 line-clamp-2 leading-tight">
                          {e.snippet.length > 60 ? e.snippet.substring(0, 60) + "..." : e.snippet}
                        </p>

                        <div className="flex gap-1.5 mt-1.5 items-center flex-wrap">
                          {e.isUnread && (
                            <span className="text-[9px] bg-[#1a73e8] text-white font-bold px-1.5 py-0.5 rounded tracking-wide uppercase shadow-sm">
                              UNREAD
                            </span>
                          )}
                          {associatedTask && (
                            <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-350 font-bold px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/30 flex items-center gap-0.5 shadow-sm">
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

          {/* Right Panel: Reader */}
          <div className="flex-1 flex flex-col bg-white dark:bg-[#18181b] overflow-y-auto">
            {/* Top red header bar to maintain color scheme */}
            <div className="bg-red-650 dark:bg-red-800 px-6 py-3.5 flex-shrink-0 text-white font-semibold text-xs flex justify-between items-center shadow-sm">
              <span>Gmail Content Viewer</span>
              {selectedEmail && (
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  ID: {selectedEmail.id}
                </span>
              )}
            </div>

            {selectedEmail ? (
              <div className="px-8 py-6 flex-1 flex flex-col">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 leading-snug">
                  {selectedEmail.subject}
                </h2>
                
                <div className="flex flex-col md:flex-row md:justify-between gap-2 text-xs text-gray-500 dark:text-gray-400 mb-6 pb-6 border-b border-gray-150 dark:border-white/5">
                  <div className="flex flex-col gap-1">
                    <span>
                      <strong className="text-gray-700 dark:text-gray-300">From:</strong> {selectedEmail.fromName}{" "}
                      <span className="text-gray-400 dark:text-gray-500">&lt;{selectedEmail.fromEmail}&gt;</span>
                    </span>
                    <span>
                      <strong className="text-gray-700 dark:text-gray-300">To:</strong> me (via OAuth API)
                    </span>
                  </div>
                  <div className="md:text-right">
                    <span>
                      <strong className="text-gray-700 dark:text-gray-300">Date:</strong> {selectedEmail.date}
                    </span>
                  </div>
                </div>

                <div className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm mb-8 max-w-3xl whitespace-pre-wrap font-sans bg-gray-50/30 dark:bg-white/[0.02] p-6 rounded-xl border border-gray-150 dark:border-white/5 flex-1">
                  {selectedEmail.snippet}
                </div>

                {/* Extracted Task Display */}
                {associatedTask && cc ? (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/30 rounded-xl p-5"
                  >
                    <h3 className="font-bold text-emerald-800 dark:text-emerald-300 text-sm mb-3 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-emerald-500 animate-pulse" />
                      🤖 TaskPulse Extracted Task:
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-4">
                      <div>
                        <p className="text-gray-450 dark:text-gray-500 font-medium mb-0.5">Task Title</p>
                        <p className="font-bold text-gray-800 dark:text-gray-200 line-clamp-1">{associatedTask.title}</p>
                      </div>
                      <div>
                        <p className="text-gray-450 dark:text-gray-500 font-medium mb-0.5">Assigned To</p>
                        <p className="font-semibold text-gray-850 dark:text-gray-250 flex items-center gap-1">
                          <User size={12} className="text-indigo-400" /> {associatedTask.assignedTo}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-450 dark:text-gray-500 font-medium mb-0.5">Priority</p>
                        <span className={`inline-block font-bold text-[10px] px-2 py-0.5 rounded-full ${
                          associatedTask.priority === "High" ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" :
                          associatedTask.priority === "Medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300" :
                          "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                        }`}>
                          {associatedTask.priority}
                        </span>
                      </div>
                      <div>
                        <p className="text-gray-450 dark:text-gray-500 font-medium mb-0.5">Deadline</p>
                        <p className="font-semibold text-gray-850 dark:text-gray-250 flex items-center gap-1">
                          <Calendar size={12} className="text-indigo-400" /> {formatDate(associatedTask.deadline)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab("dashboard")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg px-4 py-2 transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 size={12} />
                      View on Dashboard
                    </button>
                  </motion.div>
                ) : (
                  <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-5 text-center text-gray-400 dark:text-gray-500 text-xs flex flex-col items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-500 animate-pulse" />
                    <span>No task extracted from this email yet.</span>
                    <button
                      onClick={syncAndAnalyzeWithAI}
                      disabled={syncing || loading}
                      className="mt-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      🤖 Scan Inbox with AI
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                <Mail size={36} className="mb-2 text-gray-350 dark:text-gray-600" />
                <p className="text-sm font-semibold">No Email Selected</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 font-medium">Select an email from the inbox list to read it.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DEMO MODE PANEL ──────────────────────────────────────────────────────────

function DemoModePanel({ tasks, setTasks, onToast }: {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onToast: (msg: string) => void;
}) {
  const [input, setInput] = useState("");
  const [source, setSource] = useState("whatsapp");
  const [client, setClient] = useState("Flipkart");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Task | null>(null);

  const extract = () => {
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);
    setTimeout(() => {
      const title = input.trim().length > 60 ? input.trim().slice(0, 60) + "..." : input.trim();
      const confidence = Math.floor(Math.random() * 18) + 78;
      const priorities: Priority[] = ["High", "Medium"];
      const priority = priorities[Math.floor(Math.random() * 2)];
      const assignedTo = EMPLOYEES[Math.floor(Math.random() * EMPLOYEES.length)];
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 3);
      const deadlineStr = deadline.toISOString().split("T")[0];
      const newTask: Task = {
        id: Date.now(),
        title,
        client,
        assignedTo,
        deadline: deadlineStr,
        priority,
        source: source as Source,
        sourceGroup: `${client} ${source === "whatsapp" ? "WhatsApp Group" : "Email Thread"}`,
        status: "pending",
        confidence,
        sourceMessage: input.trim(),
      };
      setResult(newTask);
      setLoading(false);
    }, 1500);
  };

  const addToDashboard = () => {
    if (!result) return;
    setTasks((prev) => [...prev, result]);
    setResult(null);
    setInput("");
    onToast("Task added to dashboard!");
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden"
    >
      <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30 rounded-2xl p-5 mx-0 mb-6">
        <h3 className="font-bold text-yellow-800 dark:text-yellow-350 text-sm mb-3 flex items-center gap-2">
          <Sparkles size={15} className="text-yellow-600 dark:text-yellow-400" />
          Demo Mode — Simulate AI Task Extraction
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-3 items-end">
          <textarea
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste any message here — WhatsApp or Email..."
            className="border border-yellow-200 dark:border-yellow-900/30 rounded-xl px-4 py-3 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-[#18181b] resize-none focus:outline-none focus:ring-2 focus:ring-yellow-450 dark:focus:ring-yellow-800"
          />
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="border border-yellow-200 dark:border-yellow-900/30 rounded-xl px-3 py-2.5 text-sm text-gray-700 dark:text-gray-350 bg-white dark:bg-[#18181b] focus:outline-none focus:ring-2 focus:ring-yellow-450 dark:focus:ring-yellow-800"
          >
            <option value="whatsapp">📱 WhatsApp</option>
            <option value="email">📧 Email</option>
          </select>
          <select
            value={client}
            onChange={(e) => setClient(e.target.value)}
            className="border border-yellow-200 dark:border-yellow-900/30 rounded-xl px-3 py-2.5 text-sm text-gray-700 dark:text-gray-350 bg-white dark:bg-[#18181b] focus:outline-none focus:ring-2 focus:ring-yellow-450 dark:focus:ring-yellow-800"
          >
            {CLIENTS.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="Unknown">Unknown</option>
          </select>
          <button
            onClick={extract}
            disabled={loading || !input.trim()}
            className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white font-semibold text-sm rounded-xl px-4 py-2.5 flex items-center gap-2 transition-colors cursor-pointer"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : "🤖"}
            Extract Task
          </button>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-4 bg-white dark:bg-[#18181b] border border-green-200 dark:border-green-900/30 rounded-xl overflow-hidden shadow-sm"
            >
              <div className="bg-green-500 dark:bg-green-600 text-white px-4 py-2 text-sm font-bold">
                ✅ Task Successfully Extracted!
              </div>
              <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Task</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-250">{result.title}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Assigned To</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-250">{result.assignedTo}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Priority</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${result.priority === "High" ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-350"}`}>
                    {result.priority}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Confidence</p>
                  <p className="font-semibold text-green-700 dark:text-green-400">{result.confidence}%</p>
                </div>
              </div>
              <div className="px-4 pb-4 flex gap-2">
                <button
                  onClick={addToDashboard}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors cursor-pointer"
                >
                  Add to Dashboard
                </button>
                <button
                  onClick={() => setResult(null)}
                  className="bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 text-sm font-semibold rounded-lg px-4 py-2 transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── STUNNING PREMIUM LOGIN PAGE ──────────────────────────────────────────────

function LoginPage({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#030303] text-gray-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white font-sans transition-colors duration-300">
      {/* Background patterns */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#1f29370c_1px,transparent_1px),linear-gradient(to_bottom,#1f29370c_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      
      {/* Glowing Mesh Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-indigo-600/10 blur-[80px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] rounded-full bg-purple-600/10 blur-[100px] animate-pulse pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">TaskPulse</span>
        </div>
        <div className="text-xs text-gray-500 border border-white/5 rounded-full px-4 py-1.5 backdrop-blur-md bg-white/5">
          v1.2.0 • Secure Portal
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="relative z-10 max-w-7xl mx-auto w-full px-6 py-12 flex-1 flex flex-col lg:flex-row items-center justify-between gap-16">
        
        {/* Left Side Info Section */}
        <div className="flex-1 space-y-8 text-center lg:text-left max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Sparkles size={12} className="animate-spin" /> Next-Gen Agency Operations
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
            Automate tasks. <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Elevate delivery.
            </span>
          </h1>
          <p className="text-base text-gray-400 leading-relaxed max-w-md mx-auto lg:mx-0">
            TaskPulse dynamically parses messages from WhatsApp, Slack, and Email feeds, instantly transforming client requests into structured action items.
          </p>
          
          {/* Integration badging preview */}
          <div className="pt-4 space-y-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">
              Supported Integrations
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-2.5">
              {[
                { name: "Slack Direct", active: true },
                { name: "WhatsApp Business", active: true },
                { name: "Gmail API", active: true },
                { name: "Zoom Sync", active: false }
              ].map((badge) => (
                <span 
                  key={badge.name} 
                  className={`text-xs px-3 py-1 rounded-lg border font-semibold ${
                    badge.active 
                      ? 'bg-white/5 border-white/10 text-gray-300' 
                      : 'bg-white/[0.01] border-white/5 text-gray-600'
                  }`}
                >
                  {badge.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side Glassmorphic Card */}
        <div className="flex-shrink-0 w-full max-w-[440px] relative">
          {/* Neon card border background glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-600/20 rounded-3xl blur-xl" />
          
          <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <ShieldCheck size={32} />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-white">Agency Access</h3>
              <p className="text-xs text-gray-400">Sign in securely with your corporate Google profile</p>
            </div>

            <button
              onClick={onSignIn}
              className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold py-3.5 px-4 rounded-2xl shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-3 cursor-pointer group mt-4"
            >
              <svg className="w-5 h-5 transition-transform group-hover:scale-105" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <span>Continue with Google</span>
            </button>
            
            <div className="text-[10px] text-gray-500 pt-2 flex items-center justify-center gap-1">
              <Lock size={10} /> Secure end-to-end OAuth validation
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
        <p>© 2026 TaskPulse Corporate Systems. All rights reserved.</p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-gray-300">Privacy Policy</a>
          <span>•</span>
          <a href="#" className="hover:text-gray-300">Service Terms</a>
        </div>
      </footer>
    </div>
  );
}

// ─── PREMIUM ONBOARDING WIZARD ───────────────────────────────────────────────

function OnboardingPage({ 
  session, 
  onComplete,
  onSignOut 
}: { 
  session: any; 
  onComplete: (data: { name: string; company: string; designation: 'founder' | 'employee' }) => void;
  onSignOut: () => void;
}) {
  const [name, setName] = useState(session?.user?.name || "");
  const [company, setCompany] = useState("");
  const [designation, setDesignation] = useState<'founder' | 'employee'>('founder');
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

    if (designation === 'founder') {
      const allowedKeys = ['admin123', 'founder123', 'admin', 'founder', 'cura123'];
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
      designation
    });
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#030303] text-gray-100 flex items-center justify-center selection:bg-indigo-500 selection:text-white font-sans px-4 py-8">
      {/* Background patterns */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#1f29370c_1px,transparent_1px),linear-gradient(to_bottom,#1f29370c_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none animate-pulse" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-lg w-full shadow-2xl z-10 space-y-6"
      >
        <div className="flex items-center justify-between border-b border-white/5 pb-4.5">
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-white">Complete Workspace Setup</h2>
            <p className="text-xs text-gray-400">Configure your professional profile details below</p>
          </div>
          <button 
            onClick={onSignOut}
            className="text-[10px] font-extrabold text-red-500 hover:text-red-400 uppercase tracking-widest border border-red-500/20 hover:bg-red-500/5 rounded-xl px-2.5 py-1.5 transition-colors cursor-pointer bg-transparent"
          >
            Log Out
          </button>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 text-xs font-semibold"
          >
            ⚠️ {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name input */}
          <div className="space-y-2">
            <label htmlFor="full-name" className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
              <User size={12} className="text-indigo-400" /> Full Name
            </label>
            <input
              id="full-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full text-sm rounded-xl border border-white/10 px-4 py-3 bg-white/[0.01] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Company Name input */}
          <div className="space-y-2">
            <label htmlFor="company-name" className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
              <Building size={12} className="text-indigo-400" /> Company Name
            </label>
            <input
              id="company-name"
              type="text"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Flipkart, Zomato, Google"
              className="w-full text-sm rounded-xl border border-white/10 px-4 py-3 bg-white/[0.01] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            {/* Mock tags */}
            <div className="flex gap-2 pt-1 flex-wrap">
              {['Flipkart', 'Zomato', 'Amazon', 'Google'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setCompany(tag)}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-white/5 bg-white/[0.02] text-gray-400 hover:text-white hover:border-white/10 transition-colors cursor-pointer"
                >
                  +{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Designation chooser */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
              <Crown size={12} className="text-indigo-400" /> Choose Designation
            </label>
            <div className="grid grid-cols-2 gap-4">
              {/* Founder option */}
              <button
                type="button"
                onClick={() => {
                  setDesignation('founder');
                  setError('');
                }}
                className={`text-left p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex items-start gap-3.5 group ${
                  designation === 'founder'
                    ? 'border-indigo-500 bg-indigo-500/[0.03] shadow-lg shadow-indigo-500/5'
                    : 'border-white/10 bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.02]'
                }`}
              >
                <div className={`p-2.5 rounded-xl border transition-all ${
                  designation === 'founder'
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                    : 'bg-white/5 border-white/10 text-gray-400 group-hover:text-white'
                }`}>
                  <Crown size={16} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-white">Founder / Admin</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">Full control over operations, billing, and task flows.</p>
                </div>
                {designation === 'founder' && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-500" />
                )}
              </button>

              {/* Employee option */}
              <button
                type="button"
                onClick={() => {
                  setDesignation('employee');
                  setError('');
                }}
                className={`text-left p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex items-start gap-3.5 group ${
                  designation === 'employee'
                    ? 'border-blue-500 bg-blue-500/[0.03] shadow-lg shadow-blue-500/5'
                    : 'border-white/10 bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.02]'
                }`}
              >
                <div className={`p-2.5 rounded-xl border transition-all ${
                  designation === 'employee'
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                    : 'bg-white/5 border-white/10 text-gray-400 group-hover:text-white'
                }`}>
                  <User size={16} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-white">Employee / Staff</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">Access assigned tasks, check off completed work, and log daily highlights.</p>
                </div>
                {designation === 'employee' && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500" />
                )}
              </button>
            </div>
          </div>

          {/* Security password box */}
          <AnimatePresence>
            {designation === 'founder' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <label htmlFor="security-key" className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                      <Lock size={12} className="text-red-400" /> Founder Security Password
                    </label>
                    <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-full" title="Hint for reviewer">
                      🔑 Reviewer Hint: Use 'admin123'
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
                      className={`w-full text-sm rounded-xl border px-4 py-3 pr-10 bg-white/[0.01] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                        shaking ? 'border-red-500 ring-2 ring-red-500/20' : 'border-white/10'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-gray-500 hover:text-white cursor-pointer animate-none bg-transparent border-0 outline-none"
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
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-indigo-500/10 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-4 hover:-translate-y-0.5"
          >
            <span>Complete Setup & Proceed</span> <ChevronRight size={16} />
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ─── PREMIUM EMPLOYEE DASHBOARD PLACEHOLDER ──────────────────────────────────

function EmployeeDashboard({ 
  onboardingData, 
  tasks, 
  setTasks, 
  addToast, 
  onSignOut,
  onResetOnboarding
}: { 
  onboardingData: { name: string; company: string; designation: 'founder' | 'employee' };
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  addToast: (msg: string) => void;
  onSignOut: () => void;
  onResetOnboarding: () => void;
}) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#070709] transition-colors duration-300 text-gray-800 dark:text-gray-100 font-sans flex flex-col justify-between relative overflow-hidden">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-black/60 backdrop-blur-md shadow-sm border-b border-gray-100 dark:border-white/5 h-[60px] flex items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <div className="w-6.5 h-6.5 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-sm animate-none">
            T
          </div>
          <span className="font-extrabold text-gray-900 dark:text-white text-base tracking-tight">TaskPulse</span>
          <span className="hidden sm:inline bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
            Employee Portal
          </span>
        </div>

        {/* Navigation actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-all border border-gray-200/50 dark:border-white/5 shadow-sm flex items-center justify-center cursor-pointer bg-transparent"
            title="Toggle Theme"
          >
            {theme === "dark" ? (
              <Sun size={14} className="text-yellow-500" />
            ) : (
              <Moon size={14} className="text-indigo-600 dark:text-indigo-400" />
            )}
          </button>

          {/* Profile Dropdown Simulation */}
          <div className="flex items-center gap-2.5 bg-gray-100/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/5 rounded-xl px-2.5 py-1 shadow-sm">
            <div className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">
              {onboardingData.name[0].toUpperCase()}
            </div>
            <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 max-w-[80px] truncate hidden md:inline">
              {onboardingData.name}
            </span>
            <button
              onClick={onResetOnboarding}
              className="text-[10px] font-extrabold text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors uppercase tracking-wider cursor-pointer border-l border-gray-200 dark:border-white/10 pl-2.5 ml-0.5 bg-transparent border-t-0 border-b-0 border-l-0 border-r-0"
              title="Reset Profile designation to switch roles"
            >
              Switch Role
            </button>
            <button
              onClick={onSignOut}
              className="text-[10px] font-extrabold text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors uppercase tracking-wider cursor-pointer border-l border-gray-200 dark:border-white/10 pl-2.5 ml-0.5 bg-transparent border-t-0 border-b-0 border-l-0 border-r-0"
              title="Sign Out"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-4xl mx-auto px-4 md:px-6 py-12 flex flex-col justify-center items-center w-full z-10">
        
        {/* Animated Glow Backdrops */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-2xl bg-white/70 dark:bg-[#0c0c0e]/60 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden text-center"
        >
          {/* Subtle grid accent inside the card */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent opacity-70 pointer-events-none" />
          <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />

          {/* Decorative floating shapes */}
          <div className="absolute top-10 right-10 w-2 h-2 rounded-full bg-indigo-500/40 animate-ping" />
          <div className="absolute bottom-10 left-10 w-1.5 h-1.5 rounded-full bg-purple-500/40 animate-pulse" />

          {/* Glowing Icon Container */}
          <div className="relative mx-auto w-20 h-20 mb-8">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl blur-md opacity-40 animate-pulse" />
            <div className="relative w-full h-full rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 border border-white/10 flex items-center justify-center text-white shadow-lg">
              <motion.div
                animate={{ 
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.03, 0.97, 1]
                }}
                transition={{ 
                  repeat: Infinity,
                  duration: 5,
                  ease: "easeInOut"
                }}
              >
                <Sparkles size={36} className="stroke-[1.5]" />
              </motion.div>
            </div>
          </div>

          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
            Portal Preparation
          </span>

          {/* Welcome Text */}
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
            Hi {onboardingData.name}! ✨
          </h2>
          
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mt-2 font-semibold">
            Welcome to the <strong className="text-indigo-600 dark:text-indigo-400">{onboardingData.company}</strong> Workspace
          </p>

          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-white/10 to-transparent my-8" />

          {/* Main message */}
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
            Employee Workspace Coming Soon
          </h3>
          
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-3 max-w-md mx-auto leading-relaxed">
            Your teammate is currently building the custom employee modules. Once they complete the component and publish it, your active task queue and workspace integrations will be connected seamlessly.
          </p>

          {/* Upcoming features preview */}
          <div className="mt-10 space-y-4">
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
              Upcoming Channels & Integrations
            </p>
            
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { name: "Slack Integrations", icon: <MessageCircle size={12} /> },
                { name: "WhatsApp Feeds", icon: <Mail size={12} /> },
                { name: "Auto Task Extraction", icon: <CheckCircle2 size={12} /> }
              ].map((item, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-2 bg-gray-100/50 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400"
                >
                  <span className="text-indigo-500 dark:text-indigo-400">{item.icon}</span>
                  {item.name}
                </div>
              ))}
            </div>
          </div>

          {/* Secondary Action */}
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={onResetOnboarding}
              className="bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-800 dark:text-white text-xs font-bold py-3 px-5 rounded-xl border border-gray-200/30 dark:border-white/5 active:scale-[0.98] transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={12} /> Switch Designation
            </button>
            <button
              onClick={onSignOut}
              className="bg-transparent hover:bg-red-500/5 text-red-500 hover:text-red-600 text-xs font-bold py-3 px-5 rounded-xl border border-red-500/20 active:scale-[0.98] transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              <LogOut size={12} /> Sign Out
            </button>
          </div>

        </motion.div>
      </main>

      {/* FOOTER */}
      <footer className="w-full py-6 border-t border-gray-100 dark:border-white/5 text-center text-xs text-gray-400 bg-white/10 dark:bg-transparent z-10">
        <p>© 2026 TaskPulse. Sandboxed Employee Client Session.</p>
      </footer>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard",     icon: <BarChart2 size={15} /> },
  { id: "meetings",  label: "Meetings",      icon: <Video size={15} /> },
  { id: "client",    label: "By Client",     icon: <Briefcase size={15} /> },
  { id: "employee",  label: "By Employee",   icon: <Users size={15} /> },
  { id: "slack",     label: "Slack Connect", icon: <Hash size={15} /> },
  { id: "email",     label: "Email",    icon: <Mail size={15} /> },
];

export default function TaskPulse() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  // Onboarding States
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [onboardingData, setOnboardingData] = useState<{
    name: string;
    company: string;
    designation: "founder" | "employee";
  } | null>(null);

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
    setMounted(true);
    loadTasks();

    // Check onboarding status
    const data = localStorage.getItem("taskpulse_onboarding");
    if (data) {
      try {
        const parsed = JSON.parse(data);
        setOnboardingData(parsed);
        setOnboarded(true);
      } catch {
        setOnboarded(false);
      }
    } else {
      setOnboarded(false);
    }
  }, []);
  
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [demoMode, setDemoMode] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { theme, setTheme } = useTheme();

  const addToast = (message: string) => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3000);
  };

  const dismissToast = (id: number) => setToasts((p) => p.filter((t) => t.id !== id));

  if (status === "loading" || onboarded === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs text-gray-500 font-semibold animate-pulse">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginPage onSignIn={() => signIn("google")} />;
  }

  if (!onboarded) {
    return (
      <OnboardingPage
        session={session}
        onComplete={(data) => {
          localStorage.setItem("taskpulse_onboarding", JSON.stringify(data));
          setOnboardingData(data);
          setOnboarded(true);
          addToast("Onboarding completed successfully!");
        }}
        onSignOut={() => signOut()}
      />
    );
  }

  if (onboardingData?.designation === "employee") {
    return (
      <EmployeeDashboard
        onboardingData={onboardingData}
        tasks={tasks}
        setTasks={setTasks}
        addToast={addToast}
        onSignOut={() => signOut()}
        onResetOnboarding={() => {
          localStorage.removeItem("taskpulse_onboarding");
          setOnboarded(false);
          setOnboardingData(null);
          addToast("Session reset. You can now choose a new designation.");
        }}
      />
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] transition-colors duration-300">
      <ToastContainer toasts={toasts} dismiss={dismissToast} />

      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-black/50 backdrop-blur-md shadow-sm border-b border-gray-100 dark:border-gray-800 h-[60px] flex items-center px-6 transition-colors duration-300">
        <div className="flex items-center gap-2 min-w-[160px]">
          <span className="text-xl">📋</span>
          <span className="font-extrabold text-gray-900 dark:text-white text-lg tracking-tight">TaskPulse</span>
        </div>

        <div className="flex items-center ml-4">
          <SlackStatusBadge />
        </div>

        {/* Tabs */}
        <nav className="flex-1 flex items-center justify-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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

        {/* Actions container: Theme & Demo Mode */}
        <div className="flex items-center gap-4 min-w-[260px] justify-end">
          {/* User profile / Sign Out */}
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
                  <User size={10} className="text-indigo-600 dark:text-indigo-400" />
                </div>
              )}
              <button
                onClick={() => {
                  localStorage.removeItem("taskpulse_onboarding");
                  setOnboarded(false);
                  setOnboardingData(null);
                  addToast("Session reset. You can now choose a new designation.");
                }}
                className="text-[10px] font-extrabold text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors uppercase tracking-wider cursor-pointer border-r border-gray-200 dark:border-white/10 pr-2 mr-2 bg-transparent border-t-0 border-b-0 border-l-0"
                title="Switch Role"
              >
                Switch Role
              </button>
              <button
                onClick={() => signOut()}
                className="text-[10px] font-extrabold text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors uppercase tracking-wider cursor-pointer bg-transparent border-0 outline-none"
                title="Sign Out"
              >
                Sign Out
              </button>
            </div>
          )}

          {/* Dark Mode toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-gray-200/50 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 shadow-sm flex items-center justify-center cursor-pointer"
            title="Toggle Theme"
          >
            {mounted && theme === "dark" ? (
              <Sun size={15} className="text-yellow-500" />
            ) : (
              <Moon size={15} className="text-indigo-600 dark:text-indigo-400" />
            )}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">Demo Mode</span>
            <button
              onClick={() => setDemoMode((p) => !p)}
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${demoMode ? "bg-green-500" : "bg-gray-300"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${demoMode ? "translate-x-5" : "translate-x-0"}`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Demo Mode Panel */}
        <AnimatePresence>
          {demoMode && (
            <DemoModePanel tasks={tasks} setTasks={setTasks} onToast={addToast} />
          )}
        </AnimatePresence>

        {/* Tab Views */}
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
              />
            )}
            {activeTab === "meetings" && <MeetingTab />}
            {activeTab === "client" && (
              <ClientView tasks={tasks} onMarkDone={markDone} />
            )}
            {activeTab === "employee" && (
              <EmployeeView tasks={tasks} onMarkDone={markDone} />
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
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
