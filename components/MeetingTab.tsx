"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Video, FileText, Upload, Plus, Calendar, User, CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp, RefreshCw, Sparkles } from "lucide-react";

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

export function MeetingTab() {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFathomSyncing, setIsFathomSyncing] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [uploadData, setUploadData] = useState({
    title: "",
    platform: "manual",
    date: new Date().toISOString().split('T')[0],
    participants: "",
    transcript: null as File | null,
  });

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

  useEffect(() => {
    fetchMeetings();
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
            onClick={() => setIsUploading(true)}
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

          {/* Meetings List */}
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
                          <span className="flex items-center gap-1 font-semibold"><Calendar size={12} /> {new Date(meeting.meeting_date).toLocaleDateString()}</span>
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
        </div>
      </div>
    </div>
  );
}
