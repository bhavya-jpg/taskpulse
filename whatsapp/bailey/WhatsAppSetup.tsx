"use client";
/**
 * WHATSAPP SETUP COMPONENTS
 * ──────────────────────────
 * 1. WhatsAppConnector  — QR scan flow
 * 2. GroupSelector      — Pick which groups to monitor (max 5)
 * 3. useTaskStream      — Hook: listens to SSE for live task arrivals
 * 4. WAStatusBadge      — Dashboard header badge showing connection state
 */

import { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";  // npm install qrcode @types/qrcode

// ─── Types ────────────────────────────────────────────────────────────────────

interface Group {
  jid: string;
  name: string;
  memberCount: number;
  isApproved: boolean;
}

type ConnectionStatus = "idle" | "connecting" | "awaiting_qr" | "connected" | "banned" | "error";

// ─── 1. WhatsApp Connector ────────────────────────────────────────────────────

export function WhatsAppConnector({ onConnected }: { onConnected: () => void }) {
  const [status, setStatus]   = useState<ConnectionStatus>("idle");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [phone, setPhone]     = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);

  const startConnection = async () => {
    setStatus("connecting");
    setError(null);

    // 1. Tell backend to initiate Baileys session
    await fetch("/api/whatsapp/connect", { method: "POST" });

    // 2. Open SSE stream to receive QR and connection events
    setStatus("awaiting_qr");
    const es = new EventSource("/api/whatsapp/qr-stream");

    es.onmessage = async (e) => {
      const data = JSON.parse(e.data);

      if (data.type === "qr") {
        // Convert raw QR string to canvas data URL
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
  };

  return (
    <div style={{ maxWidth: 400, margin: "0 auto", textAlign: "center" }}>
      {status === "idle" && (
        <>
          <p style={{ marginBottom: 16, color: "var(--color-text-secondary)", fontSize: 14 }}>
            Connect your WhatsApp to start monitoring selected groups for tasks.
            TaskPulse reads messages only from groups you approve — nothing else.
          </p>
          <button onClick={startConnection} style={btnPrimary}>
            Connect WhatsApp
          </button>
        </>
      )}

      {status === "awaiting_qr" && !qrDataUrl && (
        <p style={{ color: "var(--color-text-secondary)" }}>Generating QR code…</p>
      )}

      {status === "awaiting_qr" && qrDataUrl && (
        <>
          <p style={{ marginBottom: 12, fontSize: 13, color: "var(--color-text-secondary)" }}>
            Open WhatsApp → Linked Devices → Link a Device → Scan this QR
          </p>
          <img src={qrDataUrl} alt="WhatsApp QR Code" style={{ borderRadius: 12, border: "1px solid var(--color-border-tertiary)" }} />
          <p style={{ marginTop: 8, fontSize: 12, color: "var(--color-text-tertiary)" }}>
            QR expires in 60 seconds. Refresh if it stops updating.
          </p>
        </>
      )}

      {status === "connected" && (
        <div style={{ color: "var(--color-text-success)", fontSize: 15 }}>
          ✓ Connected — {phone}<br />
          <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
            Now select which groups TaskPulse can monitor.
          </span>
        </div>
      )}

      {(status === "banned" || status === "error") && (
        <div style={{ color: "var(--color-text-danger)", fontSize: 14 }}>
          {error}
          <br />
          <button onClick={() => { setStatus("idle"); setError(null); }} style={{ ...btnPrimary, marginTop: 12 }}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

// ─── 2. Group Selector ────────────────────────────────────────────────────────

const MAX_GROUPS = 5;

export function GroupSelector() {
  const [groups, setGroups]   = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState<string | null>(null);

  const approvedCount = groups.filter(g => g.isApproved).length;

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
        if (approvedCount >= MAX_GROUPS) return; // Already at limit
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

  if (loading) return <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Loading your groups…</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
          Select up to {MAX_GROUPS} groups for TaskPulse to monitor.
          Only messages from these groups will be read — nothing else.
        </p>
        <span style={{
          fontSize: 12, fontWeight: 500, padding: "2px 8px",
          borderRadius: 99, background: "var(--color-background-secondary)",
          color: approvedCount >= MAX_GROUPS ? "var(--color-text-danger)" : "var(--color-text-secondary)",
        }}>
          {approvedCount}/{MAX_GROUPS} selected
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {groups.map(group => {
          const isDisabled = !group.isApproved && approvedCount >= MAX_GROUPS;
          const isSaving   = saving === group.jid;

          return (
            <div key={group.jid} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 14px", borderRadius: 10,
              border: `1px solid ${group.isApproved ? "var(--color-border-info)" : "var(--color-border-tertiary)"}`,
              background: group.isApproved ? "var(--color-background-info)" : "var(--color-background-primary)",
              opacity: isDisabled ? 0.5 : 1,
              cursor: isDisabled ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }} onClick={() => !isDisabled && !isSaving && toggleGroup(group)}>
              {/* Toggle checkbox */}
              <div style={{
                width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                border: `1.5px solid ${group.isApproved ? "var(--color-border-info)" : "var(--color-border-secondary)"}`,
                background: group.isApproved ? "var(--color-text-info)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {group.isApproved && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
              </div>

              {/* Group info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 14, color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {group.name}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                  {group.memberCount} members
                </div>
              </div>

              {/* WhatsApp badge */}
              <span style={{
                fontSize: 11, fontWeight: 500, color: "#25D366",
                border: "1px solid #25D36640", borderRadius: 6, padding: "2px 6px",
              }}>
                WhatsApp
              </span>
            </div>
          );
        })}
      </div>

      {approvedCount > 0 && (
        <p style={{ marginTop: 12, fontSize: 12, color: "var(--color-text-tertiary)" }}>
          TaskPulse will check these groups every time a new message arrives.
          Messages from all other groups and chats are never accessed.
        </p>
      )}
    </div>
  );
}

// ─── 3. useTaskStream hook ────────────────────────────────────────────────────
// Attach this to the dashboard page to receive live task arrivals from WA groups.

export function useTaskStream(onNewTask: (task: any) => void) {
  useEffect(() => {
    const es = new EventSource("/api/whatsapp/task-stream");

    es.onmessage = (e) => {
      if (!e.data || e.data.startsWith(":")) return; // Skip heartbeats
      try {
        onNewTask(JSON.parse(e.data));
      } catch { /* ignore parse errors */ }
    };

    return () => es.close();
  }, [onNewTask]);
}

// ─── 4. Connection Status Badge ───────────────────────────────────────────────

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
    const t = setInterval(poll, 30_000); // Re-check every 30s
    return () => clearInterval(t);
  }, []);

  const label  = { connected: "WA Live", disconnected: "WA Offline", banned: "WA Banned", none: "WA Not set up", loading: "…" }[status] ?? status;
  const color  = status === "connected" ? "#25D366" : status === "banned" ? "#ef4444" : "#6b7280";

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 12, fontWeight: 500, color,
      border: `1px solid ${color}33`, borderRadius: 99, padding: "2px 8px",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const btnPrimary: React.CSSProperties = {
  background: "#2563EB", color: "#fff", border: "none",
  borderRadius: 8, padding: "10px 20px", fontSize: 14,
  fontWeight: 500, cursor: "pointer",
};
