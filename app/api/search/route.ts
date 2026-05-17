import { z } from "zod";

import { apiError, rateLimitError, unauthorized, validationError } from "@/lib/api-response";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  serverId: z.string().uuid("Invalid server ID"),
  q: z.string().trim().min(1).max(100),
  from: z.string().datetime().optional().nullable(),
  to: z.string().datetime().optional().nullable(),
  author: z.string().uuid("Invalid author ID").optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const limit = await checkRateLimit({
      key: rateLimitKey("search:v2", profile.id, profile.id),
      limit: 30,
      windowMs: 60_000,
    });
    if (!limit.ok) return rateLimitError(limit.retryAfterSeconds);

    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      serverId: searchParams.get("serverId"),
      q: searchParams.get("q"),
      from: searchParams.get("from"),
      to: searchParams.get("to"),
      author: searchParams.get("author"),
    });

    if (!parsed.success) return validationError(parsed.error);

    const { serverId, q, author } = parsed.data;
    const member = await db.member.findFirst({
      where: {
        serverId,
        profileId: profile.id,
      },
      select: {
        id: true,
      },
    });

    if (!member) return unauthorized();

    const createdAt = {
      ...(parsed.data.from ? { gte: new Date(parsed.data.from) } : {}),
      ...(parsed.data.to ? { lte: new Date(parsed.data.to) } : {}),
    };

    const [messages, directMessages] = await Promise.all([
      db.message.findMany({
        take: 30,
        where: {
          deleted: false,
          content: { contains: q, mode: "insensitive" },
          channel: { serverId },
          ...(Object.keys(createdAt).length ? { createdAt } : {}),
          ...(author ? { memberId: author } : {}),
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          channelId: true,
          channel: { select: { name: true } },
          member: { select: { id: true, profile: { select: { name: true, imageUrl: true } } } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.directMessage.findMany({
        take: 30,
        where: {
          deleted: false,
          content: { contains: q, mode: "insensitive" },
          conversation: {
            OR: [
              { memberOneId: member.id },
              { memberTwoId: member.id },
            ],
          },
          ...(Object.keys(createdAt).length ? { createdAt } : {}),
          ...(author ? { memberId: author } : {}),
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          conversationId: true,
          conversation: {
            select: {
              memberOneId: true,
              memberTwoId: true,
            },
          },
          member: { select: { id: true, profile: { select: { name: true, imageUrl: true } } } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const items = [
      ...messages.map((message) => ({
        id: message.id,
        type: "channel" as const,
        title: `#${message.channel.name}`,
        content: message.content,
        createdAt: message.createdAt,
        channelId: message.channelId,
        channelName: message.channel.name,
        author: message.member.profile,
        url: `/servers/${serverId}/channels/${message.channelId}`,
      })),
      ...directMessages.map((message) => {
        const otherMemberId = message.conversation.memberOneId === member.id
          ? message.conversation.memberTwoId
          : message.conversation.memberOneId;

        return {
          id: message.id,
          type: "conversation" as const,
          title: "Личные сообщения",
          content: message.content,
          createdAt: message.createdAt,
          conversationId: message.conversationId,
          author: message.member.profile,
          url: `/servers/${serverId}/conversations/${otherMemberId}`,
        };
      }),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 40);

    return Response.json({ items });
  } catch (error) {
    console.log("[SEARCH_V2_GET]", error);
    return apiError("Internal Error", 500);
  }
}
