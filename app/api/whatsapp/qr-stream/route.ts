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
    writer.write(enc.encode("data: " + JSON.stringify(data) + "\n\n"));

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
    try { writer.close(); } catch {}
  };

  baileysService.on("qr", onQR);
  baileysService.on("connected", onConnected);
  baileysService.on("banned", onBanned);

  req.signal.addEventListener("abort", cleanup);

  return new Response(stream.readable, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
    },
  });
}
