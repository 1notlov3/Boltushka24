import { NextResponse } from "next/server";
import { z } from "zod";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  inviteCode: z.string().uuid(),
});

export async function POST(_req: Request, context: { params: Promise<{ inviteCode: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return new NextResponse("Unauthorized", { status: 401 });

    const params = ParamsSchema.safeParse(await context.params);
    if (!params.success) return new NextResponse("Invalid invite code", { status: 400 });

    const server = await db.server.findUnique({
      where: { inviteCode: params.data.inviteCode },
      select: {
        id: true,
        members: {
          where: { profileId: profile.id },
          select: { id: true },
        },
      },
    });

    if (!server) return new NextResponse("Invite not found", { status: 404 });
    if (server.members.length > 0) return NextResponse.json({ serverId: server.id });

    const activeBan = await db.serverBan.findFirst({
      where: {
        serverId: server.id,
        profileId: profile.id,
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      select: { id: true },
    });

    if (activeBan) {
      return new NextResponse("Вы забанены на этом сервере", { status: 403 });
    }

    await db.member.create({
      data: {
        profileId: profile.id,
        serverId: server.id,
      },
    });

    return NextResponse.json({ serverId: server.id });
  } catch (error) {
    console.log("[INVITE_JOIN_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
