import { z } from "zod";

import { apiError, unauthorized, validationError } from "@/lib/api-response";
import { channelMessageInclude } from "@/lib/chat-includes";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  channelId: z.string().uuid("Invalid channel ID"),
  q: z.string().trim().min(1).max(100),
  authorId: z.string().uuid("Invalid author ID").optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      channelId: searchParams.get("channelId"),
      q: searchParams.get("q"),
      authorId: searchParams.get("authorId"),
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

    if (parsed.data.authorId) {
      const authorMember = await db.member.findFirst({
        where: { id: parsed.data.authorId, serverId: channel.serverId },
        select: { id: true },
      });
      if (!authorMember) return apiError("Invalid author ID", 400);
    }

    const items = await db.message.findMany({
      take: 25,
      where: {
        channelId: channel.id,
        deleted: false,
        content: { contains: parsed.data.q, mode: "insensitive" },
        ...(parsed.data.authorId ? { memberId: parsed.data.authorId } : {}),
      },
      include: channelMessageInclude(member.id),
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ items });
  } catch (error) {
    console.log("[MESSAGES_SEARCH_GET]", error);
    return apiError("Internal Error", 500);
  }
}
