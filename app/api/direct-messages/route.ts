import { ConversationType, NotificationType } from "@prisma/client";
import { z } from "zod";

import { apiError, rateLimitError, unauthorized, validationError } from "@/lib/api-response";
import { directMessageInclude } from "@/lib/chat-includes";
import { getConversationAccess } from "@/lib/conversation";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { assertNoActiveMemberTimeout } from "@/lib/moderation-enforcement";
import { canCreateMessage } from "@/lib/permissions";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { broadcast } from "@/lib/realtime";
import { notificationPushPayload, sendPushNotification } from "@/lib/web-push";

export const dynamic = "force-dynamic";

const MESSAGES_BATCH = 30;

const MessageSchema = z.object({
  content: z.string().min(1, "Content is required").max(4000, "Content too long"),
  fileUrl: z.string().url("Invalid file URL").regex(/^(http|https):\/\//i, "Invalid file URL protocol").optional().nullable(),
  parentDirectMessageId: z.string().uuid("Invalid parent message ID").optional().nullable(),
});

const QuerySchema = z.object({
  conversationId: z.string().uuid("Invalid Conversation ID"),
});

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

    const access = await getConversationAccess({ conversationId, profileId: profile.id });

    if (!access) {
      return unauthorized();
    }

    const member = access.currentMember;

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

    return Response.json(
      {
        items: messages,
        nextCursor
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    console.log("[DIRECT_MESSAGES_GET]", error);
    return apiError("Internal Error", 500);
  }
}

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const { searchParams } = new URL(req.url);
    const parsedQuery = QuerySchema.safeParse({
      conversationId: searchParams.get("conversationId"),
    });

    if (!parsedQuery.success) return validationError(parsedQuery.error);

    const parsedBody = MessageSchema.safeParse(await req.json());
    if (!parsedBody.success) return validationError(parsedBody.error);

    const { conversationId } = parsedQuery.data;
    const { content, fileUrl, parentDirectMessageId } = parsedBody.data;

    const access = await getConversationAccess({ conversationId, profileId: profile.id });

    if (!access) return apiError("Conversation not found", 404);

    const conversation = access.conversation;
    const member = access.currentMember;

    if (!canCreateMessage(member)) return apiError("Forbidden", 403);

    const timeoutError = await assertNoActiveMemberTimeout(member.serverId, member.id, "У вас таймаут на отправку сообщений");
    if (timeoutError) return timeoutError;

    const limit = await checkRateLimit({
      key: rateLimitKey("direct-message:create", profile.id, conversationId),
      limit: 30,
      windowMs: 60_000,
    });

    if (!limit.ok) {
      return rateLimitError(limit.retryAfterSeconds, `Too many messages. Retry in ${limit.retryAfterSeconds}s`);
    }

    const parentDirectMessage = parentDirectMessageId
      ? await db.directMessage.findFirst({
          where: {
            id: parentDirectMessageId,
            conversationId,
            deleted: false,
          },
          select: {
            id: true,
            member: {
              select: {
                profileId: true,
              },
            },
          },
        })
      : null;

    if (parentDirectMessageId && !parentDirectMessage) {
      return apiError("Parent message not found", 404);
    }

    const message = await db.directMessage.create({
      data: {
        content,
        fileUrl,
        parentDirectMessageId: parentDirectMessage?.id,
        conversationId,
        memberId: member.id,
      },
      include: directMessageInclude(member.id),
    });

    const notificationTargetIds = parentDirectMessage
      ? [parentDirectMessage.member.profileId]
      : access.participants
        .filter((participant) => participant.memberId !== member.id)
        .map((participant) => participant.member.profileId);
    const uniqueNotificationTargetIds = [...new Set(notificationTargetIds)].filter((targetId) => targetId !== profile.id);
    const directOtherMember = conversation.type === ConversationType.DIRECT
      ? (conversation.memberOne.id === member.id ? conversation.memberTwo : conversation.memberOne)
      : null;
    const notificationUrl = conversation.type === ConversationType.GROUP
      ? `/servers/${member.serverId}/conversations/group/${conversationId}`
      : `/servers/${member.serverId}/conversations/${directOtherMember?.id ?? member.id}`;

    await Promise.all(uniqueNotificationTargetIds.map(async (notificationTargetId) => {
      const notification = {
        type: parentDirectMessage ? NotificationType.REPLY : NotificationType.DIRECT_MESSAGE,
        actorId: profile.id,
        targetId: notificationTargetId,
        conversationId,
        directMessageId: message.id,
        metadata: { preview: content.slice(0, 160) },
      };

      await db.notification.create({ data: notification });
      await sendPushNotification(notificationTargetId, notificationPushPayload({
        title: parentDirectMessage ? `${profile.name} ответил(а) вам` : `${profile.name} написал(а) вам`,
        preview: content,
        url: notificationUrl,
      }));
    }));

    await broadcast(`chat:${conversationId}:messages`, { id: message.id, action: "add" });

    return Response.json(message);
  } catch (error) {
    console.log("[DIRECT_MESSAGES_POST]", error);
    return apiError("Internal Error", 500);
  }
}
