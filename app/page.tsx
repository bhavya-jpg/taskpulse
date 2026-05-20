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
  setActiveTab 
}: { 
  onToast: (msg: string) => void;
  loadTasks: () => Promise<void>;
  setActiveTab: (tab: Tab) => void;
}) {
  const [selected, setSelected] = useState(1);
  const [loading, setLoading] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);

  // Check if Gmail is connected on mount
  useEffect(() => {
    const emailCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("gmail_email="));
    if (emailCookie) {
      const email = decodeURIComponent(emailCookie.split("=")[1]);
      if (email) setConnectedEmail(email);
    }
  }, []);

  const disconnectGmail = () => {
    document.cookie = "gmail_token=; Path=/; Max-Age=0";
    document.cookie = "gmail_email=; Path=/; Max-Age=0";
    setConnectedEmail(null);
    onToast("Gmail disconnected.");
  };

  const fetchRealEmails = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gmail");
      if (res.status === 401) {
        onToast("Not authenticated. Please connect Gmail first.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.tasks) {
        await loadTasks();
        setActiveTab("dashboard");
        onToast(`Successfully extracted ${data.tasks.length} tasks from real Gmail!`);
      } else if (data.error) {
        onToast(`Error: ${data.error}. ${data.details || ""}`);
      }
    } catch (e) {
      onToast("Failed to fetch emails.");
    }
    setLoading(false);
  };

  const email = EMAILS.find((e) => e.id === selected)!;
  const cc = email.client ? CLIENT_COLORS[email.client] : null;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Email Integration</h1>
          {connectedEmail ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Connected: <strong className="text-gray-800 dark:text-gray-200">{connectedEmail}</strong>
              </span>
              <button
                onClick={disconnectGmail}
                className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 ml-2 underline cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
              Not connected
            </p>
          )}
        </div>
        <div className="flex gap-3">
          {!connectedEmail ? (
            <button
              onClick={() => window.location.href = "/api/auth/login"}
              className="flex items-center gap-2 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-semibold shadow-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-sm"
            >
              📧 Connect Gmail
            </button>
          ) : (
            <button
              onClick={fetchRealEmails}
              disabled={loading}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold shadow-sm transition-colors text-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : "📨"}
              {loading ? "🤖 AI Reading Emails..." : "Fetch Real Emails"}
            </button>
          )}
        </div>
      </div>
      <div className="flex rounded-2xl overflow-hidden shadow-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18181b]" style={{ height: "calc(100vh - 260px)", minHeight: 480 }}>
        {/* Left panel */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-white/10 flex flex-col bg-white dark:bg-[#111114]">
          <div className="bg-red-600 dark:bg-red-800 text-white px-4 py-3 font-semibold text-sm flex items-center gap-2">
            <Inbox size={16} /> Inbox
          </div>
          <div className="flex-1 overflow-y-auto">
            {EMAILS.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelected(e.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${selected === e.id ? "bg-blue-50 dark:bg-blue-950/20 border-l-2 border-l-blue-500" : ""}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <p className={`text-xs ${e.unread ? "font-bold text-gray-900 dark:text-gray-200" : "text-gray-500 dark:text-gray-500"} truncate max-w-[150px]`}>
                    {e.from}
                  </p>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">{e.time}</span>
                </div>
                <p className={`text-sm ${e.unread ? "font-semibold text-gray-800 dark:text-gray-200" : "text-gray-500 dark:text-gray-500"} truncate`}>
                  {e.subject}
                </p>
                {e.hasTask && (
                  <span className="mt-1 inline-flex items-center text-[10px] bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold rounded-full px-2 py-0.5">
                    🤖 Task Found
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#18181b] overflow-y-auto">
          {/* Gmail-style top bar */}
          <div className="bg-red-600 dark:bg-red-800 px-6 py-3 flex-shrink-0" />

          <div className="px-8 py-6 flex-1">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">{email.subject}</h2>
            <div className="flex flex-col gap-1 text-sm text-gray-500 dark:text-gray-400 mb-6 pb-6 border-b border-gray-100 dark:border-white/5">
              <span><strong className="text-gray-700 dark:text-gray-300">From:</strong> {email.from}</span>
              <span><strong className="text-gray-700 dark:text-gray-300">To:</strong> team@agency.com</span>
              <span><strong className="text-gray-700 dark:text-gray-300">Date:</strong> {email.time}, May 2026</span>
            </div>

            <p className="text-gray-700 dark:text-gray-350 leading-relaxed text-sm mb-8">{email.body}</p>

            {email.hasTask && email.task && cc && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-xl p-5"
              >
                <h3 className="font-bold text-blue-800 dark:text-blue-300 text-sm mb-3 flex items-center gap-2">
                  🤖 TaskPulse Extracted Task:
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">Task</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-250">{email.task.title}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">Assigned To</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-250">{email.task.assignedTo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">Priority</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      email.task.priority === "High" ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" :
                      email.task.priority === "Medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300" :
                      "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                    }`}>
                      {email.task.priority}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">Deadline</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-250">{formatDate(email.task.deadline)}</p>
                  </div>
                </div>
                <button
                  onClick={() => onToast("Task added to dashboard!")}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors cursor-pointer"
                >
                  ✅ Add to Dashboard
                </button>
              </motion.div>
            )}

            {!email.hasTask && (
              <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-5 text-center text-gray-400 dark:text-gray-500 text-sm">
                No tasks extracted from this email.
              </div>
            )}
          </div>
        </div>
      </div>
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

  if (status === "loading") {
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a] transition-colors duration-300">
        <div className="bg-white dark:bg-[#18181b] p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-white/10 max-w-md w-full text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
          <span className="text-4xl block mb-2">📋</span>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">Welcome to TaskPulse</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-xs mx-auto leading-relaxed">
            Securely manage your creative agency's tasks. Extract actions from WhatsApp and Emails instantly.
          </p>
          <button
            onClick={() => signIn("google")}
            className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-md shadow-indigo-200 dark:shadow-none hover:shadow-lg active:scale-[0.98]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            Sign in with Google
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
                onClick={() => signOut()}
                className="text-[10px] font-extrabold text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors uppercase tracking-wider cursor-pointer"
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
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
