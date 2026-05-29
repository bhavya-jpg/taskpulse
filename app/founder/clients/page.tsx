"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BarChart2,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  FolderOpen,
  Inbox,
  Layers,
  Loader2,
  Mail,
  MessageCircle,
  Moon,
  Plus,
  Sparkles,
  Sun,
  User,
  Users,
  Video,
  X,
  Activity,
  Zap,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// =============================================================================
// TYPES
// =============================================================================

type Priority = "High" | "Medium" | "Low";
type Source = "email" | "slack" | "zoom" | "google_meet" | "fathom" | "whatsapp" | "teams" | "manual";
type TaskStatus = "pending" | "done";

// Agency workflow statuses for display
type WorkflowStatus =
  | "Needs Review"
  | "To Do"
  | "In Progress"
  | "Internal Review"
  | "Waiting for Client"
  | "Blocked"
  | "Completed";

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
  status: TaskStatus;
  confidence: number;
  sourceMessage: string;
  sourceMessageId?: string | null;
  isBlocked?: boolean;
  blockerNote?: string;
  trackedByFounder?: boolean;
}

interface Stakeholder {
  id: string;
  name: string;
  email?: string;
  slackId?: string;
  role: string;
  category?: string;
  clientName: string;
}

type WorkspaceTab = "overview" | "tasks" | "stakeholders" | "meetings" | "files" | "activity";

// =============================================================================
// CONSTANTS
// =============================================================================

const STAKEHOLDER_ROLES = [
  "Account Manager",
  "Strategist",
  "Designer",
  "Editor",
  "Performance Marketer",
  "Client POC",
  "Founder",
  "Vendor",
  "Freelancer",
];

const TASK_CATEGORIES = ["Design", "Content", "Video", "Reporting", "Strategy", "Performance"];

const WORKFLOW_STATUSES: { label: WorkflowStatus; color: string; bg: string; border: string }[] = [
  { label: "Needs Review", color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50/60 dark:bg-amber-500/10", border: "border-amber-200/60 dark:border-amber-500/20" },
  { label: "To Do", color: "text-slate-600 dark:text-slate-300", bg: "bg-slate-100/60 dark:bg-slate-700/20", border: "border-slate-200/70 dark:border-slate-600/40" },
  { label: "In Progress", color: "text-sky-700 dark:text-sky-300", bg: "bg-sky-50/60 dark:bg-sky-500/10", border: "border-sky-200/60 dark:border-sky-500/20" },
  { label: "Internal Review", color: "text-violet-700 dark:text-violet-300", bg: "bg-violet-50/60 dark:bg-violet-500/10", border: "border-violet-200/60 dark:border-violet-500/20" },
  { label: "Waiting for Client", color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50/60 dark:bg-amber-500/10", border: "border-amber-200/60 dark:border-amber-500/20" },
  { label: "Blocked", color: "text-rose-700 dark:text-rose-300", bg: "bg-rose-50/60 dark:bg-rose-500/10", border: "border-rose-200/60 dark:border-rose-500/20" },
  { label: "Completed", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50/60 dark:bg-emerald-500/10", border: "border-emerald-200/60 dark:border-emerald-500/20" },
];

const PRIORITY_CONFIG: Record<Priority, { dot: string; text: string; bg: string; border: string }> = {
  High: { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50/60 dark:bg-amber-500/10", border: "border-amber-200/60 dark:border-amber-500/20" },
  Medium: { dot: "bg-teal-500", text: "text-teal-700 dark:text-teal-300", bg: "bg-teal-50/60 dark:bg-teal-500/10", border: "border-teal-200/60 dark:border-teal-500/20" },
  Low: { dot: "bg-slate-500", text: "text-slate-600 dark:text-slate-300", bg: "bg-slate-100/60 dark:bg-slate-700/20", border: "border-slate-200/70 dark:border-slate-600/40" },
};

// =============================================================================
// HELPERS
// =============================================================================

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function isOverdue(dateStr: string) {
  return new Date(dateStr) < new Date(new Date().toDateString());
}

function getWorkflowStatus(task: Task): WorkflowStatus {
  if (task.status === "done") return "Completed";
  if (task.isBlocked) return "Blocked";
  if (task.confidence < 85) return "Needs Review";
  // Distribute realistic statuses based on hash for demo
  const hash = typeof task.id === "string" ? task.id.charCodeAt(0) : task.id;
  const statuses: WorkflowStatus[] = ["To Do", "In Progress", "Internal Review", "Waiting for Client"];
  return statuses[hash % statuses.length];
}

function getWorkflowStatusStyle(status: WorkflowStatus) {
  return WORKFLOW_STATUSES.find((s) => s.label === status) || WORKFLOW_STATUSES[1];
}

function getSourceIcon(source: Source) {
  switch (source) {
    case "email":
      return <Mail size={11} className="text-teal-500" />;
    case "slack":
      return <MessageCircle size={11} className="rotate-90 text-teal-500" />;
    case "zoom":
    case "google_meet":
    case "fathom":
      return <Video size={11} className="text-teal-500" />;
    default:
      return <MessageCircle size={11} className="text-teal-500" />;
  }
}

function getSourceLabel(source: Source) {
  switch (source) {
    case "email": return "Gmail";
    case "slack": return "Slack";
    case "zoom": return "Zoom";
    case "google_meet": return "Google Meet";
    case "fathom": return "Fathom";
    default: return "Manual";
  }
}

function getClientColors(client: string) {
  const predefined: Record<string, { bg: string; text: string; border: string; header: string }> = {
    Flipkart: { bg: "bg-teal-50/80 dark:bg-teal-500/10", text: "text-teal-700 dark:text-teal-300", border: "border-teal-200/60 dark:border-teal-500/20", header: "bg-teal-600" },
    Zomato: { bg: "bg-amber-50/80 dark:bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200/60 dark:border-amber-500/20", header: "bg-amber-500" },
    Amazon: { bg: "bg-slate-100/80 dark:bg-slate-700/20", text: "text-slate-700 dark:text-slate-200", border: "border-slate-200/70 dark:border-slate-600/40", header: "bg-slate-700" },
    Google: { bg: "bg-teal-50/80 dark:bg-teal-500/10", text: "text-teal-700 dark:text-teal-300", border: "border-teal-200/60 dark:border-teal-500/20", header: "bg-teal-600" },
  };
  if (client && predefined[client]) return predefined[client];
  const palettes = [
    { bg: "bg-indigo-50/80 dark:bg-indigo-500/10", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-200/60 dark:border-indigo-500/20", header: "bg-indigo-600" },
    { bg: "bg-rose-50/80 dark:bg-rose-500/10", text: "text-rose-700 dark:text-rose-300", border: "border-rose-200/60 dark:border-rose-500/20", header: "bg-rose-600" },
    { bg: "bg-emerald-50/80 dark:bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200/60 dark:border-emerald-500/20", header: "bg-emerald-600" },
    { bg: "bg-violet-50/80 dark:bg-violet-500/10", text: "text-violet-700 dark:text-violet-300", border: "border-violet-200/60 dark:border-violet-500/20", header: "bg-violet-600" },
    { bg: "bg-sky-50/80 dark:bg-sky-500/10", text: "text-sky-700 dark:text-sky-300", border: "border-sky-200/60 dark:border-sky-500/20", header: "bg-sky-600" },
  ];
  const str = client || "General";
  let hashVal = 0;
  for (let i = 0; i < str.length; i++) {
    hashVal = str.charCodeAt(i) + ((hashVal << 5) - hashVal);
  }
  return palettes[Math.abs(hashVal) % palettes.length];
}

function getStakeholdersStorageKey(company: string) {
  return `taskpulse_stakeholders_${company}`;
}

function loadStakeholders(company: string): Stakeholder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getStakeholdersStorageKey(company));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStakeholders(company: string, stakeholders: Stakeholder[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getStakeholdersStorageKey(company), JSON.stringify(stakeholders));
}

// =============================================================================
// SMALL COMPONENTS
// =============================================================================

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
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

function EmptyPlaceholder({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700/40 flex items-center justify-center mb-4">
        {icon}
      </div>
      <p className="text-slate-700 dark:text-slate-200 text-sm font-semibold mb-1">{title}</p>
      <p className="text-slate-500 dark:text-slate-400 text-xs max-w-xs">{subtitle}</p>
    </div>
  );
}

function SourceBadge({ source }: { source: Source }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-slate-100/70 dark:bg-slate-700/30 border-slate-200/60 dark:border-slate-600/50 text-slate-700 dark:text-slate-200">
      {getSourceIcon(source)}
      {getSourceLabel(source)}
    </span>
  );
}

function StatusChip({ status }: { status: WorkflowStatus }) {
  const style = getWorkflowStatusStyle(status);
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md border ${style.bg} ${style.border} ${style.color}`}>
      {status}
    </span>
  );
}

// =============================================================================
// ADD STAKEHOLDER MODAL
// =============================================================================

function AddStakeholderModal({
  isOpen,
  onClose,
  onAdd,
  clientName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (stakeholder: Omit<Stakeholder, "id">) => void;
  clientName: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(STAKEHOLDER_ROLES[0]);
  const [category, setCategory] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      email: email.trim() || undefined,
      role,
      category: category || undefined,
      clientName,
    });
    setName("");
    setEmail("");
    setRole(STAKEHOLDER_ROLES[0]);
    setCategory("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#15171b] rounded-2xl border border-slate-200/70 dark:border-slate-700/60 shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/70 dark:border-slate-700/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center">
                  <Users size={15} className="text-teal-600 dark:text-teal-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Add Stakeholder</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{clientName}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/40 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-slate-50 dark:bg-[#121316] border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email / Slack ID</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@company.com or @slack-handle"
                  className="w-full bg-slate-50 dark:bg-[#121316] border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="bg-slate-50 dark:bg-[#121316] border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer font-semibold"
                  >
                    {STAKEHOLDER_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="bg-slate-50 dark:bg-[#121316] border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer font-semibold"
                  >
                    <option value="">None</option>
                    {TASK_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/60">
                <button
                  type="submit"
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl py-2.5 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] border-none cursor-pointer"
                >
                  <Plus size={13} /> Add Stakeholder
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-white dark:bg-[#15171b] hover:bg-slate-100 dark:hover:bg-slate-700/40 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl py-2.5 transition-all border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// AI TASK INGESTION PANEL
// =============================================================================

interface ExtractedTask {
  title: string;
  dueDate: string;
  stakeholder: string;
  priority: Priority;
  source: string;
}

function AITaskIngestionPanel({ clientName, stakeholders }: { clientName: string; stakeholders: string[] }) {
  const [inputText, setInputText] = useState("");
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);

  const extractTasks = () => {
    if (!inputText.trim()) return;
    setIsExtracting(true);
    setTimeout(() => {
      const sentences = inputText.split(/[.\n!?]+/).filter((s) => s.trim().length > 10);
      const extracted: ExtractedTask[] = sentences.slice(0, 3).map((sentence, i) => {
        const trimmed = sentence.trim();
        const hasUrgent = /urgent|asap|immediately|today/i.test(trimmed);
        const hasFriday = /friday|by end|eod|tomorrow|next week/i.test(trimmed);
        const daysAhead = hasUrgent ? 1 : hasFriday ? 3 : 5 + i;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + daysAhead);

        return {
          title: trimmed.length > 60 ? trimmed.substring(0, 57) + "..." : trimmed,
          dueDate: dueDate.toISOString().split("T")[0],
          stakeholder: stakeholders[i % stakeholders.length] || "Unassigned",
          priority: hasUrgent ? "High" : hasFriday ? "Medium" : "Low",
          source: inputText.includes("@") ? "Gmail" : "Manual",
        };
      });
      setExtractedTasks(extracted);
      setIsExtracting(false);
    }, 1200);
  };

  return (
    <div className="bg-white dark:bg-[#15171b] rounded-2xl border border-slate-200/70 dark:border-slate-700/60 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200/70 dark:border-slate-700/60 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
          <Zap size={14} className="text-violet-600 dark:text-violet-300" />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">AI Task Extraction</h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Paste an email or message to extract tasks</p>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`e.g. "Can you send 3 influencer options by Friday? Also need the revised creatives ASAP."`}
          className="w-full bg-slate-50 dark:bg-[#121316] border border-slate-200/70 dark:border-slate-700/60 rounded-xl p-3 text-xs text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-violet-500 min-h-[80px] resize-none font-medium"
        />
        <button
          onClick={extractTasks}
          disabled={isExtracting || !inputText.trim()}
          className="self-end px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-semibold rounded-xl shadow-sm transition-all cursor-pointer border-none flex items-center gap-1.5 disabled:opacity-50"
        >
          {isExtracting ? (
            <><Loader2 size={12} className="animate-spin" /> Extracting...</>
          ) : (
            <><Sparkles size={12} /> Extract Tasks</>
          )}
        </button>

        <AnimatePresence>
          {extractedTasks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col gap-2 overflow-hidden"
            >
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={10} className="text-violet-500" />
                {extractedTasks.length} task{extractedTasks.length !== 1 ? "s" : ""} detected for {clientName}
              </div>
              {extractedTasks.map((task, i) => (
                <div
                  key={i}
                  className="bg-slate-50 dark:bg-[#121316] border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-3 flex flex-col gap-1.5"
                >
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{task.title}</p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${PRIORITY_CONFIG[task.priority].bg} ${PRIORITY_CONFIG[task.priority].border} ${PRIORITY_CONFIG[task.priority].text}`}>
                      <span className={`w-1 h-1 rounded-full ${PRIORITY_CONFIG[task.priority].dot}`} />
                      {task.priority}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                      <User size={9} /> {task.stakeholder}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                      <Calendar size={9} /> {formatDate(task.dueDate)}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                      <Mail size={9} /> {task.source}
                    </span>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// =============================================================================
// WORKSPACE TABS
// =============================================================================

function OverviewTab({ clientName, tasks, stakeholders, cc }: { clientName: string; tasks: Task[]; stakeholders: Stakeholder[]; cc: ReturnType<typeof getClientColors> }) {
  const activeTasks = tasks.filter((t) => t.status === "pending");
  const completedTasks = tasks.filter((t) => t.status === "done");
  const overdueTasks = activeTasks.filter((t) => isOverdue(t.deadline));
  const waitingForClient = activeTasks.filter((t) => getWorkflowStatus(t) === "Waiting for Client");

  const sources = Array.from(new Set(tasks.map((t) => t.source)));
  const stakeholderNames = Array.from(new Set([...tasks.map((t) => t.assignedTo), ...stakeholders.map((s) => s.name)]));

  const healthScore = tasks.length === 0 ? 100 : Math.round(((tasks.length - overdueTasks.length) / tasks.length) * 100);
  const healthColor = healthScore >= 80 ? "text-emerald-600 dark:text-emerald-400" : healthScore >= 50 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400";
  const healthBg = healthScore >= 80 ? "bg-emerald-50 dark:bg-emerald-500/10" : healthScore >= 50 ? "bg-amber-50 dark:bg-amber-500/10" : "bg-rose-50 dark:bg-rose-500/10";

  // Upcoming deadlines (next 7 days)
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcoming = activeTasks
    .filter((t) => {
      const d = new Date(t.deadline);
      return d >= now && d <= weekAhead;
    })
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left — Operational Insights */}
      <div className="lg:col-span-3 flex flex-col gap-5">
        {/* Project Health + Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={`${healthBg} rounded-2xl p-4 flex flex-col items-center justify-center border border-slate-200/50 dark:border-slate-700/40`}>
            <p className={`text-3xl font-semibold ${healthColor}`}>{healthScore}%</p>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Health</p>
          </div>
          <div className="bg-white dark:bg-[#15171b] rounded-2xl p-4 flex flex-col items-center justify-center border border-slate-200/70 dark:border-slate-700/60">
            <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{activeTasks.length}</p>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Active</p>
          </div>
          <div className="bg-white dark:bg-[#15171b] rounded-2xl p-4 flex flex-col items-center justify-center border border-slate-200/70 dark:border-slate-700/60">
            <p className="text-3xl font-semibold text-amber-600 dark:text-amber-400">{overdueTasks.length}</p>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Overdue</p>
          </div>
          <div className="bg-white dark:bg-[#15171b] rounded-2xl p-4 flex flex-col items-center justify-center border border-slate-200/70 dark:border-slate-700/60">
            <p className="text-3xl font-semibold text-slate-600 dark:text-slate-300">{waitingForClient.length}</p>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Waiting</p>
          </div>
        </div>

        {/* Connected Sources */}
        <div className="bg-white dark:bg-[#15171b] rounded-2xl border border-slate-200/70 dark:border-slate-700/60 p-4">
          <h4 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Connected Sources</h4>
          <div className="flex flex-wrap gap-2">
            {sources.length > 0 ? sources.map((src) => (
              <SourceBadge key={src} source={src} />
            )) : (
              <span className="text-[10px] text-slate-400 italic">No sources detected</span>
            )}
          </div>
        </div>

        {/* Stakeholder Summary */}
        <div className="bg-white dark:bg-[#15171b] rounded-2xl border border-slate-200/70 dark:border-slate-700/60 p-4">
          <h4 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Stakeholder Summary</h4>
          <div className="flex flex-wrap gap-2">
            {stakeholderNames.map((name) => {
              const sh = stakeholders.find((s) => s.name === name);
              return (
                <div key={name} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-[#121316] border border-slate-200/60 dark:border-slate-700/60 rounded-xl">
                  <div className="w-5 h-5 rounded-full bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center border border-teal-200/60 dark:border-teal-500/20">
                    <User size={10} className="text-teal-600 dark:text-teal-300" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{name}</span>
                  {sh && <span className="text-[10px] text-slate-400 dark:text-slate-500">· {sh.role}</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Project Summary */}
        <div className="bg-white dark:bg-[#15171b] rounded-2xl border border-slate-200/70 dark:border-slate-700/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={12} className="text-violet-500" />
            <h4 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">AI Project Summary</h4>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {clientName} account has {tasks.length} total tasks with {completedTasks.length} completed ({tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}% completion rate).
            {overdueTasks.length > 0 ? ` There are ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""} that need immediate attention.` : " All active tasks are on track."}
            {waitingForClient.length > 0 ? ` ${waitingForClient.length} task${waitingForClient.length > 1 ? "s are" : " is"} waiting for client response.` : ""}
            {" "}The team has {stakeholderNames.length} active stakeholder{stakeholderNames.length !== 1 ? "s" : ""} working across{" "}
            {sources.length} communication channel{sources.length !== 1 ? "s" : ""}.
          </p>
        </div>

        {/* AI Ingestion */}
        <AITaskIngestionPanel clientName={clientName} stakeholders={stakeholderNames} />
      </div>

      {/* Right — Timeline & Activity */}
      <div className="lg:col-span-2 flex flex-col gap-5">
        {/* Upcoming Deadlines */}
        <div className="bg-white dark:bg-[#15171b] rounded-2xl border border-slate-200/70 dark:border-slate-700/60 p-4">
          <h4 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Calendar size={11} /> Upcoming Deadlines
          </h4>
          {upcoming.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic py-2">No deadlines in the next 7 days</p>
          ) : (
            <div className="flex flex-col gap-2">
              {upcoming.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{t.title}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{t.assignedTo}</p>
                  </div>
                  <span className={`text-[10px] font-semibold ${isOverdue(t.deadline) ? "text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-300"}`}>
                    {formatDate(t.deadline)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-[#15171b] rounded-2xl border border-slate-200/70 dark:border-slate-700/60 p-4">
          <h4 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Activity size={11} /> Recent Activity
          </h4>
          <div className="flex flex-col gap-0">
            {tasks.slice(0, 6).map((t, i) => (
              <div key={t.id} className="flex items-start gap-2.5 py-2.5 border-b border-slate-100/70 dark:border-slate-800/60 last:border-0">
                <div className="flex flex-col items-center mt-0.5">
                  <div className={`w-2 h-2 rounded-full ${t.status === "done" ? "bg-emerald-500" : isOverdue(t.deadline) ? "bg-amber-500" : "bg-teal-500"}`} />
                  {i < Math.min(tasks.length - 1, 5) && <div className="w-px h-full bg-slate-200 dark:bg-slate-700 mt-1" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">{t.title}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {t.status === "done" ? "Completed" : isOverdue(t.deadline) ? "Overdue" : "Active"} · {t.assignedTo} · via {getSourceLabel(t.source)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white dark:bg-[#15171b] rounded-2xl border border-slate-200/70 dark:border-slate-700/60 p-4">
          <h4 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Overall Progress</h4>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-100 dark:bg-slate-700/40 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full ${cc.header} transition-all duration-500`}
                style={{ width: tasks.length ? `${(completedTasks.length / tasks.length) * 100}%` : "0%" }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {completedTasks.length}/{tasks.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TasksTab({ tasks }: { tasks: Task[] }) {
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  const filteredTasks = filter === "all" ? tasks : tasks.filter((t) => getWorkflowStatus(t) === filter);

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-white dark:bg-[#15171b] rounded-2xl border border-slate-200/70 dark:border-slate-700/60 shadow-sm">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border-0 ${
            filter === "all" ? "bg-teal-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/40"
          }`}
        >
          All ({tasks.length})
        </button>
        {WORKFLOW_STATUSES.map((ws) => {
          const count = tasks.filter((t) => getWorkflowStatus(t) === ws.label).length;
          if (count === 0) return null;
          return (
            <button
              key={ws.label}
              onClick={() => setFilter(ws.label)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border-0 ${
                filter === ws.label ? "bg-teal-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/40"
              }`}
            >
              {ws.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Task Table */}
      {filteredTasks.length === 0 ? (
        <EmptyPlaceholder
          icon={<Inbox size={20} className="text-slate-400" />}
          title="No tasks found"
          subtitle="Try adjusting your filter or add new tasks."
        />
      ) : (
        <div className="bg-white dark:bg-[#15171b] rounded-2xl border border-slate-200/70 dark:border-slate-700/60 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 dark:bg-[#121316] border-b border-slate-200/70 dark:border-slate-700/60 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <div className="col-span-4">Task</div>
            <div className="col-span-2">Stakeholder</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1">Priority</div>
            <div className="col-span-1">Due</div>
            <div className="col-span-2">Source</div>
          </div>

          {/* Rows */}
          {filteredTasks.map((task) => {
            const wfStatus = getWorkflowStatus(task);
            const overdue = isOverdue(task.deadline) && task.status !== "done";
            const isExpanded = expandedId === task.id;

            return (
              <div key={task.id}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : task.id)}
                  className="w-full grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors cursor-pointer bg-transparent border-l-0 border-r-0 border-t-0 text-left"
                >
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    <ChevronRight size={12} className={`text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`} />
                    <span className={`text-xs font-semibold truncate ${task.status === "done" ? "text-slate-400 dark:text-slate-500 line-through" : "text-slate-800 dark:text-slate-200"}`}>
                      {task.title}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center border border-teal-200/60 dark:border-teal-500/20 flex-shrink-0">
                      <User size={9} className="text-teal-600 dark:text-teal-300" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{task.assignedTo}</span>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <StatusChip status={wfStatus} />
                  </div>
                  <div className="col-span-1 flex items-center">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${PRIORITY_CONFIG[task.priority].bg} ${PRIORITY_CONFIG[task.priority].border} ${PRIORITY_CONFIG[task.priority].text}`}>
                      <span className={`w-1 h-1 rounded-full ${PRIORITY_CONFIG[task.priority].dot}`} />
                      {task.priority}
                    </span>
                  </div>
                  <div className="col-span-1 flex items-center">
                    <span className={`text-[11px] font-semibold ${overdue ? "text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-300"}`}>
                      {formatDate(task.deadline)}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <SourceBadge source={task.source} />
                  </div>
                </button>

                {/* Expandable source context */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 py-3 bg-slate-50/50 dark:bg-[#121316]/50 border-b border-slate-100 dark:border-slate-800/60">
                        <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Source Context</div>
                        <div className="bg-white dark:bg-[#15171b] border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-3 relative">
                          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-teal-500 rounded-l-xl" />
                          <div className="flex items-center gap-2 mb-1.5">
                            <SourceBadge source={task.source} />
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{task.sourceGroup}</span>
                          </div>
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium pl-1">
                            "{task.sourceMessage}"
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StakeholdersTab({
  clientName,
  tasks,
  stakeholders,
  onAddStakeholder,
}: {
  clientName: string;
  tasks: Task[];
  stakeholders: Stakeholder[];
  onAddStakeholder: () => void;
}) {
  const [expandedName, setExpandedName] = useState<string | null>(null);

  // All stakeholder names from both tasks and registered stakeholders
  const allNames = Array.from(new Set([...tasks.map((t) => t.assignedTo), ...stakeholders.map((s) => s.name)]));

  const getMappingData = (name: string) => {
    const assigned = tasks.filter((t) => t.assignedTo === name);
    const pending = assigned.filter((t) => t.status === "pending").length;
    const completed = assigned.filter((t) => t.status === "done").length;
    return { assigned: assigned.length, pending, completed, tasks: assigned };
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Stakeholder List */}
      <div className="bg-white dark:bg-[#15171b] rounded-2xl border border-slate-200/70 dark:border-slate-700/60 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/70 dark:border-slate-700/60">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{clientName} Stakeholders</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{allNames.length} people associated with this account</p>
          </div>
          <button
            onClick={onAddStakeholder}
            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-semibold rounded-xl shadow-sm transition-all cursor-pointer border-none flex items-center gap-1.5"
          >
            <Plus size={12} /> Add Stakeholder
          </button>
        </div>

        <div className="px-4 py-2">
          {allNames.map((name) => {
            const sh = stakeholders.find((s) => s.name === name);
            return (
              <div key={name} className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800/50 last:border-0">
                <div className="w-8 h-8 rounded-full bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center border border-teal-200/60 dark:border-teal-500/20">
                  <User size={14} className="text-teal-600 dark:text-teal-300" />
                </div>
                <div className="flex-1">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{name}</span>
                  {sh && <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-2">— {sh.role}</span>}
                </div>
                {sh?.email && <span className="text-[10px] text-slate-400 dark:text-slate-500">{sh.email}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Mapping Table */}
      <div className="bg-white dark:bg-[#15171b] rounded-2xl border border-slate-200/70 dark:border-slate-700/60 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200/70 dark:border-slate-700/60">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Stakeholder Task Mapping</h3>
        </div>

        {/* Header */}
        <div className="grid grid-cols-4 gap-2 px-4 py-2.5 bg-slate-50 dark:bg-[#121316] border-b border-slate-200/70 dark:border-slate-700/60 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <div>Stakeholder</div>
          <div className="text-center">Assigned</div>
          <div className="text-center">Pending</div>
          <div className="text-center">Completed</div>
        </div>

        {allNames.map((name) => {
          const data = getMappingData(name);
          const isExpanded = expandedName === name;

          return (
            <div key={name}>
              <button
                onClick={() => setExpandedName(isExpanded ? null : name)}
                className="w-full grid grid-cols-4 gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors cursor-pointer bg-transparent border-l-0 border-r-0 border-t-0 text-left"
              >
                <div className="flex items-center gap-2">
                  <ChevronRight size={12} className={`text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{name}</span>
                </div>
                <div className="text-center text-xs font-semibold text-slate-700 dark:text-slate-300">{data.assigned}</div>
                <div className="text-center text-xs font-semibold text-amber-600 dark:text-amber-400">{data.pending}</div>
                <div className="text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">{data.completed}</div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 py-3 bg-slate-50/50 dark:bg-[#121316]/50 border-b border-slate-100 dark:border-slate-800/50">
                      {data.tasks.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic py-1">No tasks assigned</p>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {data.tasks.map((t) => (
                            <div key={t.id} className="flex items-center justify-between gap-2 py-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.status === "done" ? "bg-emerald-500" : "bg-teal-500"}`} />
                                <span className={`text-[11px] font-medium truncate ${t.status === "done" ? "text-slate-400 dark:text-slate-500 line-through" : "text-slate-700 dark:text-slate-300"}`}>
                                  {t.title}
                                </span>
                              </div>
                              <StatusChip status={getWorkflowStatus(t)} />
                            </div>
                          ))}
                        </div>
                      )}
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

function MeetingsPlaceholderTab({ clientName }: { clientName: string }) {
  return (
    <EmptyPlaceholder
      icon={<Video size={20} className="text-slate-400" />}
      title={`No meetings found for ${clientName}`}
      subtitle="Meetings related to this client will appear here once detected from your calendar or meeting integrations."
    />
  );
}

function FilesPlaceholderTab({ clientName }: { clientName: string }) {
  return (
    <EmptyPlaceholder
      icon={<FileText size={20} className="text-slate-400" />}
      title="No files attached yet"
      subtitle={`Files and documents related to ${clientName} will be listed here in future updates.`}
    />
  );
}

function ActivityLogTab({ tasks, clientName }: { tasks: Task[]; clientName: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/activity-logs?client=${encodeURIComponent(clientName)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (e) {
      console.error("Failed to fetch logs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [clientName]);

  // Filtering logic
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Search Query Filter
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const titleMatch = log.event_name?.toLowerCase().includes(query);
        const descMatch = log.description?.toLowerCase().includes(query);
        if (!titleMatch && !descMatch) return false;
      }

      // 2. Event Type Filter
      if (filterType !== "all" && log.event_type !== filterType) {
        return false;
      }

      // 3. Date Range Filter
      if (dateFilter !== "all") {
        const logDate = new Date(log.created_at).getTime();
        const now = Date.now();
        const diff = now - logDate;
        if (dateFilter === "today" && diff > 24 * 3600 * 1000) return false;
        if (dateFilter === "week" && diff > 7 * 24 * 3600 * 1000) return false;
        if (dateFilter === "month" && diff > 30 * 24 * 3600 * 1000) return false;
      }

      return true;
    });
  }, [logs, searchQuery, filterType, dateFilter]);

  const getLogIcon = (type: string) => {
    switch (type) {
      case "meeting":
        return <Video size={11} className="text-indigo-600 dark:text-indigo-300" />;
      case "task":
        return <CheckCircle2 size={11} className="text-teal-600 dark:text-teal-300" />;
      case "communication":
        return <Mail size={11} className="text-violet-600 dark:text-violet-300" />;
      case "client":
        return <Briefcase size={11} className="text-amber-600 dark:text-amber-300" />;
      default:
        return <Activity size={11} className="text-slate-600 dark:text-slate-300" />;
    }
  };

  const getLogColorClass = (type: string) => {
    switch (type) {
      case "meeting":
        return "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/25";
      case "task":
        return "bg-teal-50 dark:bg-teal-500/10 border-teal-100 dark:border-teal-500/25";
      case "communication":
        return "bg-violet-50 dark:bg-violet-500/10 border-violet-100 dark:border-violet-500/25";
      case "client":
        return "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/25";
      default:
        return "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60";
    }
  };

  return (
    <div className="bg-white dark:bg-[#15171b] border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div>
          <h3 className="text-sm font-semibold text-slate-850 dark:text-slate-200 flex items-center gap-2">
            <Activity size={16} className="text-teal-600 dark:text-teal-400" />
            Audit Activity Log Timeline
          </h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            A professional chronological history & audit trail for {clientName} whitelisted brand.
          </p>
        </div>
      </div>

      {/* Control bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="Search activity events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-slate-50 dark:bg-[#101114] border border-slate-200/70 dark:border-slate-800/85 rounded-xl px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-teal-500 font-semibold"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-50 dark:bg-[#101114] border border-slate-200/70 dark:border-slate-800/85 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-650 dark:text-slate-350 outline-none cursor-pointer"
          >
            <option value="all">All Event Types</option>
            <option value="task">Deliverable Tasks</option>
            <option value="meeting">Sync Meetings</option>
            <option value="communication">Channel Syncs</option>
            <option value="client">Client Whitelist</option>
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-slate-50 dark:bg-[#101114] border border-slate-200/70 dark:border-slate-800/85 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-650 dark:text-slate-350 outline-none cursor-pointer"
          >
            <option value="all">All Dates</option>
            <option value="today">Past 24 Hours</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
          <Loader2 size={20} className="animate-spin text-teal-600" />
          <span className="text-xs font-medium">Loading audit history...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-10 text-slate-400 italic text-xs">
          No matching activity log events recorded.
        </div>
      ) : (
        <div className="relative border-l border-slate-150 dark:border-slate-800/80 pl-5 ml-3.5 space-y-5">
          {filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const formattedDate = new Date(log.created_at).toLocaleString("en-IN", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            });
            const hasMeta = log.metadata && Object.keys(log.metadata).length > 0;

            return (
              <div key={log.id} className="relative group">
                <span className={`absolute -left-[27.5px] top-1.5 w-4 h-4 rounded-full border border-slate-200 dark:border-slate-700/80 flex items-center justify-center shadow-sm ${getLogColorClass(log.event_type)}`}>
                  {getLogIcon(log.event_type)}
                </span>
                
                <div className="bg-slate-50/40 dark:bg-white/[0.01] hover:bg-slate-50 dark:hover:bg-white/[0.02] border border-slate-150/40 dark:border-slate-800/50 hover:border-slate-200 dark:hover:border-slate-800 rounded-xl p-3.5 transition-all flex flex-col gap-1.5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[9px] text-slate-455 dark:text-slate-500 font-extrabold uppercase tracking-wide">
                        {log.event_name}
                      </span>
                      <p className="text-xs font-bold text-slate-850 dark:text-slate-150 leading-snug">
                        {log.description}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-455 dark:text-slate-500 font-bold shrink-0 text-right">
                      {formattedDate}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/40 pt-2 mt-0.5">
                    <span className="text-[10px] text-slate-500 dark:text-slate-455 font-bold flex items-center gap-1">
                      <User size={10} className="text-teal-600 dark:text-teal-400" />
                      Triggered by: <span className="font-semibold text-slate-650 dark:text-slate-350">{log.user_name || "System"}</span>
                    </span>

                    {hasMeta && (
                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="text-[9px] font-bold text-teal-650 dark:text-teal-400 hover:underline flex items-center gap-0.5 cursor-pointer bg-transparent border-0 outline-none"
                      >
                        {isExpanded ? "Collapse Details" : "View Metadata"}
                        <ChevronRight size={10} className={`transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </button>
                    )}
                  </div>

                  {isExpanded && hasMeta && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 p-2.5 bg-slate-100/50 dark:bg-[#101114] border border-slate-200/50 dark:border-slate-800/80 rounded-lg overflow-x-auto text-[10px] font-mono text-slate-600 dark:text-slate-400 leading-normal"
                    >
                      <pre className="no-scrollbar whitespace-pre-wrap">{JSON.stringify(log.metadata, null, 2)}</pre>
                    </motion.div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CLIENT WORKSPACE
// =============================================================================

function ClientWorkspace({
  clientName,
  tasks,
  stakeholders,
  onBack,
  onAddStakeholder,
}: {
  clientName: string;
  tasks: Task[];
  stakeholders: Stakeholder[];
  onBack: () => void;
  onAddStakeholder: () => void;
}) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const cc = getClientColors(clientName);

  const WORKSPACE_TABS: { id: WorkspaceTab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <Layers size={14} /> },
    { id: "tasks", label: "Tasks", icon: <CheckCircle2 size={14} /> },
    { id: "stakeholders", label: "Stakeholders", icon: <Users size={14} /> },
    { id: "meetings", label: "Meetings", icon: <Video size={14} /> },
    { id: "files", label: "Files", icon: <FileText size={14} /> },
    { id: "activity", label: "Activity Log", icon: <Activity size={14} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/40 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
          >
            <ArrowLeft size={18} />
          </button>
          <div className={`w-10 h-10 rounded-xl ${cc.header} flex items-center justify-center`}>
            <span className="text-white text-sm font-semibold">{clientName.charAt(0)}</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{clientName} Workspace</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{tasks.length} tasks · {stakeholders.filter((s) => s.clientName === clientName).length + new Set(tasks.map((t) => t.assignedTo)).size} stakeholders</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-white dark:bg-[#15171b] rounded-2xl border border-slate-200/70 dark:border-slate-700/60 shadow-sm">
        {WORKSPACE_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border-0 ${
              activeTab === tab.id
                ? "bg-teal-600 text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/40"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "overview" && <OverviewTab clientName={clientName} tasks={tasks} stakeholders={stakeholders.filter((s) => s.clientName === clientName)} cc={cc} />}
          {activeTab === "tasks" && <TasksTab tasks={tasks} />}
          {activeTab === "stakeholders" && <StakeholdersTab clientName={clientName} tasks={tasks} stakeholders={stakeholders.filter((s) => s.clientName === clientName)} onAddStakeholder={onAddStakeholder} />}
          {activeTab === "meetings" && <MeetingsPlaceholderTab clientName={clientName} />}
          {activeTab === "files" && <FilesPlaceholderTab clientName={clientName} />}
          {activeTab === "activity" && <ActivityLogTab tasks={tasks} clientName={clientName} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// CLIENT CARD
// =============================================================================

function ClientCard({
  clientName,
  tasks,
  stakeholders,
  onOpenWorkspace,
  onAddStakeholder,
}: {
  clientName: string;
  tasks: Task[];
  stakeholders: Stakeholder[];
  onOpenWorkspace: () => void;
  onAddStakeholder: () => void;
}) {
  const cc = getClientColors(clientName);
  const activeTasks = tasks.filter((t) => t.status === "pending");
  const completedTasks = tasks.filter((t) => t.status === "done");
  const overdueTasks = activeTasks.filter((t) => isOverdue(t.deadline));
  const waitingForClient = activeTasks.filter((t) => getWorkflowStatus(t) === "Waiting for Client");

  const sources = Array.from(new Set(tasks.map((t) => t.source)));
  const assignees = Array.from(new Set(tasks.map((t) => t.assignedTo)));
  const allStakeholderNames = Array.from(new Set([...assignees, ...stakeholders.map((s) => s.name)]));
  const accountOwner = assignees[0] || "Unassigned";

  // Preview top 4 tasks
  const previewTasks = tasks.slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#15171b] rounded-2xl border border-slate-200/70 dark:border-slate-700/60 shadow-sm hover:shadow-md hover:border-teal-500/30 dark:hover:border-teal-500/30 transition-all duration-300 overflow-hidden flex flex-col"
    >
      {/* Card Header */}
      <div className={`${cc.header} px-5 py-3.5 flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <span className="text-white text-sm font-semibold">{clientName.charAt(0)}</span>
          </div>
          <h3 className="font-semibold text-white text-base">{clientName}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {sources.map((src) => (
            <span key={src} className="w-5 h-5 rounded-md bg-white/15 flex items-center justify-center" title={getSourceLabel(src)}>
              {getSourceIcon(src)}
            </span>
          ))}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex flex-col gap-3.5 flex-1">
        {/* Account Info */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Account Owner:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{accountOwner}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Stakeholders:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{allStakeholderNames.join(", ")}</span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-slate-50 dark:bg-[#121316] rounded-xl p-2 text-center border border-slate-200/50 dark:border-slate-700/40">
            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{activeTasks.length}</p>
            <p className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Active</p>
          </div>
          <div className="bg-slate-50 dark:bg-[#121316] rounded-xl p-2 text-center border border-slate-200/50 dark:border-slate-700/40">
            <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400">{completedTasks.length}</p>
            <p className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Done</p>
          </div>
          <div className="bg-slate-50 dark:bg-[#121316] rounded-xl p-2 text-center border border-slate-200/50 dark:border-slate-700/40">
            <p className="text-base font-semibold text-amber-600 dark:text-amber-400">{waitingForClient.length}</p>
            <p className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Pending</p>
          </div>
          <div className="bg-slate-50 dark:bg-[#121316] rounded-xl p-2 text-center border border-slate-200/50 dark:border-slate-700/40">
            <p className="text-base font-semibold text-rose-600 dark:text-rose-400">{overdueTasks.length}</p>
            <p className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Overdue</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-2.5">
          <div className="flex-1 bg-slate-100 dark:bg-slate-700/40 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${cc.header} transition-all duration-500`}
              style={{ width: tasks.length ? `${(completedTasks.length / tasks.length) * 100}%` : "0%" }}
            />
          </div>
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            {completedTasks.length}/{tasks.length}
          </span>
        </div>

        {/* Task Preview Table */}
        {previewTasks.length > 0 && (
          <div className="bg-slate-50 dark:bg-[#121316] rounded-xl border border-slate-200/50 dark:border-slate-700/40 overflow-hidden">
            <div className="grid grid-cols-10 gap-1 px-3 py-1.5 text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200/50 dark:border-slate-700/40">
              <div className="col-span-4">Task</div>
              <div className="col-span-2">Owner</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Due</div>
            </div>
            {previewTasks.map((t) => {
              const wf = getWorkflowStatus(t);
              return (
                <div key={t.id} className="grid grid-cols-10 gap-1 px-3 py-2 border-b border-slate-100/70 dark:border-slate-800/40 last:border-0">
                  <div className="col-span-4 text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">{t.title}</div>
                  <div className="col-span-2 text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">{t.assignedTo}</div>
                  <div className="col-span-2"><StatusChip status={wf} /></div>
                  <div className="col-span-2 text-[10px] font-semibold text-slate-600 dark:text-slate-400">{formatDate(t.deadline)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Card Footer Buttons */}
      <div className="px-4 pb-4 pt-1 flex gap-2">
        <button
          onClick={onOpenWorkspace}
          className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-semibold rounded-xl py-2 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] border-none cursor-pointer"
        >
          <FolderOpen size={12} /> Open Workspace
        </button>
        <button
          onClick={onAddStakeholder}
          className="flex-1 bg-white dark:bg-[#121316] hover:bg-slate-50 dark:hover:bg-slate-700/40 text-slate-600 dark:text-slate-300 text-[11px] font-semibold rounded-xl py-2 transition-all border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
        >
          <Users size={12} /> Add Stakeholder
        </button>
      </div>
    </motion.div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

function ClientCommandCenterContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientParam = searchParams.get("client");
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [activeClient, setActiveClient] = useState<string | null>(null);
  const [showStakeholderModal, setShowStakeholderModal] = useState(false);
  const [stakeholderModalClient, setStakeholderModalClient] = useState("");
  const [company, setCompany] = useState("");
  const [registeredClients, setRegisteredClients] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (clientParam) {
      setActiveClient(clientParam);
    }
  }, [clientParam]);

  // Load tasks from API
  useEffect(() => {
    if (status !== "authenticated") return;

    const loadTasks = async () => {
      try {
        const r = await fetch("/api/tasks");
        const d = await r.json();
        if (Array.isArray(d) && d.length > 0) {
          setTasks(d);
        }
      } catch {}
      setLoadingTasks(false);
    };

    loadTasks();
    const interval = setInterval(loadTasks, 5000);
    return () => clearInterval(interval);
  }, [status]);

  // Load profile company for stakeholder storage
  useEffect(() => {
    if (status !== "authenticated") return;
    const loadProfile = async () => {
      try {
        const r = await fetch("/api/profile");
        if (r.ok) {
          const d = await r.json();
          if (d?.profile?.company) {
            setCompany(d.profile.company);
            setStakeholders(loadStakeholders(d.profile.company));
          }
        }
      } catch {}
    };
    loadProfile();
  }, [status]);

  // Load registered clients from API
  useEffect(() => {
    if (status !== "authenticated") return;
    const loadClients = async () => {
      try {
        const r = await fetch("/api/clients");
        if (r.ok) {
          const d = await r.json();
          if (d.clients && Array.isArray(d.clients)) {
            setRegisteredClients(d.clients);
          }
        }
      } catch (err) {
        console.error("Failed to load registered clients:", err);
      }
    };
    loadClients();
    const interval = setInterval(loadClients, 5000);
    return () => clearInterval(interval);
  }, [status]);

  // Derive clients by combining manually whitelisted clients and tasks
  const clientNames = useMemo(() => {
    const registeredNames = registeredClients.map((c) => c.name);
    return Array.from(
      new Set([
        ...registeredNames,
        ...tasks.map((t) => t.client).filter((c) => c && c !== "General" && c !== "Unknown")
      ])
    ).sort();
  }, [tasks, registeredClients]);

  // Get tasks per client
  const getClientTasks = (clientName: string) => tasks.filter((t) => t.client === clientName);

  // Stakeholder management
  const addStakeholder = (data: Omit<Stakeholder, "id">) => {
    const newStakeholder: Stakeholder = {
      ...data,
      id: "sh-" + Date.now() + "-" + Math.random().toString(36).substr(2, 6),
    };
    const updated = [...stakeholders, newStakeholder];
    setStakeholders(updated);
    if (company) saveStakeholders(company, updated);
  };

  const openStakeholderModal = (clientName: string) => {
    setStakeholderModalClient(clientName);
    setShowStakeholderModal(true);
  };

  // Summary stats
  const totalActive = tasks.filter((t) => t.status === "pending").length;
  const totalOverdue = tasks.filter((t) => isOverdue(t.deadline) && t.status !== "done").length;
  const totalCompleted = tasks.filter((t) => t.status === "done").length;

  if (!mounted) return null;

  if (status === "loading" || loadingTasks) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f6f2] dark:bg-[#0b0c0e]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-500 font-semibold animate-pulse">Loading Command Center...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/founder");
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f7f6f2] dark:bg-[#0b0c0e] transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#f7f6f2]/90 dark:bg-[#0e0f12]/90 backdrop-blur-md border-b border-slate-200/70 dark:border-[#1c1d22] h-[64px] flex items-center px-6 transition-colors duration-300">
        <div className="flex items-center gap-4 min-w-[240px]">
          <Link
            href="/founder"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors no-underline"
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center text-xs font-semibold">TP</div>
            <span className="font-semibold text-slate-900 dark:text-white text-lg tracking-tight">TaskPulse</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-200 border border-teal-200/60 dark:border-teal-500/20">Command Center</span>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3 flex-shrink-0">
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
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{session.user.name?.split(" ")[0]}</span>
            </div>
          )}
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-700/40 transition-all border border-slate-200/60 dark:border-slate-600/50 shadow-sm flex items-center justify-center cursor-pointer"
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <AnimatePresence mode="wait">
          {activeClient ? (
            <motion.div
              key={`workspace-${activeClient}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <ClientWorkspace
                clientName={activeClient}
                tasks={getClientTasks(activeClient)}
                stakeholders={stakeholders}
                onBack={() => setActiveClient(null)}
                onAddStakeholder={() => openStakeholderModal(activeClient)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="card-grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-6"
            >
              {/* Page Header */}
              <div className="bg-white/80 dark:bg-[#15171b] rounded-3xl p-6 md:p-8 text-slate-900 dark:text-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden border border-slate-200/70 dark:border-slate-700/60">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(13,148,136,0.12),transparent_55%)]" />
                <div className="relative z-10 w-full">
                  <span className="text-xs uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400 font-semibold">Client Management</span>
                  <h1 className="text-2xl md:text-3xl font-semibold mt-3">Client Command Center</h1>
                  <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base max-w-3xl leading-relaxed mt-3">
                    Manage all your client accounts as operational hubs. Track stakeholders, monitor project health, and see task breakdowns per client — all in one place.
                  </p>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<Briefcase size={18} className="text-teal-600 dark:text-teal-300" />} label="Total Clients" value={clientNames.length} color="bg-teal-50 dark:bg-teal-500/10" />
                <StatCard icon={<BarChart2 size={18} className="text-sky-600 dark:text-sky-300" />} label="Active Tasks" value={totalActive} color="bg-sky-50 dark:bg-sky-500/10" />
                <StatCard icon={<Clock size={18} className="text-amber-600 dark:text-amber-300" />} label="Overdue" value={totalOverdue} color="bg-amber-50 dark:bg-amber-500/10" />
                <StatCard icon={<CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-300" />} label="Completed" value={totalCompleted} color="bg-emerald-50 dark:bg-emerald-500/10" />
              </div>

              {/* Client Cards Grid */}
              {clientNames.length === 0 ? (
                <EmptyPlaceholder
                  icon={<Briefcase size={24} className="text-slate-400" />}
                  title="No clients found"
                  subtitle="Tasks with identified clients will appear here. Create tasks from the Dashboard to get started."
                />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {clientNames.map((clientName) => (
                    <ClientCard
                      key={clientName}
                      clientName={clientName}
                      tasks={getClientTasks(clientName)}
                      stakeholders={stakeholders.filter((s) => s.clientName === clientName)}
                      onOpenWorkspace={() => setActiveClient(clientName)}
                      onAddStakeholder={() => openStakeholderModal(clientName)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Stakeholder Modal */}
      <AddStakeholderModal
        isOpen={showStakeholderModal}
        onClose={() => setShowStakeholderModal(false)}
        onAdd={addStakeholder}
        clientName={stakeholderModalClient}
      />
    </div>
  );
}

export default function ClientCommandCenterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f7f6f2] dark:bg-[#0b0c0e]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-500 font-semibold animate-pulse">Loading Command Center...</p>
        </div>
      </div>
    }>
      <ClientCommandCenterContent />
    </Suspense>
  );
}
