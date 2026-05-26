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
      writer.write(enc.encode("data: " + JSON.stringify(task) + "\n\n"));
    }
  };

  baileysService.on("task:detected", onTask);

  const heartbeat = setInterval(
    () => writer.write(enc.encode(": heartbeat\n\n")),
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
