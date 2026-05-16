"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Check, Loader2, MessageSquare, ShieldCheck, AlertCircle, RefreshCw } from "lucide-react";

interface Group {
  jid: string;
  name: string;
  memberCount: number;
  isApproved: boolean;
}

type ConnectionStatus = "idle" | "connecting" | "awaiting_qr" | "connected" | "banned" | "error";

export function WhatsAppConnector({ onConnected }: { onConnected: () => void }) {
  const [status, setStatus]   = useState<ConnectionStatus>("idle");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [phone, setPhone]     = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);

  const startConnection = async () => {
    setStatus("connecting");
    setError(null);

    try {
      await fetch("/api/whatsapp/connect", { method: "POST" });
      setStatus("awaiting_qr");
      const es = new EventSource("/api/whatsapp/qr-stream");

      es.onmessage = async (e) => {
        const data = JSON.parse(e.data);
        if (data.type === "qr") {
          const url = await QRCode.toDataURL(data.qr, { width: 256, margin: 2 });
          setQrDataUrl(url);
        }
        if (data.type === "connected") {
          setStatus("connected");
          setPhone(data.phoneNumber);
          setQrDataUrl(null);
          es.close();
          onConnected();
        }
        if (data.type === "banned") {
          setStatus("banned");
          setError("This number has been flagged by WhatsApp. Please use a different number.");
          es.close();
        }
      };

      es.onerror = () => {
        setStatus("error");
        setError("Connection failed. Please try again.");
        es.close();
      };
    } catch (err) {
      setStatus("error");
      setError("Failed to initiate connection.");
    }
  };

  return (
    <div className="max-w-md mx-auto text-center space-y-6 py-4">
      {status === "idle" && (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <p className="text-sm text-blue-700 leading-relaxed">
              Connect your WhatsApp to start monitoring selected groups for tasks.
              TaskPulse reads messages <strong>only from groups you approve</strong> — nothing else.
            </p>
          </div>
          <button 
            onClick={startConnection}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
          >
            <MessageSquare size={18} />
            Connect WhatsApp
          </button>
        </div>
      )}

      {status === "awaiting_qr" && (
        <div className="space-y-4 flex flex-col items-center">
          {!qrDataUrl ? (
            <div className="flex flex-col items-center py-8 space-y-3">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <p className="text-gray-500 font-medium">Generating QR code...</p>
            </div>
          ) : (
            <>
              <div className="bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-200">
                <img src={qrDataUrl} alt="WhatsApp QR Code" className="w-64 h-64 rounded-xl shadow-inner" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-800">
                  Open WhatsApp → Linked Devices → Link a Device
                </p>
                <p className="text-xs text-gray-400">
                  QR expires in 60 seconds. Refresh if it stops updating.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {status === "connected" && (
        <div className="bg-green-50 p-6 rounded-2xl border border-green-100 flex flex-col items-center space-y-3">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-100">
            <Check size={24} />
          </div>
          <div className="text-center">
            <p className="text-green-700 font-bold text-lg">Connected!</p>
            <p className="text-green-600 text-sm font-medium">{phone}</p>
          </div>
          <p className="text-gray-500 text-xs">
            Now select which groups TaskPulse can monitor below.
          </p>
        </div>
      )}

      {(status === "banned" || status === "error") && (
        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex flex-col items-center space-y-4">
          <AlertCircle className="text-red-500" size={32} />
          <p className="text-red-700 text-sm font-medium">{error}</p>
          <button 
            onClick={() => { setStatus("idle"); setError(null); }}
            className="text-blue-600 font-semibold text-sm hover:underline flex items-center gap-1"
          >
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      )}
    </div>
  );
}

export function GroupSelector() {
  const [groups, setGroups]   = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState<string | null>(null);

  const approvedCount = groups.filter(g => g.isApproved).length;
  const MAX_GROUPS = 5;

  useEffect(() => {
    fetch("/api/whatsapp/groups")
      .then(r => r.json())
      .then(setGroups)
      .finally(() => setLoading(false));
  }, []);

  const toggleGroup = async (group: Group) => {
    setSaving(group.jid);
    try {
      if (group.isApproved) {
        await fetch("/api/whatsapp/groups", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jid: group.jid }),
        });
        setGroups(gs => gs.map(g => g.jid === group.jid ? { ...g, isApproved: false } : g));
      } else {
        if (approvedCount >= MAX_GROUPS) return;
        await fetch("/api/whatsapp/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jid: group.jid, groupName: group.name }),
        });
        setGroups(gs => gs.map(g => g.jid === group.jid ? { ...g, isApproved: true } : g));
      }
    } finally {
      setSaving(null);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center py-12 space-y-2">
      <Loader2 className="animate-spin text-gray-300" size={24} />
      <p className="text-gray-400 text-xs font-medium">Loading your groups...</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-gray-800">Select Groups</h3>
          <p className="text-xs text-gray-400">Choose up to 5 groups for monitoring.</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${approvedCount >= MAX_GROUPS ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500'}`}>
          {approvedCount}/{MAX_GROUPS} SELECTED
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {groups.map(group => {
          const isDisabled = !group.isApproved && approvedCount >= MAX_GROUPS;
          const isSaving   = saving === group.jid;

          return (
            <button
              key={group.jid}
              disabled={isDisabled || isSaving}
              onClick={() => toggleGroup(group)}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${
                group.isApproved 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-white border-gray-100 hover:border-blue-200'
              } ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                group.isApproved 
                  ? 'bg-blue-600 border-blue-600 text-white' 
                  : 'bg-white border-gray-200 group-hover:border-blue-300'
              }`}>
                {group.isApproved && <Check size={14} strokeWidth={3} />}
                {isSaving && <Loader2 className="animate-spin" size={12} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-800 truncate">{group.name}</div>
                <div className="text-[10px] text-gray-400 font-medium">{group.memberCount} members</div>
              </div>

              <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-[10px] font-bold text-green-600 tracking-tight">WHATSAPP</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="p-3 bg-gray-50 rounded-xl flex items-start gap-2 border border-gray-100">
        <ShieldCheck className="text-gray-400 mt-0.5" size={14} />
        <p className="text-[10px] text-gray-500 leading-normal">
          TaskPulse uses read-only access. Messages are processed temporarily for extraction and never stored permanently in raw form.
        </p>
      </div>
    </div>
  );
}

export function WAStatusBadge() {
  const [status, setStatus] = useState<string>("loading");

  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch("/api/whatsapp/status");
        const d = await r.json();
        setStatus(d.status);
      } catch { setStatus("error"); }
    };
    poll();
    const t = setInterval(poll, 30_000);
    return () => clearInterval(t);
  }, []);

  const config: Record<string, { label: string, color: string }> = {
    connected:    { label: "WA Live",     color: "bg-green-500" },
    disconnected: { label: "WA Offline",  color: "bg-gray-400" },
    banned:       { label: "WA Banned",   color: "bg-red-500" },
    none:         { label: "WA Not set up", color: "bg-gray-300" },
    loading:      { label: "...",         color: "bg-gray-200" },
    error:        { label: "WA Error",    color: "bg-orange-500" }
  };

  const { label, color } = config[status] || config.error;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-opacity-10 ${color.replace('bg-', 'border-')} ${color.replace('bg-', 'bg-opacity-5')}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${color} animate-pulse`} />
      <span className={`text-[10px] font-bold tracking-tight uppercase ${color.replace('bg-', 'text-')}`}>
        {label}
      </span>
    </div>
  );
}

/**
 * useTaskStream
 * ─────────────
 * Custom hook to subscribe to real-time task detection events from WhatsApp.
 */
export function useTaskStream(onNewTask: (task: any) => void) {
  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      es = new EventSource("/api/whatsapp/task-stream");

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          onNewTask(data);
        } catch (err) {
          // Heartbeats or malformed JSON
        }
      };

      es.onerror = () => {
        es?.close();
        // Reconnect after 5 seconds
        reconnectTimeout = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      es?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [onNewTask]);
}
