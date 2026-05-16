import { z } from "zod";

import { apiError, unauthorized } from "@/lib/api-response";
import { channelMessageInclude } from "@/lib/chat-includes";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const MESSAGES_BATCH = 10;

export async function GET(
  req: Request
) {
  try {
    const profile = await currentProfile();
    const { searchParams } = new URL(req.url);

    const cursor = searchParams.get("cursor");
    const channelId = searchParams.get("channelId");

    if (!profile) return unauthorized();
    if (!channelId) return apiError("Channel ID missing", 400);

    const channelIdValidation = z.string().uuid().safeParse(channelId);
    if (!channelIdValidation.success) {
      return apiError("Invalid Channel ID", 400);
    }

    if (cursor) {
      const cursorValidation = z.string().uuid().safeParse(cursor);
      if (!cursorValidation.success) {
        return apiError("Invalid Cursor ID", 400);
      }
    }

    const channel = await db.channel.findFirst({
      where: {
        id: channelId,
        server: {
          members: {
            some: {
              profileId: profile.id,
            }
          }
        }
      },
      select: {
        id: true,
        serverId: true,
      }
    });

    if (!channel) {
      return unauthorized();
    }

    const member = await db.member.findFirst({
      where: {
        serverId: channel.serverId,
        profileId: profile.id,
      },
      select: {
        id: true,
      },
    });

    if (!member) {
      return unauthorized();
    }

    const messages = await db.message.findMany({
      take: MESSAGES_BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      where: {
        channelId,
      },
      include: channelMessageInclude(member.id),
      orderBy: {
        createdAt: "desc",
      },
    });

    let nextCursor = null;

    if (messages.length === MESSAGES_BATCH) {
      nextCursor = messages[MESSAGES_BATCH - 1].id;
    }

    return Response.json({
      items: messages,
      nextCursor
    });
  } catch (error) {
    console.log("[MESSAGES_GET]", error);
    return apiError("Internal Error", 500);
  }
}
