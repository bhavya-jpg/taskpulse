"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Video, FileText, Upload, Plus, Calendar, User, CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

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
        return <strong key={idx} className="font-bold text-gray-900 dark:text-white">{token.content}</strong>;
      }
      if (token.type === 'link') {
        return (
          <a
            key={idx}
            href={token.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 underline font-medium inline-flex items-center gap-0.5 hover:opacity-90 transition-opacity"
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
        <ul key={`list-${key}`} className="list-disc pl-5 my-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
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
        <h4 key={idx} className="text-sm font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mt-4 mb-2">
          {parseInline(trimmed.substring(4))}
        </h4>
      );
    } else if (trimmed.startsWith("## ")) {
      pushList(idx);
      elements.push(
        <h3 key={idx} className="text-base font-extrabold text-gray-800 dark:text-gray-100 mt-5 mb-3 border-b border-gray-100 dark:border-white/5 pb-1">
          {parseInline(trimmed.substring(3))}
        </h3>
      );
    } else if (trimmed.startsWith("# ")) {
      pushList(idx);
      elements.push(
        <h2 key={idx} className="text-lg font-black text-gray-900 dark:text-white mt-6 mb-4">
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
          <div key={idx} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300 my-1.5 pl-2 leading-relaxed">
            <span className="font-bold text-violet-500 flex-shrink-0">{match[1]}.</span>
            <div>{parseInline(match[2])}</div>
          </div>
        );
      }
    }
    // Paragraph
    else {
      pushList(idx);
      elements.push(
        <p key={idx} className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed my-2">
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
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <Video className="text-indigo-500" /> AI Meeting Assistant
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleGoogleSync}
            disabled={isSyncing}
            className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-50"
          >
            {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} 
            Sync Google Meet
          </button>
          <button
            onClick={handleFathomSync}
            disabled={isFathomSyncing}
            className="bg-white dark:bg-white/5 border border-violet-200 dark:border-violet-900/30 text-violet-700 dark:text-violet-400 text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors hover:bg-violet-50 dark:hover:bg-violet-950/10 disabled:opacity-50 shadow-sm"
          >
            {isFathomSyncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} className="text-violet-500" />}
            Sync Fathom
          </button>
          <button
            onClick={() => setIsUploading(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors transition-transform active:scale-95"
          >
            <Plus size={16} /> New Meeting Post
          </button>
        </div>
      </div>

      {isUploading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-xl"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800 dark:text-gray-100">Upload Meeting Transcript</h3>
            <button onClick={() => setIsUploading(false)} className="text-gray-400 hover:text-gray-600">
              <Plus className="rotate-45" />
            </button>
          </div>
          
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Meeting Title</label>
                <input
                  type="text"
                  required
                  placeholder="Q3 Planning Meeting"
                  className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={uploadData.title}
                  onChange={e => setUploadData({...uploadData, title: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Platform</label>
                <select
                  className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm outline-none"
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
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</label>
                <input
                  type="date"
                  className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm outline-none"
                  value={uploadData.date}
                  onChange={e => setUploadData({...uploadData, date: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Participants</label>
                <input
                  type="text"
                  placeholder="John, Priya, Rahul"
                  className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm outline-none"
                  value={uploadData.participants}
                  onChange={e => setUploadData({...uploadData, participants: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Transcript File (.vtt, .txt)</label>
              <div className="border-2 border-dashed border-gray-200 dark:border-white/5 rounded-xl p-8 text-center hover:border-indigo-500 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={e => setUploadData({...uploadData, transcript: e.target.files?.[0] || null})}
                />
                <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {uploadData.transcript ? uploadData.transcript.name : "Click to select or drag and drop"}
                </p>
              </div>
            </div>

            <button
              disabled={isProcessing}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Processing with Gemini AI...
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
            <Loader2 className="animate-spin text-indigo-500" />
          </div>
        ) : meetings.length > 0 ? (
          meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm"
            >
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                onClick={() => setExpandedId(expandedId === meeting.id ? null : meeting.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${
                    meeting.platform === 'zoom' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                    meeting.platform === 'google_meet' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                    meeting.platform === 'fathom' ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' :
                    'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                  }`}>
                    <Video size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-100">{meeting.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(meeting.meeting_date).toLocaleDateString()}</span>
                      <span className="uppercase font-bold">{meeting.platform.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
                {expandedId === meeting.id ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
              </div>

              {expandedId === meeting.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="px-4 pb-4 border-t border-gray-100 dark:border-white/5"
                >
                  <div className="py-4 space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Summary</h4>
                      <div className="mb-3">
                        {formatMarkdown(meeting.summary)}
                      </div>
                      {meeting.transcript_url && (
                        <div className="pt-1">
                          <a
                            href={meeting.transcript_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/20 dark:hover:bg-violet-950/30 border-violet-200 dark:border-violet-900/50 text-violet-700 dark:text-violet-400 transition-colors shadow-sm cursor-pointer"
                          >
                            <Video size={12} className="text-violet-500" />
                            View Fathom Recording
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Key Topics</h4>
                        <div className="flex flex-wrap gap-2">
                          {meeting.key_topics?.map((topic, i) => (
                            <span key={i} className="bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 px-2 py-1 rounded text-xs font-medium">
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Decisions</h4>
                        <ul className="space-y-2">
                          {meeting.decisions?.map((d: any, i: number) => (
                            <li key={i} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                              <CheckCircle2 size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
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
          <div className="text-center py-20 bg-gray-50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
            <FileText className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={48} />
            <p className="text-gray-500 dark:text-gray-400">No meetings processed yet.</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Upload your first transcript to generate tasks.</p>
          </div>
        )}
      </div>
    </div>
  );
}
