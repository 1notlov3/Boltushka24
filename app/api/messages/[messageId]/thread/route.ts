import { z } from "zod";

import { apiError, notFound, unauthorized, validationError } from "@/lib/api-response";
import { channelMessageInclude } from "@/lib/chat-includes";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const REPLIES_BATCH = 30;

const ParamsSchema = z.object({
  messageId: z.string().uuid("Invalid message ID"),
});

const QuerySchema = z.object({
  cursor: z.string().uuid("Invalid Cursor ID").optional().nullable(),
});

export async function GET(req: Request, context: { params: Promise<{ messageId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const { searchParams } = new URL(req.url);
    const parsedQuery = QuerySchema.safeParse({
      cursor: searchParams.get("cursor"),
    });
    if (!parsedQuery.success) return validationError(parsedQuery.error);

    const access = await db.message.findFirst({
      where: {
        id: parsedParams.data.messageId,
        channel: {
          server: {
            members: {
              some: { profileId: profile.id },
            },
          },
        },
      },
      select: {
        id: true,
        channelId: true,
        channel: {
          select: {
            serverId: true,
          },
        },
      },
    });

    if (!access) return notFound("Message not found");

    const member = await db.member.findFirst({
      where: {
        serverId: access.channel.serverId,
        profileId: profile.id,
      },
      select: { id: true },
    });

    if (!member) return unauthorized();

    const [parent, replies] = await Promise.all([
      db.message.findUnique({
        where: { id: access.id },
        include: channelMessageInclude(member.id),
      }),
      db.message.findMany({
        take: REPLIES_BATCH,
        ...(parsedQuery.data.cursor ? { skip: 1, cursor: { id: parsedQuery.data.cursor } } : {}),
        where: {
          parentMessageId: access.id,
          channelId: access.channelId,
        },
        include: channelMessageInclude(member.id),
        orderBy: {
          createdAt: "asc",
        },
      }),
    ]);

    if (!parent) return notFound("Message not found");

    return Response.json(
      {
        parent,
        items: replies,
        nextCursor: replies.length === REPLIES_BATCH ? replies[REPLIES_BATCH - 1].id : null,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    console.log("[MESSAGE_THREAD_GET]", error);
    return apiError("Internal Error", 500);
  }
}
