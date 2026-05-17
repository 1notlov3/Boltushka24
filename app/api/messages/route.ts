import { NotificationType } from "@prisma/client";
import { z } from "zod";

import { apiError, rateLimitError, unauthorized, validationError } from "@/lib/api-response";
import { channelMessageInclude } from "@/lib/chat-includes";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { extractMentionMemberIds } from "@/lib/message-formatting";
import { canCreateMessage } from "@/lib/permissions";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { broadcast } from "@/lib/realtime";
import { notificationPushPayload, sendPushNotification } from "@/lib/web-push";

export const dynamic = "force-dynamic";

const MESSAGES_BATCH = 30;

const MessageSchema = z.object({
  content: z.string().min(1, "Content is required").max(4000, "Content too long"),
  fileUrl: z.string().url("Invalid file URL").regex(/^(http|https):\/\//i, "Invalid file URL protocol").optional().nullable(),
  parentMessageId: z.string().uuid("Invalid parent message ID").optional().nullable(),
});

const QuerySchema = z.object({
  serverId: z.string().uuid("Invalid Server ID"),
  channelId: z.string().uuid("Invalid Channel ID"),
});

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
    console.log("[MESSAGES_GET]", error);
    return apiError("Internal Error", 500);
  }
}

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const { searchParams } = new URL(req.url);
    const parsedQuery = QuerySchema.safeParse({
      serverId: searchParams.get("serverId"),
      channelId: searchParams.get("channelId"),
    });

    if (!parsedQuery.success) return validationError(parsedQuery.error);

    const parsedBody = MessageSchema.safeParse(await req.json());
    if (!parsedBody.success) return validationError(parsedBody.error);

    const { serverId, channelId } = parsedQuery.data;
    const { content, fileUrl, parentMessageId } = parsedBody.data;

    const [channel, member] = await Promise.all([
      db.channel.findFirst({
        where: { id: channelId, serverId },
        select: { id: true },
      }),
      db.member.findFirst({
        where: { serverId, profileId: profile.id },
        select: { id: true, role: true },
      }),
    ]);

    if (!channel) return apiError("Channel not found", 404);
    if (!member) return unauthorized();
    if (!canCreateMessage(member)) return apiError("Forbidden", 403);

    const limit = await checkRateLimit({
      key: rateLimitKey("message:create", profile.id, channelId),
      limit: 20,
      windowMs: 60_000,
    });

    if (!limit.ok) {
      return rateLimitError(limit.retryAfterSeconds, `Too many messages. Retry in ${limit.retryAfterSeconds}s`);
    }

    const parentMessage = parentMessageId
      ? await db.message.findFirst({
          where: {
            id: parentMessageId,
            channelId,
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

    if (parentMessageId && !parentMessage) {
      return apiError("Parent message not found", 404);
    }

    const message = await db.message.create({
      data: {
        content,
        fileUrl,
        parentMessageId: parentMessage?.id,
        channelId,
        memberId: member.id,
      },
      include: channelMessageInclude(member.id),
    });

    const mentionedMemberIds = extractMentionMemberIds(content).filter((id) => id !== member.id);
    const mentionedMembers = mentionedMemberIds.length
      ? await db.member.findMany({
          where: {
            id: {
              in: mentionedMemberIds,
            },
            serverId,
          },
          select: {
            profileId: true,
          },
        })
      : [];

    const notifications = [
      ...(parentMessage && parentMessage.member.profileId !== profile.id
        ? [{
            type: NotificationType.REPLY,
            actorId: profile.id,
            targetId: parentMessage.member.profileId,
            serverId,
            channelId,
            messageId: message.id,
            metadata: { preview: content.slice(0, 160) },
          }]
        : []),
      ...mentionedMembers.map((target) => ({
        type: NotificationType.MENTION,
        actorId: profile.id,
        targetId: target.profileId,
        serverId,
        channelId,
        messageId: message.id,
        metadata: { preview: content.slice(0, 160) },
      })),
    ];

    if (notifications.length) {
      await db.notification.createMany({ data: notifications });
      await Promise.allSettled(notifications.map((notification) => (
        sendPushNotification(notification.targetId, notificationPushPayload({
          title: notification.type === NotificationType.MENTION
            ? `${profile.name} упомянул(а) вас`
            : `${profile.name} ответил(а) вам`,
          preview: content,
          url: `/servers/${serverId}/channels/${channelId}${parentMessage?.id ? `?thread=${parentMessage.id}` : ""}`,
        }))
      )));
    }

    await broadcast(`chat:${channelId}:messages`, { id: message.id, action: "add" });

    if (parentMessage?.id) {
      await broadcast(`thread:${parentMessage.id}:messages`, { id: message.id, action: "add" });
    }

    return Response.json(message);
  } catch (error) {
    console.log("[MESSAGES_POST]", error);
    return apiError("Internal Error", 500);
  }
}
