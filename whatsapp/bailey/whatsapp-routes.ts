/**
 * NEXT.JS API ROUTES
 * ──────────────────
 * All WhatsApp-related endpoints the frontend needs.
 * Place these in: /app/api/whatsapp/
 */

// ─── /app/api/whatsapp/connect/route.ts ──────────────────────────────────────
// Initiates WhatsApp connection for the logged-in user.
// Returns a QR code string that the frontend renders as an image.

export const connectRoute = `
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { baileysService } from "@/lib/singletons"; // singleton instance

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // QR delivered via SSE (Server-Sent Events) — see /api/whatsapp/qr-stream
  await baileysService.connect(userId);
  return NextResponse.json({ status: "connecting" });
}
`;

// ─── /app/api/whatsapp/qr-stream/route.ts ────────────────────────────────────
// SSE endpoint. Frontend listens here to receive the QR code as soon as it's ready.

export const qrStreamRoute = `
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { baileysService } from "@/lib/singletons";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const userId = session.user.id;

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const enc    = new TextEncoder();

  const sendEvent = (data: object) =>
    writer.write(enc.encode("data: " + JSON.stringify(data) + "\\n\\n"));

  // Listen for QR event from Baileys
  const onQR = ({ userId: uid, qr }: { userId: string; qr: string }) => {
    if (uid === userId) sendEvent({ type: "qr", qr });
  };
  const onConnected = ({ userId: uid, phoneNumber }: any) => {
    if (uid === userId) {
      sendEvent({ type: "connected", phoneNumber });
      cleanup();
    }
  };
  const onBanned = ({ userId: uid }: any) => {
    if (uid === userId) {
      sendEvent({ type: "banned" });
      cleanup();
    }
  };

  const cleanup = () => {
    baileysService.off("qr", onQR);
    baileysService.off("connected", onConnected);
    baileysService.off("banned", onBanned);
    writer.close();
  };

  baileysService.on("qr", onQR);
  baileysService.on("connected", onConnected);
  baileysService.on("banned", onBanned);

  // Clean up if client disconnects
  req.signal.addEventListener("abort", cleanup);

  return new Response(stream.readable, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
    },
  });
}
`;

// ─── /app/api/whatsapp/groups/route.ts ───────────────────────────────────────
// GET  → returns all groups the user is a member of (for consent UI)
// POST → approves a group for monitoring
// DELETE → revokes consent for a group

export const groupsRoute = `
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { baileysService, groupConsentService } from "@/lib/singletons";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const groups = await baileysService.listUserGroups(session.user.id);
  const approved = await groupConsentService.getApprovedGroups(session.user.id);

  return NextResponse.json(
    groups.map(g => ({ ...g, isApproved: approved.includes(g.jid) }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jid, groupName } = await req.json();
  if (!jid || !groupName) return NextResponse.json({ error: "jid and groupName required" }, { status: 400 });

  await groupConsentService.addGroup(session.user.id, jid, groupName);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jid } = await req.json();
  await groupConsentService.removeGroup(session.user.id, jid);
  return NextResponse.json({ success: true });
}
`;

// ─── /app/api/whatsapp/task-stream/route.ts ──────────────────────────────────
// SSE endpoint for the dashboard. When AI detects a new task from WhatsApp,
// it appears live on the dashboard without a page refresh.

export const taskStreamRoute = `
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { baileysService } from "@/lib/singletons";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const userId = session.user.id;
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const enc    = new TextEncoder();

  const onTask = ({ userId: uid, task }: any) => {
    if (uid === userId) {
      writer.write(enc.encode("data: " + JSON.stringify(task) + "\\n\\n"));
    }
  };

  baileysService.on("task:detected", onTask);

  // Heartbeat to keep the SSE connection alive
  const heartbeat = setInterval(
    () => writer.write(enc.encode(": heartbeat\\n\\n")),
    25000
  );

  req.signal.addEventListener("abort", () => {
    baileysService.off("task:detected", onTask);
    clearInterval(heartbeat);
    writer.close();
  });

  return new Response(stream.readable, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
    },
  });
}
`;

// ─── /app/api/whatsapp/status/route.ts ───────────────────────────────────────
// Returns connection status for the dashboard header badge.

export const statusRoute = `
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { baileysService } from "@/lib/singletons";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = baileysService.getSessionStatus(session.user.id);
  return NextResponse.json({ status });
}
`;
