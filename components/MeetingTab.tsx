"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Video, FileText, Upload, Plus, Calendar as CalendarIcon, User, CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp, RefreshCw, Sparkles, List } from "lucide-react";
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface Meeting {
  id: string;
  title: string;
  platform: 'google_meet' | 'zoom' | 'teams' | 'manual' | 'fathom';
  meeting_date: string;
  summary: string;
  key_topics: string[];
  decisions: any[];
  transcript_url?: string;
}

function formatMarkdown(text: string) {
  if (!text) return null;

  // Helper to parse inline elements: bold (**text**) and links ([text](url))
  const parseInline = (lineText: string) => {
    let tokens: Array<{ type: 'text' | 'bold' | 'link'; content: string; url?: string }> = [
      { type: 'text', content: lineText }
    ];

    // 1. Process bold first:
    let newTokens: typeof tokens = [];
    for (const token of tokens) {
      if (token.type === 'text') {
        const parts = token.content.split(/\*\*([^*]+)\*\*/);
        for (let i = 0; i < parts.length; i++) {
          if (i % 2 === 1) {
            newTokens.push({ type: 'bold', content: parts[i] });
          } else if (parts[i]) {
            newTokens.push({ type: 'text', content: parts[i] });
          }
        }
      } else {
        newTokens.push(token);
      }
    }
    tokens = newTokens;

    // 2. Process links:
    newTokens = [];
    for (const token of tokens) {
      if (token.type === 'text' || token.type === 'bold') {
        const parts = token.content.split(/\[([^\]]+)\]\(([^)]+)\)/);
        for (let i = 0; i < parts.length; i += 3) {
          if (parts[i]) {
            newTokens.push({ type: token.type, content: parts[i] });
          }
          if (i + 1 < parts.length) {
            const linkText = parts[i + 1];
            const linkUrl = parts[i + 2];
            newTokens.push({ type: 'link', content: linkText, url: linkUrl });
          }
        }
      } else {
        newTokens.push(token);
      }
    }
    tokens = newTokens;

    return tokens.map((token, idx) => {
      if (token.type === 'bold') {
        return <strong key={idx} className="font-semibold text-slate-900 dark:text-white">{token.content}</strong>;
      }
      if (token.type === 'link') {
        return (
          <a
            key={idx}
            href={token.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 dark:text-teal-300 hover:text-teal-700 dark:hover:text-teal-200 underline font-medium inline-flex items-center gap-0.5 hover:opacity-90 transition-opacity"
          >
            {token.content}
          </a>
        );
      }
      return <span key={idx}>{token.content}</span>;
    });
  };

  const lines = text.split("\n");
  let inList = false;
  let listItems: React.ReactNode[] = [];
  const elements: React.ReactNode[] = [];

  const pushList = (key: number) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${key}`} className="list-disc pl-5 my-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      pushList(idx);
      return;
    }

    if (trimmed.startsWith("### ")) {
      pushList(idx);
      elements.push(
        <h4 key={idx} className="text-sm font-semibold text-teal-600 dark:text-teal-300 uppercase tracking-wider mt-4 mb-2">
          {parseInline(trimmed.substring(4))}
        </h4>
      );
    } else if (trimmed.startsWith("## ")) {
      pushList(idx);
      elements.push(
        <h3 key={idx} className="text-base font-semibold text-slate-800 dark:text-slate-100 mt-5 mb-3 border-b border-slate-200/70 dark:border-slate-700/60 pb-1">
          {parseInline(trimmed.substring(3))}
        </h3>
      );
    } else if (trimmed.startsWith("# ")) {
      pushList(idx);
      elements.push(
        <h2 key={idx} className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-4">
          {parseInline(trimmed.substring(2))}
        </h2>
      );
    }
    // List items starting with '-' or '*'
    else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      inList = true;
      const content = trimmed.substring(2);
      listItems.push(
        <li key={idx} className="leading-relaxed">
          {parseInline(content)}
        </li>
      );
    }
    // Numbered list items starting with digit + dot
    else if (/^\d+\.\s/.test(trimmed)) {
      pushList(idx);
      const match = trimmed.match(/^(\d+)\.\s(.*)/);
      if (match) {
        elements.push(
          <div key={idx} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300 my-1.5 pl-2 leading-relaxed">
            <span className="font-semibold text-teal-500 flex-shrink-0">{match[1]}.</span>
            <div>{parseInline(match[2])}</div>
          </div>
        );
      }
    }
    // Paragraph
    else {
      pushList(idx);
      elements.push(
        <p key={idx} className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed my-2">
          {parseInline(trimmed)}
        </p>
      );
    }
  });

  pushList(lines.length);

  return <div className="space-y-1">{elements}</div>;
}

interface MeetingTabProps {
  tasks?: any[];
  onUpdateTask?: (id: number | string, updatedFields: any) => Promise<void>;
}

export function MeetingTab({ tasks = [], onUpdateTask }: MeetingTabProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFathomSyncing, setIsFathomSyncing] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list');
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  
  const [uploadData, setUploadData] = useState({
    title: "",
    platform: "manual",
    date: new Date().toISOString().split('T')[0],
    participants: "",
    transcript: null as File | null,
  });

  const handleToggleTaskStatus = async (task: any) => {
    if (!onUpdateTask) return;
    const newStatus = task.status === "done" ? "pending" : "done";
    try {
      await onUpdateTask(task.id, { status: newStatus });
    } catch (err) {
      console.error("Failed to toggle task status", err);
    }
  };

  const fetchMeetings = async () => {
    try {
      const res = await fetch("/api/meetings");
      const data = await res.json();
      if (Array.isArray(data)) {
        setMeetings(data);
      }
    } catch (err) {
      console.error("Failed to fetch meetings", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarEvents = async () => {
    setCalendarError(null);
    try {
      const res = await fetch("/api/meetings/calendar");
      const data = await res.json();
      if (res.ok && data.success && data.events) {
        const formatted = data.events.map((ev: any) => ({
          ...ev,
          start: new Date(ev.start),
          end: new Date(ev.end || ev.start),
        }));
        setCalendarEvents(formatted);
      } else {
        setCalendarError(data.error || "Failed to fetch calendar events.");
      }
    } catch (err) {
      console.error("Failed to fetch calendar events", err);
      setCalendarError("Connection error. Failed to reach server.");
    }
  };

  const handleCalendarSync = async () => {
    setIsSyncingCalendar(true);
    try {
      await fetchCalendarEvents();
    } catch (err) {
      console.error("Calendar sync error", err);
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
    fetchCalendarEvents();
  }, []);

  const handleGoogleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/meetings/sync/google", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        if (data.processed.length > 0) {
          fetchMeetings();
        } else {
          alert(data.message || "No new meetings found.");
        }
      } else {
        alert(data.error || "Sync failed");
      }
    } catch (err) {
      console.error("Sync error", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFathomSync = async () => {
    setIsFathomSyncing(true);
    try {
      const res = await fetch("/api/meetings/sync/fathom", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        if (data.processed && data.processed.length > 0) {
          fetchMeetings();
        } else {
          alert(data.message || "All Fathom meetings are already synced.");
        }
      } else {
        alert(data.error || "Fathom sync failed");
      }
    } catch (err) {
      console.error("Fathom sync error", err);
      alert("Failed to sync Fathom meetings");
    } finally {
      setIsFathomSyncing(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    const formData = new FormData();
    formData.append("title", uploadData.title);
    formData.append("platform", uploadData.platform);
    formData.append("date", uploadData.date);
    formData.append("participants", uploadData.participants);
    
    // Add extra meta info if coming from calendar
    if ((uploadData as any).id) formData.append("eventId", (uploadData as any).id);
    if ((uploadData as any).meetingType) formData.append("meetingType", (uploadData as any).meetingType);
    if ((uploadData as any).clientName) formData.append("clientName", (uploadData as any).clientName);

    if (uploadData.transcript) {
      formData.append("transcript", uploadData.transcript);
    }

    try {
      const res = await fetch("/api/meetings/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setIsUploading(false);
        // Refresh meetings list or add new one
        fetchMeetings();
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Video className="text-teal-600" /> AI Meeting Assistant
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleGoogleSync}
            disabled={isSyncing}
            className="bg-white dark:bg-[#15171b] border border-slate-200/70 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40 disabled:opacity-50"
          >
            {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} 
            Sync Google Meet
          </button>
          <button
            onClick={handleFathomSync}
            disabled={isFathomSyncing}
            className="bg-white dark:bg-[#15171b] border border-slate-200/70 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40 disabled:opacity-50 shadow-sm"
          >
            {isFathomSyncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} className="text-teal-500" />}
            Sync Fathom
          </button>
          <button
            onClick={() => {
              setUploadData({
                ...uploadData,
                title: "",
                platform: "manual",
                date: new Date().toISOString().split('T')[0],
              });
              setIsUploading(true);
            }}
            className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors transition-transform active:scale-95"
          >
            <Plus size={16} /> New Meeting Post
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_2fr] gap-8 items-start">
        {/* Left Side: Connection Guide */}
        <div className="bg-slate-100/70 dark:bg-[#15171b] p-6 md:p-8 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 tracking-wide uppercase">
              <Sparkles size={16} className="text-teal-500" />
              Connecting Meeting Assistants
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-medium">
              Integrate your conferencing tools to automatically transcribe discussions and extract actionable tasks via Gemini AI.
            </p>
          </div>

          <div className="space-y-6 text-sm text-slate-600 dark:text-slate-400">
            {/* Option 1: Fathom */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold flex items-center justify-center text-xs">1</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">Fathom Video Recorder (Recommended)</p>
              </div>
              <p className="text-xs text-slate-500 pl-7 leading-relaxed font-medium">
                Fathom records, transcribes, and highlights key moments in Zoom, Google Meet, or Microsoft Teams.
              </p>
              <div className="pl-7 space-y-1.5 text-xs text-slate-500 font-semibold">
                <p>• Sign up for a free account at <a href="https://fathom.video" target="_blank" rel="noreferrer" className="text-teal-600 hover:underline">fathom.video</a>.</p>
                <p>• Link it to your calendar so the Fathom companion app automatically joins your calls.</p>
                <p>• Hit the <strong className="text-teal-600 dark:text-teal-300">Sync Fathom</strong> button above to pull the summary and transcription directly.</p>
              </div>
            </div>

            {/* Option 2: Google Meet */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold flex items-center justify-center text-xs">2</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">Google Meet Calendars</p>
              </div>
              <p className="text-xs text-slate-500 pl-7 leading-relaxed font-medium">
                Sync Google Meet conversations scheduled on your professional Google Calendar.
              </p>
              <div className="pl-7 space-y-1.5 text-xs text-slate-500 font-semibold">
                <p>• Make sure you connect your corporate Google profile in the <strong className="text-teal-600 dark:text-teal-300">Email tab</strong>.</p>
                <p>• Ensure Google Meet transcripts or calendar details are linked to that email account.</p>
                <p>• Click <strong className="text-teal-600 dark:text-teal-300">Sync Google Meet</strong> to analyze upcoming/past meetings.</p>
              </div>
            </div>

            {/* Option 3: Manual Upload */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold flex items-center justify-center text-xs">3</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">Manual Transcript Uploads</p>
              </div>
              <p className="text-xs text-slate-500 pl-7 leading-relaxed font-medium">
                For custom platforms or one-off recordings:
              </p>
              <div className="pl-7 space-y-1.5 text-xs text-slate-500 font-semibold">
                <p>• Export your meeting transcript as a <code className="bg-slate-200/70 dark:bg-slate-700/30 px-1 py-0.5 rounded text-[10px]">.vtt</code> or <code className="bg-slate-200/70 dark:bg-slate-700/30 px-1 py-0.5 rounded text-[10px]">.txt</code> file.</p>
                <p>• Press the <strong className="text-teal-600 dark:text-teal-300">New Meeting Post</strong> button, enter title, and drag your file.</p>
                <p>• Click "Process Transcript" to let Gemini AI extract deliverables instantly.</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/30 rounded-xl p-4 flex gap-3 text-xs text-amber-900 dark:text-amber-200 font-medium">
            <AlertCircle className="flex-shrink-0 text-amber-600 dark:text-amber-300" size={16} />
            <p className="leading-relaxed">
              <strong>Tip:</strong> Meeting transcript analysis uses the high-performance Gemini 1.5 Pro model to accurately capture tasks, reassignments, and executive decisions.
            </p>
          </div>
        </div>

        {/* Right Side: Main Content */}
        <div className="space-y-6 w-full">
          <div className="flex bg-slate-100 dark:bg-[#15171b] p-1 rounded-xl w-fit border border-slate-200/70 dark:border-slate-700/60 shadow-sm">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'list' 
                  ? 'bg-white dark:bg-[#1e2025] text-slate-800 dark:text-slate-100 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <List size={16} /> Processed List
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'calendar' 
                  ? 'bg-white dark:bg-[#1e2025] text-slate-800 dark:text-slate-100 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <CalendarIcon size={16} /> Calendar View
            </button>
          </div>

          {isUploading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-[#15171b] border border-slate-200/70 dark:border-slate-700/60 rounded-2xl p-6 shadow-sm"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Upload Meeting Transcript</h3>
                <button onClick={() => setIsUploading(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer bg-transparent border-0 outline-none p-1 hover:bg-slate-100 dark:hover:bg-slate-700/40 rounded-lg transition-all flex items-center justify-center">
                  <Plus className="rotate-45" size={16} />
                </button>
              </div>
              
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Meeting Title</label>
                    <input
                      type="text"
                      required
                      placeholder="Q3 Planning Meeting"
                      className="w-full bg-slate-50 dark:bg-[#121316] border border-slate-200/70 dark:border-slate-700/60 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500/40 outline-none text-slate-800 dark:text-slate-200 font-semibold"
                      value={uploadData.title}
                      onChange={e => setUploadData({...uploadData, title: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Platform</label>
                    <select
                      className="w-full bg-slate-50 dark:bg-[#121316] border border-slate-200/70 dark:border-slate-700/60 rounded-lg px-4 py-2 text-sm outline-none text-slate-800 dark:text-slate-200 font-semibold cursor-pointer"
                      value={uploadData.platform}
                      onChange={e => setUploadData({...uploadData, platform: e.target.value})}
                    >
                      <option value="manual">Manual Upload</option>
                      <option value="zoom">Zoom</option>
                      <option value="google_meet">Google Meet</option>
                      <option value="teams">MS Teams</option>
                      <option value="fathom">Fathom</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Date</label>
                    <input
                      type="date"
                      className="w-full bg-slate-50 dark:bg-[#121316] border border-slate-200/70 dark:border-slate-700/60 rounded-lg px-4 py-2 text-sm outline-none text-slate-800 dark:text-slate-200 font-semibold cursor-pointer"
                      value={uploadData.date}
                      onChange={e => setUploadData({...uploadData, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Participants</label>
                    <input
                      type="text"
                      placeholder="John, Priya, Rahul"
                      className="w-full bg-slate-50 dark:bg-[#121316] border border-slate-200/70 dark:border-slate-700/60 rounded-lg px-4 py-2 text-sm outline-none text-slate-800 dark:text-slate-200 font-semibold"
                      value={uploadData.participants}
                      onChange={e => setUploadData({...uploadData, participants: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Transcript File (.vtt, .txt)</label>
                  <div className="border-2 border-dashed border-slate-200/70 dark:border-slate-700/60 rounded-xl p-8 text-center hover:border-teal-500 transition-colors cursor-pointer relative">
                    <input
                      type="file"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={e => setUploadData({...uploadData, transcript: e.target.files?.[0] || null})}
                    />
                    <Upload className="mx-auto text-slate-400 mb-2" size={32} />
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-semibold">
                      {uploadData.transcript ? uploadData.transcript.name : "Click to select or drag and drop"}
                    </p>
                  </div>
                </div>

                <button
                  disabled={isProcessing}
                  className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] border-none shadow-sm"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Processing transcript...
                    </>
                  ) : (
                    <>Process Transcript</>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* Calendar View */}
          {activeTab === 'calendar' && (
            <div className="bg-white dark:bg-[#15171b] border border-slate-200/70 dark:border-slate-700/60 rounded-2xl p-6 shadow-sm h-[650px] flex flex-col relative">
              {/* Custom CSS overrides for React Big Calendar to support beautiful dark mode */}
              <style dangerouslySetInnerHTML={{ __html: `
                .rbc-calendar {
                  font-family: inherit;
                }
                .rbc-toolbar {
                  margin-bottom: 16px;
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  flex-wrap: wrap;
                  gap: 8px;
                }
                .rbc-toolbar .rbc-toolbar-label {
                  font-weight: 700;
                  font-size: 1.1rem;
                  color: #1e293b;
                }
                .dark .rbc-toolbar .rbc-toolbar-label {
                  color: #f8fafc;
                }
                .rbc-btn-group button {
                  font-weight: 600 !important;
                  font-size: 0.8rem !important;
                  padding: 6px 12px !important;
                  border-radius: 8px !important;
                  border: 1px solid #e2e8f0 !important;
                  background-color: #ffffff !important;
                  color: #475569 !important;
                  cursor: pointer;
                  transition: all 0.15s ease;
                }
                .rbc-btn-group button:hover {
                  background-color: #f8fafc !important;
                  color: #0f766e !important;
                  border-color: #cbd5e1 !important;
                }
                .rbc-btn-group button.rbc-active {
                  background-color: #0f766e !important;
                  color: #ffffff !important;
                  border-color: #0f766e !important;
                  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
                }
                .rbc-btn-group button:first-child {
                  border-top-right-radius: 0 !important;
                  border-bottom-right-radius: 0 !important;
                }
                .rbc-btn-group button:last-child {
                  border-top-left-radius: 0 !important;
                  border-bottom-left-radius: 0 !important;
                }
                .rbc-btn-group button:not(:first-child):not(:last-child) {
                  border-radius: 0 !important;
                }

                .rbc-month-view {
                  border-radius: 12px !important;
                  overflow: hidden;
                  border: 1px solid #e2e8f0 !important;
                }
                .rbc-month-row {
                  border-top: 1px solid #e2e8f0 !important;
                }
                .rbc-day-bg {
                  border-left: 1px solid #e2e8f0 !important;
                  transition: background-color 0.2s ease;
                }
                .rbc-day-bg:hover {
                  background-color: rgba(15, 118, 110, 0.02);
                }
                .rbc-header {
                  border-bottom: 1px solid #e2e8f0 !important;
                  font-weight: 700 !important;
                  text-transform: uppercase;
                  font-size: 0.7rem !important;
                  letter-spacing: 0.05em;
                  color: #64748b;
                  padding: 10px 0 !important;
                  background-color: #f8fafc;
                }
                .rbc-header + .rbc-header {
                  border-left: 1px solid #e2e8f0 !important;
                }
                .rbc-off-range-bg {
                  background-color: #f8fafc !important;
                }
                .rbc-today {
                  background-color: rgba(15, 118, 110, 0.04) !important;
                }

                .rbc-event {
                  transition: all 0.2s ease;
                  font-weight: 600 !important;
                  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.04);
                }
                .rbc-event:hover {
                  transform: translateY(-1px);
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                  filter: brightness(1.08);
                }

                .rbc-time-view {
                  border-radius: 12px !important;
                  overflow: hidden;
                  border: 1px solid #e2e8f0 !important;
                }
                .rbc-time-header {
                  border-bottom: 1px solid #e2e8f0 !important;
                }
                .rbc-time-header-content {
                  border-left: 1px solid #e2e8f0 !important;
                }
                .rbc-time-content {
                  border-top: 1px solid #e2e8f0 !important;
                }
                .rbc-time-gutter {
                  background-color: #f8fafc;
                }
                .rbc-timeslot-group {
                  border-bottom: 1px solid #f1f5f9 !important;
                }
                .rbc-day-slot .rbc-time-slot {
                  border-top: 1px solid #f1f5f9 !important;
                }

                /* DARK MODE OVERRIDES */
                .dark .rbc-month-view,
                .dark .rbc-time-view {
                  border-color: #27272a !important;
                  background-color: #15171b !important;
                }
                .dark .rbc-month-row {
                  border-top: 1px solid #27272a !important;
                }
                .dark .rbc-day-bg {
                  border-left: 1px solid #27272a !important;
                }
                .dark .rbc-day-bg:hover {
                  background-color: rgba(20, 184, 166, 0.02) !important;
                }
                .dark .rbc-header {
                  border-bottom: 1px solid #27272a !important;
                  background-color: #121316 !important;
                  color: #a1a1aa !important;
                }
                .dark .rbc-header + .rbc-header {
                  border-left: 1px solid #27272a !important;
                }
                .dark .rbc-off-range-bg {
                  background-color: #1c1d22 !important;
                }
                .dark .rbc-today {
                  background-color: rgba(20, 184, 166, 0.08) !important;
                }
                .dark .rbc-btn-group button {
                  background-color: #1c1d22 !important;
                  color: #a1a1aa !important;
                  border-color: #27272a !important;
                }
                .dark .rbc-btn-group button:hover {
                  background-color: #27272a !important;
                  color: #2dd4bf !important;
                  border-color: #3f3f46 !important;
                }
                .dark .rbc-btn-group button.rbc-active {
                  background-color: #0f766e !important;
                  color: #ffffff !important;
                  border-color: #0f766e !important;
                }
                .dark .rbc-time-header {
                  border-bottom: 1px solid #27272a !important;
                }
                .dark .rbc-time-header-content {
                  border-left: 1px solid #27272a !important;
                }
                .dark .rbc-time-content {
                  border-top: 1px solid #27272a !important;
                }
                .dark .rbc-time-gutter {
                  background-color: #121316 !important;
                  border-right: 1px solid #27272a !important;
                }
                .dark .rbc-timeslot-group {
                  border-bottom: 1px solid #27272a !important;
                }
                .dark .rbc-day-slot .rbc-time-slot {
                  border-top: 1px solid #27272a !important;
                }
                .dark .rbc-show-more {
                  color: #2dd4bf !important;
                }
                .dark .rbc-show-more:hover {
                  color: #5eead4 !important;
                }
              ` }} />

              <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <CalendarIcon className="text-teal-600 dark:text-teal-400" size={18} />
                    Founder Calendar Sync
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Synced with your primary Google Calendar event tags (e.g. <code className="bg-slate-100 dark:bg-slate-800/60 px-1 py-0.5 rounded text-teal-600 dark:text-teal-400 font-semibold font-mono">#client</code>, <code className="bg-slate-100 dark:bg-slate-800/60 px-1 py-0.5 rounded text-teal-600 dark:text-teal-400 font-semibold font-mono">#internal_client</code>).
                  </p>
                </div>
                <button
                  onClick={handleCalendarSync}
                  disabled={isSyncingCalendar}
                  className="bg-white dark:bg-[#1e2025] hover:bg-slate-50 dark:hover:bg-slate-700/40 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSyncingCalendar ? (
                    <Loader2 size={13} className="animate-spin text-teal-600 dark:text-teal-400" />
                  ) : (
                    <RefreshCw size={13} className="text-teal-600 dark:text-teal-400" />
                  )}
                  Sync Calendar
                </button>
              </div>

              {calendarError && (
                <div className="mb-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-4 flex gap-3 text-xs text-red-900 dark:text-red-200 font-medium">
                  <AlertCircle className="flex-shrink-0 text-red-600 dark:text-red-400" size={16} />
                  <div>
                    <p className="font-semibold">{calendarError}</p>
                    {(calendarError.toLowerCase().includes("token") || calendarError.toLowerCase().includes("auth") || calendarError.toLowerCase().includes("permission") || calendarError.toLowerCase().includes("scope") || calendarError.toLowerCase().includes("unauthorized")) && (
                      <p className="mt-1 opacity-90 leading-relaxed font-normal">
                        This usually happens if your Google login session doesn't have the Google Calendar scope. Please <strong>Log Out</strong> from the dashboard and <strong>Log Back In</strong> to grant the Google Calendar access permissions.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ flex: 1 }}
                className="font-sans text-sm dark:text-slate-300"
                onSelectEvent={(event) => setSelectedEvent(event)}
                eventPropGetter={(event) => {
                  let backgroundColor = '#0f766e'; // teal-700 default
                  if (event.isProcessed) {
                    backgroundColor = '#64748b'; // slate-500 if processed
                  } else if (event.meetingType === 'client') {
                    backgroundColor = '#0369a1'; // sky-700 for client
                  } else if (event.meetingType === 'internal_client') {
                    backgroundColor = '#4338ca'; // indigo-700
                  }
                  return { style: { backgroundColor, borderRadius: '6px', border: 'none', padding: '3px 6px', fontSize: '12px', color: '#ffffff' } };
                }}
              />
            </div>
          )}

          {/* Event Details Popover/Modal */}
          {selectedEvent && activeTab === 'calendar' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
              onClick={() => setSelectedEvent(null)}
            >
              <div 
                className="bg-white dark:bg-[#15171b] w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{selectedEvent.title}</h3>
                    <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                      <Plus className="rotate-45" size={24} />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <CalendarIcon size={16} /> 
                      {format(selectedEvent.start, 'MMM d, yyyy h:mm a')}
                    </div>
                    
                    {selectedEvent.meetingType && (
                      <div className="flex gap-2 items-center">
                        <span className="text-xs font-semibold uppercase text-slate-500">Type:</span>
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded text-xs font-semibold">
                          {selectedEvent.meetingType.replace('_', ' ')}
                        </span>
                        {selectedEvent.clientName && (
                          <span className="bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 px-2 py-1 rounded text-xs font-semibold">
                            {selectedEvent.clientName}
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="bg-slate-50 dark:bg-[#121316] p-4 rounded-xl text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-40 overflow-y-auto border border-slate-100 dark:border-slate-800/60">
                      {selectedEvent.description || "No description provided."}
                    </div>

                    {selectedEvent.isProcessed && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                        {(() => {
                          const calendarTasks = tasks.filter(t => t.meetingId === selectedEvent.meetingId);
                          return (
                            <>
                              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3 flex items-center gap-1.5">
                                <CheckCircle2 size={13} className="text-teal-500" /> Synced Dashboard Tasks ({calendarTasks.length})
                              </h4>
                              {calendarTasks.length > 0 ? (
                                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                  {calendarTasks.map((t: any) => (
                                    <div key={t.id} className="bg-slate-50 dark:bg-[#121316] border border-slate-100 dark:border-slate-800 p-2.5 rounded-xl flex items-center justify-between gap-3 group hover:border-slate-200 dark:hover:border-slate-700/80 transition-all shadow-sm">
                                      <div className="flex items-start gap-2.5 min-w-0">
                                        <button
                                          onClick={() => handleToggleTaskStatus(t)}
                                          className={`flex-shrink-0 mt-0.5 w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                                            t.status === "done"
                                              ? "bg-teal-500 border-teal-500 text-white"
                                              : "border-slate-300 dark:border-slate-600 hover:border-teal-500"
                                          }`}
                                        >
                                          {t.status === "done" && <CheckCircle2 size={12} className="text-white fill-teal-500" />}
                                        </button>
                                        <div className="min-w-0">
                                          <p className={`text-xs font-semibold truncate ${t.status === "done" ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-750 dark:text-slate-200 font-medium"}`}>
                                            {t.title}
                                          </p>
                                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[9px] text-slate-400 font-semibold">
                                            <span className="flex items-center gap-0.5"><User size={9} /> {t.assignedTo || "Unassigned"}</span>
                                            <span>•</span>
                                            <span>{t.priority} Priority</span>
                                          </div>
                                        </div>
                                      </div>
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase flex-shrink-0 ${
                                        t.status === "done"
                                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                          : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                      }`}>
                                        {t.status === "done" ? "Done" : "Pending"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 italic">No tasks have been extracted or associated with this calendar event.</p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 flex justify-end">
                      {selectedEvent.isProcessed ? (
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-semibold bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg">
                          <CheckCircle2 size={16} className="text-emerald-500" /> Already Processed
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setUploadData({
                              ...uploadData,
                              title: selectedEvent.title,
                              date: selectedEvent.start.toISOString().split('T')[0],
                              platform: selectedEvent.platform || "manual",
                              // Pass the meta info to form
                              ...(selectedEvent as any)
                            });
                            setIsUploading(true);
                            setSelectedEvent(null);
                            setActiveTab('list');
                          }}
                          className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                        >
                          <Upload size={16} /> Process Transcript for this Event
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Meetings List */}
          {activeTab === 'list' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-teal-500" />
              </div>
            ) : meetings.length > 0 ? (
              meetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="bg-white dark:bg-[#15171b] border border-slate-200/70 dark:border-slate-700/60 rounded-xl overflow-hidden shadow-sm"
                >
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                    onClick={() => setExpandedId(expandedId === meeting.id ? null : meeting.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        meeting.platform === 'zoom' ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-300' :
                        meeting.platform === 'google_meet' ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-300' :
                        meeting.platform === 'fathom' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300' :
                        'bg-slate-100 dark:bg-slate-700/30 text-slate-700 dark:text-slate-200'
                      }`}>
                        <Video size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{meeting.title}</h3>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1 font-semibold"><CalendarIcon size={12} /> {new Date(meeting.meeting_date).toLocaleDateString()}</span>
                          <span className="uppercase font-semibold">{meeting.platform.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>
                    {expandedId === meeting.id ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                  </div>

                  {expandedId === meeting.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="px-4 pb-4 border-t border-slate-200/70 dark:border-slate-700/60"
                    >
                      <div className="py-4 space-y-4">
                        <div>
                          <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Summary</h4>
                          <div className="mb-3">
                            {formatMarkdown(meeting.summary)}
                          </div>
                          {meeting.transcript_url && (
                            <div className="pt-1">
                              <a
                                href={meeting.transcript_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border bg-teal-50 hover:bg-teal-100 dark:bg-teal-500/10 dark:hover:bg-teal-500/20 border-teal-200/60 dark:border-teal-500/30 text-teal-700 dark:text-teal-200 transition-colors shadow-sm cursor-pointer"
                              >
                                <Video size={12} className="text-teal-500" />
                                View Fathom Recording
                              </a>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Key Topics</h4>
                            <div className="flex flex-wrap gap-2">
                              {meeting.key_topics?.map((topic, i) => (
                                <span key={i} className="bg-slate-100 dark:bg-slate-700/30 text-slate-600 dark:text-slate-300 px-2 py-1 rounded text-xs font-semibold">
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Decisions</h4>
                            <ul className="space-y-2">
                              {meeting.decisions?.map((d: any, i: number) => (
                                <li key={i} className="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2 font-medium">
                                  <CheckCircle2 size={14} className="text-teal-500 mt-0.5 flex-shrink-0" />
                                  <span>{d.decision}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {(() => {
                          const meetingTasks = tasks.filter(t => t.meetingId === meeting.id);
                          return (
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
                              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3 flex items-center gap-1.5">
                                <CheckCircle2 size={13} className="text-teal-500" /> Synced Dashboard Tasks ({meetingTasks.length})
                              </h4>
                              {meetingTasks.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {meetingTasks.map((t) => (
                                    <div key={t.id} className="bg-slate-50 dark:bg-[#121316] border border-slate-100 dark:border-slate-800 p-3 rounded-xl flex items-center justify-between gap-3 group hover:border-slate-200 dark:hover:border-slate-700/80 transition-all shadow-sm">
                                      <div className="flex items-start gap-2.5 min-w-0">
                                        <button
                                          onClick={() => handleToggleTaskStatus(t)}
                                          className={`flex-shrink-0 mt-0.5 w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                                            t.status === "done"
                                              ? "bg-teal-500 border-teal-500 text-white"
                                              : "border-slate-300 dark:border-slate-600 hover:border-teal-500"
                                          }`}
                                        >
                                          {t.status === "done" && <CheckCircle2 size={12} className="text-white fill-teal-500" />}
                                        </button>
                                        <div className="min-w-0">
                                          <p className={`text-xs font-semibold truncate ${t.status === "done" ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-750 dark:text-slate-200 font-medium"}`}>
                                            {t.title}
                                          </p>
                                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-400 font-semibold">
                                            <span className="flex items-center gap-0.5"><User size={10} /> {t.assignedTo || "Unassigned"}</span>
                                            <span>•</span>
                                            <span>{t.priority} Priority</span>
                                            {t.deadline && (
                                              <>
                                                <span>•</span>
                                                <span>Due: {t.deadline}</span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex-shrink-0 ${
                                        t.status === "done"
                                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                          : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                      }`}>
                                        {t.status === "done" ? "Done" : "Pending"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 italic">No tasks have been extracted or associated with this meeting.</p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </motion.div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-20 bg-slate-50 dark:bg-[#15171b] rounded-2xl border border-dashed border-slate-200/70 dark:border-slate-700/60">
                <FileText className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
                <p className="text-slate-600 dark:text-slate-300 font-semibold">No meetings processed yet.</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Upload your first transcript to generate tasks.</p>
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
