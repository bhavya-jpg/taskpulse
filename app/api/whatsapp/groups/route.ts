import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { baileysService, groupConsentService } from "@/lib/singletons";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const groups = await baileysService.listUserGroups(session.user.id);
    const approved = await groupConsentService.getApprovedGroups(session.user.id);

    return NextResponse.json(
      groups.map(g => ({ ...g, isApproved: approved.includes(g.jid) }))
    );
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
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
