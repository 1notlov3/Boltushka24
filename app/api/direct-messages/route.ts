import { z } from "zod";

import { apiError, unauthorized } from "@/lib/api-response";
import { directMessageInclude } from "@/lib/chat-includes";
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
    const conversationId = searchParams.get("conversationId");

    if (!profile) return unauthorized();
    if (!conversationId) return apiError("Conversation ID missing", 400);

    const conversationIdValidation = z.string().uuid().safeParse(conversationId);
    if (!conversationIdValidation.success) {
      return apiError("Invalid Conversation ID", 400);
    }

    if (cursor) {
      const cursorValidation = z.string().uuid().safeParse(cursor);
      if (!cursorValidation.success) {
        return apiError("Invalid Cursor ID", 400);
      }
    }

    const conversation = await db.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          {
            memberOne: {
              profileId: profile.id,
            }
          },
          {
            memberTwo: {
              profileId: profile.id,
            }
          }
        ]
      },
      select: {
        id: true,
        memberOne: {
          select: {
            id: true,
            profileId: true,
          },
        },
        memberTwo: {
          select: {
            id: true,
            profileId: true,
          },
        },
      }
    });

    if (!conversation) {
      return unauthorized();
    }

    const member = conversation.memberOne.profileId === profile.id
      ? conversation.memberOne
      : conversation.memberTwo;

    const messages = await db.directMessage.findMany({
      take: MESSAGES_BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      where: {
        conversationId,
      },
      include: directMessageInclude(member.id),
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
    console.log("[DIRECT_MESSAGES_GET]", error);
    return apiError("Internal Error", 500);
  }
}
