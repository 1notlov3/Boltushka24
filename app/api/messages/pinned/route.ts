import { z } from "zod";

import { apiError, unauthorized, validationError } from "@/lib/api-response";
import { channelMessageInclude } from "@/lib/chat-includes";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  channelId: z.string().uuid("Invalid channel ID"),
});

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsed = QuerySchema.safeParse({
      channelId: new URL(req.url).searchParams.get("channelId"),
    });
    if (!parsed.success) return validationError(parsed.error);

    const channel = await db.channel.findFirst({
      where: {
        id: parsed.data.channelId,
        server: { members: { some: { profileId: profile.id } } },
      },
      select: { id: true, serverId: true },
    });

    if (!channel) return unauthorized();

    const member = await db.member.findFirst({
      where: { profileId: profile.id, serverId: channel.serverId },
      select: { id: true },
    });

    if (!member) return unauthorized();

    const items = await db.message.findMany({
      take: 50,
      where: { channelId: channel.id, pinned: true, deleted: false },
      include: channelMessageInclude(member.id),
      orderBy: { pinnedAt: "desc" },
    });

    return Response.json({ items });
  } catch (error) {
    console.log("[MESSAGES_PINNED_GET]", error);
    return apiError("Internal Error", 500);
  }
}
