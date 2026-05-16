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
  Users,
  Briefcase,
  Inbox,
  Settings,
  LogOut,
  LogIn,
} from "lucide-react";
import { WhatsAppConnector, GroupSelector, useTaskStream, WAStatusBadge } from "@/components/whatsapp-setup";
import { useSession, signIn, signOut } from "next-auth/react";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type Priority = "High" | "Medium" | "Low";
type Source = "whatsapp" | "email";
type Status = "pending" | "done";

interface Task {
  id: number;
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

type Tab = "dashboard" | "client" | "employee" | "whatsapp" | "email";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const INITIAL_TASKS: Task[] = [
  { id: 1, title: "Send revised creatives to Flipkart", client: "Flipkart", assignedTo: "Rahul", deadline: "2026-05-18", priority: "High", source: "whatsapp", sourceGroup: "Flipkart Campaign Group", status: "pending", confidence: 95, sourceMessage: "Can someone send the revised creatives before 6 PM today? The client is waiting. This is urgent." },
  { id: 2, title: "Finalize proposal document for Zomato", client: "Zomato", assignedTo: "Priya", deadline: "2026-05-19", priority: "High", source: "email", sourceGroup: "Zomato Strategy Thread", status: "pending", confidence: 88, sourceMessage: "Hi team, we need the proposal finalized by tomorrow EOD. Please review the attached doc and send it across." },
  { id: 3, title: "Update social media posts for Amazon", client: "Amazon", assignedTo: "Priya", deadline: "2026-05-17", priority: "Medium", source: "whatsapp", sourceGroup: "Amazon Social Media Group", status: "pending", confidence: 72, sourceMessage: "Dekha jayega if we can push the posts out by tomorrow? Client ka pressure hai bhai." },
  { id: 4, title: "Send May invoice to Flipkart", client: "Flipkart", assignedTo: "Admin", deadline: "2026-05-20", priority: "Medium", source: "email", sourceGroup: "Finance Thread", status: "done", confidence: 92, sourceMessage: "Please send the May invoice to Flipkart by end of week. Accounts team is waiting." },
  { id: 5, title: "Design banner for Google Ads campaign", client: "Google", assignedTo: "Rahul", deadline: "2026-05-17", priority: "High", source: "whatsapp", sourceGroup: "Google Ads Campaign Group", status: "pending", confidence: 91, sourceMessage: "@Rahul please design the banner for the Google Ads campaign by tomorrow morning. Client review is at 11 AM." },
  { id: 6, title: "Schedule Q2 strategy meeting with Zomato", client: "Zomato", assignedTo: "Priya", deadline: "2026-05-16", priority: "High", source: "email", sourceGroup: "Zomato Comms", status: "pending", confidence: 87, sourceMessage: "Can we schedule a meeting with the Zomato team this Friday to discuss Q2 strategy? Please confirm availability." },
  { id: 7, title: "Send performance report to Amazon", client: "Amazon", assignedTo: "Vikas", deadline: "2026-05-21", priority: "Low", source: "email", sourceGroup: "Amazon Monthly Reports", status: "pending", confidence: 83, sourceMessage: "Vikas, please compile and send the monthly performance report for the Amazon account by next Tuesday." },
  { id: 8, title: "Prepare pitch deck for new Google campaign", client: "Google", assignedTo: "Rahul", deadline: "2026-05-22", priority: "Medium", source: "whatsapp", sourceGroup: "Google Strategy", status: "pending", confidence: 76, sourceMessage: "Bhai kal tak ek rough pitch deck banana hai Google ke naye campaign ke liye. Founder ko dikhana hai." },
];

const CLIENTS = ["Flipkart", "Zomato", "Amazon", "Google"];
const EMPLOYEES = ["Rahul", "Priya", "Admin", "Vikas"];

const CLIENT_COLORS: Record<string, { bg: string; text: string; border: string; header: string }> = {
  Flipkart: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300", header: "bg-blue-600" },
  Zomato:   { bg: "bg-red-100",  text: "text-red-700",  border: "border-red-300",  header: "bg-red-600"  },
  Amazon:   { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300", header: "bg-orange-500" },
  Google:   { bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-300", header: "bg-cyan-600" },
};

const PRIORITY_CONFIG: Record<Priority, { dot: string; text: string; border: string }> = {
  High:   { dot: "bg-red-500",    text: "text-red-600",    border: "border-l-red-500"    },
  Medium: { dot: "bg-yellow-500", text: "text-yellow-600", border: "border-l-yellow-500" },
  Low:    { dot: "bg-green-500",  text: "text-green-600",  border: "border-l-green-500"  },
};

const PRIORITY_ORDER: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };

// ─── WHATSAPP DATA ────────────────────────────────────────────────────────────

const WA_GROUPS = [
  { id: "flipkart", name: "Flipkart Campaign Group", members: 8, unread: 3 },
  { id: "amazon",   name: "Amazon Social Media Group", members: 5, unread: 1 },
  { id: "google",   name: "Google Ads Campaign Group", members: 6, unread: 2 },
  { id: "zomato",   name: "Zomato Strategy Group",     members: 4, unread: 1 },
];

const WA_MESSAGES: Record<string, { sender: string; time: string; message: string; hasTask: boolean; outgoing?: boolean }[]> = {
  flipkart: [
    { sender: "Ankit (Client)", time: "10:02 AM", message: "Hi team, hope you're doing well!", hasTask: false },
    { sender: "Ankit (Client)", time: "10:05 AM", message: "Can someone send the revised creatives before 6 PM today? The client is waiting. This is urgent.", hasTask: true },
    { sender: "Rahul", time: "10:07 AM", message: "Sure Ankit bhai, will send it by 5:30 PM!", hasTask: false, outgoing: true },
    { sender: "Priya", time: "10:08 AM", message: "👍", hasTask: false, outgoing: true },
    { sender: "Manager", time: "11:00 AM", message: "@Rahul please also prepare the brief document by tomorrow morning.", hasTask: true },
  ],
  amazon: [
    { sender: "Amazon Team", time: "9:00 AM", message: "Good morning everyone!", hasTask: false },
    { sender: "Amazon Team", time: "9:15 AM", message: "Dekha jayega if we can push the posts out by tomorrow? Client ka pressure hai bhai.", hasTask: true },
    { sender: "Priya", time: "9:20 AM", message: "Sure, I'll handle it.", hasTask: false, outgoing: true },
  ],
  google: [
    { sender: "Client (Google)", time: "9:30 AM", message: "Good morning team!", hasTask: false },
    { sender: "Client (Google)", time: "9:32 AM", message: "@Rahul please design the banner for the Google Ads campaign by tomorrow morning. Client review is at 11 AM.", hasTask: true },
    { sender: "Rahul", time: "9:35 AM", message: "On it! Will share by tonight.", hasTask: false, outgoing: true },
  ],
  zomato: [
    { sender: "Zomato Partnerships", time: "8:45 AM", message: "Hi team! Quick update needed.", hasTask: false },
    { sender: "Zomato Partnerships", time: "8:50 AM", message: "Can we schedule a meeting this Friday for Q2 strategy? Please confirm availability.", hasTask: true },
    { sender: "Priya", time: "9:00 AM", message: "Friday works for us!", hasTask: false, outgoing: true },
  ],
};

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
    hasTask: true, unread: false, client: "Google",
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
  onMarkDone?: (id: number) => void;
  onConfirm?: (id: number) => void;
  onDismiss?: (id: number) => void;
  showConfirmButtons?: boolean;
  showFrom?: boolean;
}) {
  const [showSource, setShowSource] = useState(false);
  const pc = PRIORITY_CONFIG[task.priority];
  const cc = CLIENT_COLORS[task.client];
  const overdue = isOverdue(task.deadline) && task.status !== "done";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={`bg-white rounded-xl shadow-md border-l-4 ${pc.border} overflow-hidden`}
    >
      <div className="p-4">
        {/* Row 1: Title + Priority dot */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className={`font-semibold text-[15px] leading-snug text-gray-800 ${task.status === "done" ? "line-through text-gray-400" : ""}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${pc.dot}`} />
            <span className={`text-xs font-semibold ${pc.text}`}>{task.priority}</span>
          </div>
        </div>

        {/* Row 2: Client badge + Source icon */}
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cc.bg} ${cc.text} ${cc.border}`}>
            {task.client}
          </span>
          {task.source === "whatsapp" ? (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <MessageCircle size={12} /> WhatsApp
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
              <Mail size={12} /> Email
            </span>
          )}
          <span className="ml-auto text-xs text-gray-400 bg-gray-50 rounded px-1.5 py-0.5">
            {task.confidence}% confidence
          </span>
        </div>

        {/* Row 3: Assigned + Due */}
        <div className="flex items-center gap-4 mb-2 text-xs text-gray-500">
          <span className="flex items-center gap-1"><User size={11} /> {task.assignedTo}</span>
          <span className="flex items-center gap-1"><Calendar size={11} /> Due {formatDate(task.deadline)}</span>
        </div>

        {/* Row 4: Overdue banner */}
        {overdue && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded px-2 py-1 mb-2">
            🔴 OVERDUE
          </div>
        )}

        {/* Row 5: Source group */}
        {showFrom && (
          <p className="text-xs text-gray-400 mb-2">
            📍 From: {task.sourceGroup} ({task.source === "whatsapp" ? "WhatsApp" : "Email"})
          </p>
        )}
        {!showFrom && (
          <p className="text-xs text-gray-400 mb-2">
            📁 {task.sourceGroup}
          </p>
        )}

        {/* Confidence warning (unconfirmed) */}
        {showConfirmButtons && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-3 text-xs text-yellow-700 font-medium">
            ⚠️ AI confidence: {task.confidence}% — Please confirm
          </div>
        )}

        {/* View source message */}
        <button
          onClick={() => setShowSource((p) => !p)}
          className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium mb-2 transition-colors"
        >
          {showSource ? <EyeOff size={12} /> : <Eye size={12} />}
          {showSource ? "Hide" : "👁 View"} Source Message
        </button>

        <AnimatePresence>
          {showSource && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <blockquote className="bg-gray-50 border-l-4 border-gray-300 rounded-r-lg px-3 py-2 text-xs text-gray-600 italic mb-2">
                &ldquo;{task.sourceMessage}&rdquo;
              </blockquote>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {showConfirmButtons ? (
            <>
              <button
                onClick={() => onConfirm?.(task.id)}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors"
              >
                ✅ Yes, Add It
              </button>
              <button
                onClick={() => onDismiss?.(task.id)}
                className="flex-1 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors border border-gray-200"
              >
                ❌ Dismiss
              </button>
              <button className="bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-600 text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors border border-gray-200">
                ✏️ Edit
              </button>
            </>
          ) : task.status === "pending" ? (
            <button
              onClick={() => onMarkDone?.(task.id)}
              className="bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors border border-green-200"
            >
              ✅ Mark Done
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
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="text-4xl mb-3">🎉</span>
      <p className="text-gray-400 text-sm font-medium">{message}</p>
    </div>
  );
}

// ─── STAT BOX ─────────────────────────────────────────────────────────────────

function StatBox({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
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
  onMarkDone: (id: number) => void;
  onConfirm: (id: number) => void;
  onDismiss: (id: number) => void;
}) {
  const confirmed = tasks.filter((t) => t.status === "pending" && t.confidence >= 85);
  const unconfirmed = tasks.filter((t) => t.confidence < 85 && t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");

  const sorted = [...confirmed].sort((a, b) => {
    const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pd !== 0) return pd;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  const totalToday = tasks.length;
  const doneToday = done.length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Column 1 */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">📋 All Tasks</h2>
          <span className="bg-blue-600 text-white text-xs font-bold rounded-full px-2 py-0.5">{sorted.length}</span>
        </div>
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {sorted.length === 0 ? (
              <EmptyState message="No tasks here yet 🎉" />
            ) : (
              sorted.map((t) => (
                <TaskCard key={t.id} task={t} onMarkDone={onMarkDone} />
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Column 2 */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">⚠️ Unconfirmed</h2>
          <span className="bg-yellow-500 text-white text-xs font-bold rounded-full px-2 py-0.5">{unconfirmed.length}</span>
        </div>
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {unconfirmed.length === 0 ? (
              <EmptyState message="No unconfirmed tasks 🎉" />
            ) : (
              unconfirmed.map((t) => (
                <TaskCard key={t.id} task={t} showConfirmButtons onConfirm={onConfirm} onDismiss={onDismiss} />
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Column 3 */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">✅ Completed</h2>
          <span className="bg-green-600 text-white text-xs font-bold rounded-full px-2 py-0.5">{done.length}</span>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 px-4 py-2 mb-3 text-sm text-green-700 font-semibold">
          {doneToday} of {totalToday} tasks done today
        </div>
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {done.length === 0 ? (
              <EmptyState message="No completed tasks yet" />
            ) : (
              done.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))
            )}
          </AnimatePresence>
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
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Tasks by Client</h1>
        <p className="text-sm text-gray-500">{tasks.filter((t) => t.status === "pending").length} pending tasks across all clients</p>
      </div>

      {/* Stat boxes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatBox icon={<BarChart2 size={18} className="text-blue-600" />} label="Total Tasks" value={total} color="bg-blue-50" />
        <StatBox icon={<AlertTriangle size={18} className="text-red-500" />} label="High Priority" value={highPriority} color="bg-red-50" />
        <StatBox icon={<Clock size={18} className="text-orange-500" />} label="Overdue" value={overdue} color="bg-orange-50" />
        <StatBox icon={<CheckCircle2 size={18} className="text-green-600" />} label="Completed" value={done} color="bg-green-50" />
      </div>

      <div className="flex flex-col gap-4">
        {CLIENTS.map((client) => {
          const clientTasks = tasks.filter((t) => t.client === client);
          const clientDone = clientTasks.filter((t) => t.status === "done").length;
          const cc = CLIENT_COLORS[client];
          const open = !collapsed[client];

          return (
            <div key={client} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
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
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${cc.header}`}
                            style={{ width: clientTasks.length ? `${(clientDone / clientTasks.length) * 100}%` : "0%" }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 font-medium">
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
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Employee Task View</h1>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl px-5 py-4 mb-6 flex flex-wrap gap-4"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-blue-800">
          <User size={16} /> {selected}
        </span>
        <span className="text-sm text-gray-600">
          <strong className="text-blue-700">{pending}</strong> pending tasks
        </span>
        <span className="text-sm text-gray-600">
          <strong className="text-green-700">{done}</strong> completed
        </span>
        {overdue > 0 && (
          <span className="text-sm text-red-600 font-semibold">
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

// ─── VIEW: WHATSAPP ───────────────────────────────────────────────────────────

function WhatsAppView() {
  const [showSetup, setShowSetup] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeGroup, setActiveGroup] = useState("flipkart");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const messages = WA_MESSAGES[activeGroup] ?? [];
  const group = WA_GROUPS.find((g) => g.id === activeGroup)!;

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">WhatsApp Integration</h1>
          <p className="text-sm text-gray-500">Manage your connected WhatsApp groups and task extraction.</p>
        </div>
        <button 
          onClick={() => setShowSetup(!showSetup)}
          className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Settings size={16} />
          {showSetup ? "Back to Chat" : "Setup WhatsApp"}
        </button>
      </div>

      {showSetup ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Connection</h2>
            <WhatsAppConnector onConnected={() => setRefreshKey(k => k + 1)} />
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Monitored Groups</h2>
            <GroupSelector key={refreshKey} />
          </div>
        </div>
      ) : (
        <div className="flex rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-white" style={{ height: "calc(100vh - 260px)", minHeight: 480 }}>
          {/* Left panel */}
          <div className="w-72 flex-shrink-0 border-r border-gray-200 flex flex-col bg-white">
            <div className="bg-[#075E54] text-white px-4 py-3 font-semibold text-sm flex items-center gap-2">
              <MessageCircle size={16} /> Groups
            </div>
            <div className="flex-1 overflow-y-auto">
              {WA_GROUPS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setActiveGroup(g.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 text-left ${activeGroup === g.id ? "bg-green-50" : ""}`}
                >
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {g.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{g.name}</p>
                    <p className="text-xs text-gray-400">{g.members} members</p>
                  </div>
                  {g.unread > 0 && (
                    <span className="bg-green-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                      {g.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Right panel */}
          <div className="flex-1 flex flex-col" style={{ background: "#e5ddd5" }}>
            {/* Chat header */}
            <div className="bg-[#075E54] text-white px-5 py-3 flex items-center gap-3 flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-green-300 flex items-center justify-center text-[#075E54] font-bold text-sm">
                {group.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-sm">{group.name}</p>
                <p className="text-xs text-green-200">{group.members} members</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3" style={{ background: "#e5ddd5" }}>
              <AnimatePresence>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col ${msg.outgoing ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[70%] px-3 py-2 rounded-xl shadow-sm text-sm ${
                        msg.outgoing
                          ? "bg-[#DCF8C6] rounded-tr-sm"
                          : "bg-white rounded-tl-sm"
                      }`}
                    >
                      {!msg.outgoing && (
                        <p className="text-xs font-semibold text-green-600 mb-0.5">{msg.sender}</p>
                      )}
                      <p className="text-gray-800 leading-relaxed">{msg.message}</p>
                      <p className="text-[10px] text-gray-400 text-right mt-1">{msg.time}</p>
                    </div>
                    {msg.hasTask && (
                      <div className="mt-1 bg-blue-100 border border-blue-300 text-blue-700 text-[10px] font-semibold rounded-full px-2 py-0.5 flex items-center gap-1">
                        🤖 Task Extracted by TaskPulse
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Input bar */}
            <div className="bg-[#f0f0f0] border-t border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
              <input
                type="text"
                placeholder="Type a message (Read-only simulation)"
                className="flex-1 bg-white rounded-full px-4 py-2 text-sm text-gray-400 italic outline-none border border-gray-200"
                readOnly
              />
              <button className="w-9 h-9 bg-gray-300 rounded-full flex items-center justify-center text-white cursor-not-allowed">
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── VIEW: EMAIL ──────────────────────────────────────────────────────────────

function EmailView({ onToast }: { onToast: (msg: string) => void }) {
  const [selected, setSelected] = useState(1);

  const email = EMAILS.find((e) => e.id === selected)!;
  const cc = email.client ? CLIENT_COLORS[email.client] : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Mock Email Inbox</h1>
      <div className="flex rounded-2xl overflow-hidden shadow-xl border border-gray-200" style={{ height: "calc(100vh - 260px)", minHeight: 480 }}>
        {/* Left panel */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 flex flex-col bg-white">
          <div className="bg-red-600 text-white px-4 py-3 font-semibold text-sm flex items-center gap-2">
            <Inbox size={16} /> Inbox
          </div>
          <div className="flex-1 overflow-y-auto">
            {EMAILS.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelected(e.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${selected === e.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <p className={`text-xs ${e.unread ? "font-bold text-gray-900" : "text-gray-500"} truncate max-w-[150px]`}>
                    {e.from}
                  </p>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">{e.time}</span>
                </div>
                <p className={`text-sm ${e.unread ? "font-semibold text-gray-800" : "text-gray-500"} truncate`}>
                  {e.subject}
                </p>
                {e.hasTask && (
                  <span className="mt-1 inline-flex items-center text-[10px] bg-blue-100 text-blue-700 font-semibold rounded-full px-2 py-0.5">
                    🤖 Task Found
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col bg-white overflow-y-auto">
          {/* Gmail-style top bar */}
          <div className="bg-red-600 px-6 py-3 flex-shrink-0" />

          <div className="px-8 py-6 flex-1">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{email.subject}</h2>
            <div className="flex flex-col gap-1 text-sm text-gray-500 mb-6 pb-6 border-b border-gray-100">
              <span><strong className="text-gray-700">From:</strong> {email.from}</span>
              <span><strong className="text-gray-700">To:</strong> team@agency.com</span>
              <span><strong className="text-gray-700">Date:</strong> {email.time}, May 2026</span>
            </div>

            <p className="text-gray-700 leading-relaxed text-sm mb-8">{email.body}</p>

            {email.hasTask && email.task && cc && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50 border border-blue-200 rounded-xl p-5"
              >
                <h3 className="font-bold text-blue-800 text-sm mb-3 flex items-center gap-2">
                  🤖 TaskPulse Extracted Task:
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-0.5">Task</p>
                    <p className="font-semibold text-gray-800">{email.task.title}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-0.5">Assigned To</p>
                    <p className="font-semibold text-gray-800">{email.task.assignedTo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-0.5">Priority</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      email.task.priority === "High" ? "bg-red-100 text-red-700" :
                      email.task.priority === "Medium" ? "bg-yellow-100 text-yellow-700" :
                      "bg-green-100 text-green-700"
                    }`}>
                      {email.task.priority}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-0.5">Deadline</p>
                    <p className="font-semibold text-gray-800">{formatDate(email.task.deadline)}</p>
                  </div>
                </div>
                <button
                  onClick={() => onToast("Task added to dashboard!")}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
                >
                  ✅ Add to Dashboard
                </button>
              </motion.div>
            )}

            {!email.hasTask && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center text-gray-400 text-sm">
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
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 mx-0 mb-6">
        <h3 className="font-bold text-yellow-800 text-sm mb-3 flex items-center gap-2">
          <Sparkles size={15} className="text-yellow-600" />
          Demo Mode — Simulate AI Task Extraction
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-3 items-end">
          <textarea
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste any message here — WhatsApp or Email..."
            className="border border-yellow-200 rounded-xl px-4 py-3 text-sm text-gray-700 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="border border-yellow-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            <option value="whatsapp">📱 WhatsApp</option>
            <option value="email">📧 Email</option>
          </select>
          <select
            value={client}
            onChange={(e) => setClient(e.target.value)}
            className="border border-yellow-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            {CLIENTS.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="Unknown">Unknown</option>
          </select>
          <button
            onClick={extract}
            disabled={loading || !input.trim()}
            className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white font-semibold text-sm rounded-xl px-4 py-2.5 flex items-center gap-2 transition-colors"
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
              className="mt-4 bg-white border border-green-200 rounded-xl overflow-hidden shadow-sm"
            >
              <div className="bg-green-500 text-white px-4 py-2 text-sm font-bold">
                ✅ Task Successfully Extracted!
              </div>
              <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Task</p>
                  <p className="font-semibold text-gray-800">{result.title}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Assigned To</p>
                  <p className="font-semibold text-gray-800">{result.assignedTo}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Priority</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${result.priority === "High" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {result.priority}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Confidence</p>
                  <p className="font-semibold text-green-700">{result.confidence}%</p>
                </div>
              </div>
              <div className="px-4 pb-4 flex gap-2">
                <button
                  onClick={addToDashboard}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
                >
                  Add to Dashboard
                </button>
                <button
                  onClick={() => setResult(null)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
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
  { id: "client",    label: "By Client",     icon: <Briefcase size={15} /> },
  { id: "employee",  label: "By Employee",   icon: <Users size={15} /> },
  { id: "whatsapp",  label: "Mock WhatsApp", icon: <MessageCircle size={15} /> },
  { id: "email",     label: "Mock Email",    icon: <Mail size={15} /> },
];

export default function TaskPulse() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [demoMode, setDemoMode] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string) => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3000);
  };

  const dismissToast = (id: number) => setToasts((p) => p.filter((t) => t.id !== id));

  // WhatsApp Task Streaming
  useTaskStream((newTask: any) => {
    // Map extracted task to dashboard task type
    const mapped: Task = {
      id: Date.now(), // Local ephemeral ID for UI
      title: newTask.title,
      client: newTask.sourcePayload.groupName.split(' ')[0], // Best effort client detection
      assignedTo: newTask.assignee || "Unassigned",
      deadline: newTask.deadline || new Date().toISOString().split('T')[0],
      priority: newTask.priority,
      source: "whatsapp",
      sourceGroup: newTask.sourcePayload.groupName,
      status: newTask.status === "confirmed" ? "pending" : "pending", // Dashboard uses 'pending'
      confidence: newTask.confidence,
      sourceMessage: newTask.sourcePayload.messageText,
    };
    
    setTasks((prev) => [mapped, ...prev]);
    addToast(`New task detected from WhatsApp: ${newTask.title}`);
  });

  const markDone = (id: number) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: "done" } : t));
    addToast("Task marked as done!");
  };

  const confirmTask = (id: number) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, confidence: 95 } : t));
    addToast("Task confirmed and added to dashboard!");
  };

  const dismissTask = (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    addToast("Task dismissed.");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer toasts={toasts} dismiss={dismissToast} />

      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100 h-[60px] flex items-center px-6">
        <div className="flex items-center gap-2 min-w-[160px]">
          <span className="text-xl">📋</span>
          <span className="font-extrabold text-gray-900 text-lg tracking-tight">TaskPulse</span>
        </div>

        <div className="flex items-center ml-4">
          <WAStatusBadge />
        </div>

        {/* Tabs */}
        <nav className="flex-1 flex items-center justify-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* User Auth */}
        <div className="flex items-center gap-4 min-w-[140px] justify-end">
          {!mounted ? (
            <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
          ) : status === "authenticated" ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Logged in as</p>
                <p className="text-xs font-bold text-gray-800">{session.user?.name}</p>
              </div>
              <div className="group relative">
                {session.user?.image ? (
                  <img src={session.user.image} alt="User" className="w-8 h-8 rounded-full border-2 border-white shadow-sm ring-1 ring-gray-100" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                    {session.user?.name?.charAt(0)}
                  </div>
                )}
                <button 
                  onClick={() => signOut()}
                  className="absolute right-0 top-10 bg-white border border-gray-100 shadow-xl rounded-xl px-3 py-2 text-xs font-bold text-red-500 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto whitespace-nowrap"
                >
                  <LogOut size={12} /> Sign Out
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => signIn("google")}
              className="bg-gray-900 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
            >
              <LogIn size={14} /> Login with Google
            </button>
          )}
          
          <div className="h-4 w-px bg-gray-100 mx-1 hidden sm:block"></div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden sm:block">Demo</span>
            <button
              onClick={() => setDemoMode((p) => !p)}
              className={`relative w-10 h-5 rounded-full transition-colors ${demoMode ? "bg-green-500" : "bg-gray-300"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${demoMode ? "translate-x-5" : "translate-x-0"}`}
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
            {activeTab === "client" && (
              <ClientView tasks={tasks} onMarkDone={markDone} />
            )}
            {activeTab === "employee" && (
              <EmployeeView tasks={tasks} onMarkDone={markDone} />
            )}
            {activeTab === "whatsapp" && <WhatsAppView />}
            {activeTab === "email" && <EmailView onToast={addToast} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
