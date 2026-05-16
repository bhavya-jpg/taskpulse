import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { baileysService } from "@/lib/singletons";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // Connection process starts in background, QR is delivered via SSE
  await baileysService.connect(userId);
  return NextResponse.json({ status: "connecting" });
}
