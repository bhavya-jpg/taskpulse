"use client";

import { useState, useEffect } from "react";
import { 
  Hash, 
  Loader2, 
  X, 
  AlertCircle, 
  Key, 
  Link, 
  RefreshCw, 
  LogOut, 
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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Hash className="text-teal-600" size={20} />
            Slack Integration
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Securely link Slack channels and scan conversations to extract deliverables.
          </p>
        </div>
        {connectedChannel && (
          <button 
            onClick={handleDisconnect}
            className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 px-4 py-2 rounded-xl text-sm font-semibold text-amber-700 dark:text-amber-200 transition-colors shadow-sm cursor-pointer"
          >
            <LogOut size={14} />
            Disconnect
          </button>
        )}
      </div>

      {!connectedChannel ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8 items-start">
          {/* Connector Wizard */}
          <div className="bg-white dark:bg-[#15171b] p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200/70 dark:border-slate-700/60 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-amber-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-6">
              <Key size={18} className="text-teal-600" />
              Configure API Credentials
            </h2>

            <form onSubmit={handleConnect} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Slack OAuth Token (Bot or User)
                </label>
                <div className="relative">
                  <input
                    type={showToken ? "text" : "password"}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="xoxb-... or xoxp-..."
                    className="w-full bg-slate-50 dark:bg-[#121316] border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-all font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
                  >
                    {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Monitored Channel ID
                  </label>
                  <input
                    type="text"
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    placeholder="C12345678"
                    className="w-full bg-slate-50 dark:bg-[#121316] border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-all font-mono"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Display Channel Name (Required)
                  </label>
                  <input
                    type="text"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    placeholder="client-feed"
                    className="w-full bg-slate-50 dark:bg-[#121316] border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-all"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={connecting}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {connecting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Validating Slack connection...
                  </>
                ) : (
                  <>
                    <Link size={16} />
                    Connect Slack workspace
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quickstart Guide */}
          <div className="bg-slate-100/70 dark:bg-[#15171b] p-6 md:p-8 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 space-y-6">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 tracking-wide uppercase">
              <Sparkles size={16} className="text-teal-500" />
              Obtaining Slack Credentials
            </h3>
            
            <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold flex items-center justify-center text-xs">1</span>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Create a Custom Slack App</p>
                  <p className="text-xs text-slate-500 mt-0.5">Visit <a href="https://api.slack.com/apps" target="_blank" rel="noreferrer" className="text-teal-600 hover:underline">api.slack.com/apps</a> and hit "Create New App". Choose your workspace.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold flex items-center justify-center text-xs">2</span>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Configure Scopes (OAuth & Permissions)</p>
                  <p className="text-xs text-slate-500 mt-0.5">Add Bot Token Scopes: <code className="bg-teal-50 dark:bg-teal-500/10 px-1 py-0.5 rounded text-teal-700 dark:text-teal-300 text-[10px]">channels:history</code>, <code className="bg-teal-50 dark:bg-teal-500/10 px-1 py-0.5 rounded text-teal-700 dark:text-teal-300 text-[10px]">users:read</code>, <code className="bg-teal-50 dark:bg-teal-500/10 px-1 py-0.5 rounded text-teal-700 dark:text-teal-300 text-[10px]">users.profile:read</code>.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold flex items-center justify-center text-xs">3</span>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Install App & Add to Channel</p>
                  <p className="text-xs text-slate-500 mt-0.5">Install the app to your workspace. Copy the generated Bot User OAuth Token. Then invite the bot to your channel using <code className="bg-teal-50 dark:bg-teal-500/10 px-1 py-0.5 rounded text-teal-700 dark:text-teal-300 text-[10px]">/invite @YourAppName</code>.</p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/30 rounded-xl p-4 flex gap-3 text-xs text-amber-900 dark:text-amber-200">
              <AlertCircle className="flex-shrink-0 text-amber-600 dark:text-amber-300" size={16} />
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
            <div className="bg-white dark:bg-[#15171b] p-5 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm">
                  <Hash size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Channel Status</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">#{connectedChannel}</p>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                </span>
                <span className="text-xs font-semibold text-teal-600 dark:text-teal-300 tracking-wide uppercase">Sync active</span>
              </div>

              <div className="border-t border-slate-200/70 dark:border-slate-700/60 pt-4">
                <button
                  onClick={handleScan}
                  disabled={scanning}
                  className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-75 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  {scanning ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Scanning workspace...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      Fetch and scan Slack handoffs
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-[11px] text-slate-300 leading-relaxed font-medium">
              <span className="text-teal-300 font-semibold block mb-1">Secure storage</span>
              OAuth credentials are stored in HttpOnly cookies and never saved in local storage, protecting workspace metadata from client-side scripts.
            </div>
          </div>

          {/* Interactive Logs Simulator Box */}
          <div className="bg-white dark:bg-[#15171b] border border-slate-200/70 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-sm flex flex-col h-[520px]">
            {/* Chat header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between flex-shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-semibold text-sm">#</div>
                <div>
                  <p className="font-semibold text-sm tracking-tight flex items-center gap-1.5">
                    #{connectedChannel}
                    <span className="bg-white/15 text-white/80 text-[9px] font-semibold px-1.5 py-0.5 rounded-full">Monitored</span>
                  </p>
                  <p className="text-[10px] text-slate-300">Slack workspace stream feed logs</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-[10px] font-semibold bg-teal-500/20 text-teal-200 border border-teal-500/30 rounded px-2 py-0.5 uppercase tracking-wider">Ready</div>
              </div>
            </div>
            {/* Message Pane */}
            <div className="flex-1 overflow-y-auto p-5 bg-slate-50 dark:bg-[#111318] space-y-4">
              <div className="text-center py-2">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800/60 rounded px-2 py-1">
                  TODAY
                </span>
              </div>

              {loadingMessages ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-500 py-12">
                  <Loader2 className="animate-spin text-purple-500" size={24} />
                  <span className="text-sm">Fetching conversation stream from Slack...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <p>No messages found in #{connectedChannel} yet.</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Make sure you have invited the bot to the channel and sent some messages.</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const colors = ["bg-rose-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-indigo-500"];
                  const charCodeSum = msg.sender.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
                  const colorClass = colors[charCodeSum % colors.length];
                  const isActionable = hasTaskKeywords(msg.text);

                  return (
                    <div key={msg.id || i} className={`flex items-start gap-3 text-sm ${i > 0 ? "border-t border-slate-200/60 dark:border-slate-700/60 pt-3" : ""}`}>
                      <div className={`w-8 h-8 rounded-md ${colorClass} text-white font-bold flex items-center justify-center flex-shrink-0 text-xs shadow`}>
                        {msg.sender.substring(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{msg.sender}</span>
                          <span className="text-[10px] text-slate-400">
                            {msg.timestamp ? new Date(parseFloat(msg.timestamp) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                          </span>
                        </div>
                        <p className="text-slate-650 dark:text-slate-300 mt-1 leading-relaxed break-words">
                          {msg.text}
                        </p>
                        {isActionable ? (
                          <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold bg-teal-50 dark:bg-teal-500/10 border border-teal-200/60 dark:border-teal-500/20 text-teal-700 dark:text-teal-200 rounded-full px-2.5 py-0.5 shadow-sm">
                            <span>Scanned</span>
                            <span className="text-slate-400 dark:text-slate-500">•</span>
                            <span className="text-slate-600 dark:text-slate-300">Task extracted</span>
                          </div>
                        ) : (
                          <div className="mt-1.5 inline-flex items-center gap-1.5 text-[9px] font-semibold bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 rounded px-1.5 py-0.5">
                            <span>Not actionable</span>
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
            <div className="bg-slate-100 dark:bg-[#15171b] px-4 py-3 flex items-center gap-3 border-t border-slate-200/70 dark:border-slate-700/60 flex-shrink-0">
              <div className="flex-1 bg-white dark:bg-[#111318] rounded-xl px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 italic border border-slate-200/70 dark:border-slate-700/60">
                Channel stream feed is active. Displaying real-time workspace stream feed.
              </div>
              <button 
                onClick={handleScan}
                disabled={scanning}
                className="w-10 h-10 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl flex items-center justify-center shadow-sm transition-colors cursor-pointer"
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
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200/70 dark:border-slate-700/60 bg-white/70 dark:bg-slate-700/30">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        <span className="text-[10px] font-semibold tracking-tight uppercase text-slate-500">
          Slack Offline
        </span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-teal-200/60 dark:border-teal-500/30 bg-teal-50 dark:bg-teal-500/10">
      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
      <span className="text-[10px] font-semibold tracking-tight uppercase text-teal-700 dark:text-teal-200">
        Slack Connected
      </span>
    </div>
  );
}

