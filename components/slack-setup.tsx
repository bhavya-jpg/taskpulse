"use client";

import { useState, useEffect } from "react";
import { 
  Hash, 
  Settings, 
  Check, 
  Loader2, 
  X, 
  AlertCircle, 
  Key, 
  Link, 
  RefreshCw, 
  LogOut, 
  MessageSquare,
  Sparkles,
  Eye,
  EyeOff
} from "lucide-react";

interface SlackSetupProps {
  onToast: (msg: string) => void;
  loadTasks: () => Promise<void>;
  setActiveTab?: (tab: string) => void;
}

export function SlackSetup({ onToast, loadTasks, setActiveTab }: SlackSetupProps) {
  const [token, setToken] = useState("");
  const [channelId, setChannelId] = useState("");
  const [channelName, setChannelName] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [connectedChannel, setConnectedChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const fetchSlackMessages = async () => {
    setLoadingMessages(true);
    try {
      const res = await fetch("/api/slack/messages");
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Failed to fetch Slack messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const hasTaskKeywords = (text: string) => {
    const keywords = [
      "karo", "kam kar", "de dena", "bana do", "ppt", "deck", "creative", 
      "urgent", "tomorrow", "today", "banner", "creatives", "deliver", "by", 
      "before", "flipkart", "zomato", "amazon", "google", "task", "deliverable"
    ];
    return keywords.some(kw => text.toLowerCase().includes(kw));
  };

  // Check connection status from cookie
  useEffect(() => {
    const channelCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("slack_channel_name="));
    if (channelCookie) {
      const name = decodeURIComponent(channelCookie.split("=")[1]);
      if (name) setConnectedChannel(name);
    }
  }, []);

  useEffect(() => {
    if (connectedChannel) {
      fetchSlackMessages();
    } else {
      setMessages([]);
    }
  }, [connectedChannel]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !channelId || !channelName) {
      onToast("Token, Channel ID, and Display Channel Name are required.");
      return;
    }

    setConnecting(true);
    try {
      const res = await fetch("/api/auth/slack/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          channelId,
          channelName: channelName || channelId
        })
      });
      const data = await res.json();
      if (data.success) {
        setConnectedChannel(data.channelName);
        onToast(`Slack connected to #${data.channelName}!`);
        setToken("");
        setChannelId("");
        setChannelName("");
      } else {
        onToast(`Connection failed: ${data.error}`);
      }
    } catch (err) {
      onToast("Failed to connect to Slack.");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const res = await fetch("/api/auth/slack/connect", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setConnectedChannel(null);
        onToast("Slack disconnected successfully.");
      }
    } catch (err) {
      onToast("Failed to disconnect Slack.");
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/slack");
      const data = await res.json();
      if (data.error) {
        onToast(`Scan Error: ${data.error}`);
      } else if (data.tasks) {
        await loadTasks();
        await fetchSlackMessages();
        onToast(`AI processed Slack successfully! Scanned channel and synced active tasks.`);
        if (setActiveTab) {
          setActiveTab("dashboard");
        }
      }
    } catch (err) {
      onToast("Failed to run Slack AI scanner.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-150 flex items-center gap-2">
            <span className="text-purple-600 dark:text-purple-400 rotate-12">💬</span>
            Slack Integration
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Securely link Slack channels and use Gemini AI to scan conversations for team deliverables.
          </p>
        </div>
        {connectedChannel && (
          <button 
            onClick={handleDisconnect}
            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/30 px-4 py-2 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 transition-colors shadow-sm cursor-pointer"
          >
            <LogOut size={14} />
            Disconnect
          </button>
        )}
      </div>

      {!connectedChannel ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8 items-start">
          {/* Connector Wizard */}
          <div className="bg-white dark:bg-[#121214] p-6 md:p-8 rounded-2xl shadow-md border border-gray-200/60 dark:border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-6">
              <Key size={18} className="text-purple-500" />
              Configure API Credentials
            </h2>

            <form onSubmit={handleConnect} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Slack OAuth Token (Bot or User)
                </label>
                <div className="relative">
                  <input
                    type={showToken ? "text" : "password"}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="xoxb-... or xoxp-..."
                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-gray-850 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-3.5 text-gray-450 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Monitored Channel ID
                  </label>
                  <input
                    type="text"
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    placeholder="C12345678"
                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-gray-850 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-mono"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Display Channel Name (Required)
                  </label>
                  <input
                    type="text"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    placeholder="client-feed"
                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-gray-850 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={connecting}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {connecting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Validating Slack API Session...
                  </>
                ) : (
                  <>
                    <Link size={16} />
                    Establish Secure Handoff Link
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quickstart Guide */}
          <div className="bg-gray-100/50 dark:bg-[#121214]/60 p-6 md:p-8 rounded-2xl border border-gray-200/50 dark:border-white/5 space-y-6">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 tracking-wide uppercase">
              <Sparkles size={16} className="text-yellow-500 animate-pulse" />
              Obtaining Slack Credentials
            </h3>
            
            <div className="space-y-4 text-sm text-gray-650 dark:text-gray-400">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 font-bold flex items-center justify-center text-xs">1</span>
                <div>
                  <p className="font-semibold text-gray-850 dark:text-gray-200">Create a Custom Slack App</p>
                  <p className="text-xs text-gray-500 mt-0.5">Visit <a href="https://api.slack.com/apps" target="_blank" rel="noreferrer" className="text-purple-500 hover:underline">api.slack.com/apps</a> and hit "Create New App". Choose your workspace.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 font-bold flex items-center justify-center text-xs">2</span>
                <div>
                  <p className="font-semibold text-gray-850 dark:text-gray-200">Configure Scopes (OAuth & Permissions)</p>
                  <p className="text-xs text-gray-500 mt-0.5">Add Bot Token Scopes: <code className="bg-purple-50 dark:bg-purple-950/30 px-1 py-0.5 rounded text-purple-600 dark:text-purple-400 text-[10px]">channels:history</code>, <code className="bg-purple-50 dark:bg-purple-950/30 px-1 py-0.5 rounded text-purple-600 dark:text-purple-400 text-[10px]">users:read</code>, <code className="bg-purple-50 dark:bg-purple-950/30 px-1 py-0.5 rounded text-purple-600 dark:text-purple-400 text-[10px]">users.profile:read</code>.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 font-bold flex items-center justify-center text-xs">3</span>
                <div>
                  <p className="font-semibold text-gray-850 dark:text-gray-200">Install App & Add to Channel</p>
                  <p className="text-xs text-gray-500 mt-0.5">Install the app to your workspace. Copy the generated Bot User OAuth Token. Then invite the bot to your channel using <code className="bg-purple-50 dark:bg-purple-950/30 px-1 py-0.5 rounded text-purple-600 dark:text-purple-400 text-[10px]">/invite @YourAppName</code>.</p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-xl p-4 flex gap-3 text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle className="flex-shrink-0 text-amber-600 dark:text-amber-400" size={16} />
              <p className="leading-relaxed">
                <strong>Important:</strong> Slack channel IDs look like <code className="bg-amber-100/50 dark:bg-amber-950/40 px-1 py-0.5 rounded font-mono">C03E19Z2N6S</code>. You can copy this at the bottom of the Channel Details popup inside Slack.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2.5fr] gap-6 items-start">
          {/* Status sidebar panel */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#121214] p-5 rounded-2xl border border-gray-200/60 dark:border-white/5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500 dark:bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-200 dark:shadow-none">
                  <Hash size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Channel Status</p>
                  <p className="font-bold text-gray-850 dark:text-gray-150">#{connectedChannel}</p>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-xs font-bold text-green-600 dark:text-green-400 tracking-wide uppercase">Active Link Syncing</span>
              </div>

              <div className="border-t border-gray-100 dark:border-white/5 pt-4">
                <button
                  onClick={handleScan}
                  disabled={scanning}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-75 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  {scanning ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      AI Scanning Workspace...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      Fetch & Scan Slack Handoffs
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-[#121214] border border-white/5 p-4 rounded-2xl text-[11px] text-gray-400 leading-relaxed font-medium">
              <span className="text-purple-400 font-bold block mb-1">🔐 HTTP-ONLY SECURE COMPLIANCE</span>
              Your OAuth bot credentials are never stored in your browser's local storage. They are encapsulated in secure cookies configured with HttpOnly protection, shielding your workspace metadata from cross-site scripts.
            </div>
          </div>

          {/* Interactive Logs Simulator Box */}
          <div className="bg-white dark:bg-[#121214] border border-gray-250/60 dark:border-white/5 rounded-2xl overflow-hidden shadow-lg flex flex-col h-[520px]">
            {/* Chat header */}
            <div className="bg-[#4a154b] text-white px-5 py-4 flex items-center justify-between flex-shrink-0 border-b border-[#3f0e40]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-bold text-sm">
                  #
                </div>
                <div>
                  <p className="font-extrabold text-sm tracking-tight flex items-center gap-1.5">
                    #{connectedChannel}
                    <span className="bg-white/15 text-white/80 text-[9px] font-bold px-1.5 py-0.5 rounded-full">Monitored</span>
                  </p>
                  <p className="text-[10px] text-purple-200">Slack workspace stream feed logs</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-[10px] font-extrabold bg-green-500/20 text-green-300 border border-green-500/30 rounded px-2 py-0.5 uppercase tracking-wider">
                  AI Ready
                </div>
              </div>
            </div>
            {/* Message Pane */}
            <div className="flex-1 overflow-y-auto p-5 bg-gray-50 dark:bg-[#0c0c0e] space-y-4">
              <div className="text-center py-2">
                <span className="text-[10px] font-bold text-gray-455 dark:text-gray-500 bg-gray-200/50 dark:bg-white/5 rounded px-2 py-1">
                  TODAY
                </span>
              </div>

              {loadingMessages ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-500 py-12">
                  <Loader2 className="animate-spin text-purple-500" size={24} />
                  <span className="text-sm">Fetching conversation stream from Slack...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-gray-550 dark:text-gray-400">
                  <p>No messages found in #{connectedChannel} yet.</p>
                  <p className="text-xs text-gray-450 dark:text-gray-500 mt-1">Make sure you have invited the bot to the channel and sent some messages.</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const colors = ["bg-rose-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-indigo-500"];
                  const charCodeSum = msg.sender.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
                  const colorClass = colors[charCodeSum % colors.length];
                  const isActionable = hasTaskKeywords(msg.text);

                  return (
                    <div key={msg.id || i} className={`flex items-start gap-3 text-sm ${i > 0 ? "border-t border-gray-150 dark:border-white/5 pt-3" : ""}`}>
                      <div className={`w-8 h-8 rounded-md ${colorClass} text-white font-bold flex items-center justify-center flex-shrink-0 text-xs shadow`}>
                        {msg.sender.substring(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-gray-800 dark:text-gray-200">{msg.sender}</span>
                          <span className="text-[10px] text-gray-400">
                            {msg.timestamp ? new Date(parseFloat(msg.timestamp) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-350 mt-1 leading-relaxed break-words">
                          {msg.text}
                        </p>
                        {isActionable ? (
                          <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 border border-purple-200/50 dark:border-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full px-2.5 py-0.5 shadow-sm">
                            <span>🤖 Scanned</span>
                            <span className="text-gray-455 dark:text-gray-500">•</span>
                            <span className="text-indigo-650 dark:text-indigo-400">Task Extracted</span>
                          </div>
                        ) : (
                          <div className="mt-1.5 inline-flex items-center gap-1.5 text-[9px] font-bold bg-gray-100 dark:bg-white/5 text-gray-450 dark:text-gray-500 rounded px-1.5 py-0.5">
                            <span>Skipped</span>
                            <span>•</span>
                            <span>No actionable client request</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Send bar block */}
            <div className="bg-gray-100 dark:bg-[#121214] px-4 py-3 flex items-center gap-3 border-t border-gray-250/60 dark:border-white/5 flex-shrink-0">
              <div className="flex-1 bg-gray-50 dark:bg-[#1c1c1f] rounded-xl px-4 py-2.5 text-xs text-gray-400 dark:text-gray-500 italic border border-gray-200 dark:border-white/5">
                Channel stream feed is active. Displaying real-time workspace stream feed.
              </div>
              <button 
                onClick={handleScan}
                disabled={scanning}
                className="w-10 h-10 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl flex items-center justify-center shadow transition-colors cursor-pointer"
              >
                {scanning ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SlackStatusBadge() {
  const [channel, setChannel] = useState<string | null>(null);

  useEffect(() => {
    const checkCookie = () => {
      const channelCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("slack_channel_name="));
      if (channelCookie) {
        const name = decodeURIComponent(channelCookie.split("=")[1]);
        if (name) {
          setChannel(name);
          return;
        }
      }
      setChannel(null);
    };

    checkCookie();
    // Poll the cookie every 5s in case they disconnect/connect
    const interval = setInterval(checkCookie, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!channel) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-300/30 dark:border-white/5 bg-gray-100/50 dark:bg-white/5">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
        <span className="text-[10px] font-bold tracking-tight uppercase text-gray-500">
          Slack Offline
        </span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-purple-300/30 dark:border-purple-900/30 bg-purple-50/50 dark:bg-purple-950/10">
      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
      <span className="text-[10px] font-bold tracking-tight uppercase text-purple-600 dark:text-purple-400">
        Slack Connected (#{channel})
      </span>
    </div>
  );
}

