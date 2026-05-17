import { ChannelType, MemberRole, NotificationType } from "@prisma/client";
import { z } from "zod";

import { apiError, forbidden, rateLimitError, unauthorized, validationError } from "@/lib/api-response";
import { channelMessageInclude, directMessageInclude } from "@/lib/chat-includes";
import { getOrCreateConversation } from "@/lib/conversation";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { canCreateMessage } from "@/lib/permissions";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { broadcast } from "@/lib/realtime";
import { notificationPushPayload, sendPushNotification } from "@/lib/web-push";

export const dynamic = "force-dynamic";

const ForwardSchema = z.object({
  serverId: z.string().uuid("Invalid Server ID"),
  targetType: z.enum(["channel", "member"]),
  targetId: z.string().uuid("Invalid target ID"),
  content: z.string().max(4000).optional().default(""),
  fileUrl: z.string().url().regex(/^(http|https):\/\//i).optional().nullable(),
});

function forwardedContent(content: string) {
  const trimmed = content.trim();
  return trimmed ? `Переслано:\n${trimmed}` : "Пересланное вложение";
}

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedBody = ForwardSchema.safeParse(await req.json());
    if (!parsedBody.success) return validationError(parsedBody.error);

    const { serverId, targetType, targetId, content, fileUrl } = parsedBody.data;
    const member = await db.member.findFirst({
      where: {
        serverId,
        profileId: profile.id,
      },
      include: {
        serverRoles: {
          include: {
            role: {
              select: {
                permissions: true,
              },
            },
          },
        },
      },
    });

    if (!member) return unauthorized();
    if (!canCreateMessage(member)) return forbidden();

    const limit = await checkRateLimit({
      key: rateLimitKey("message:forward", profile.id, serverId),
      limit: 20,
      windowMs: 60_000,
    });

    if (!limit.ok) {
      return rateLimitError(limit.retryAfterSeconds, `Too many forwards. Retry in ${limit.retryAfterSeconds}s`);
    }

    if (targetType === "channel") {
      const channel = await db.channel.findFirst({
        where: {
          id: targetId,
          serverId,
          type: ChannelType.TEXT,
        },
        select: {
          id: true,
          slowModeSeconds: true,
        },
      });

      if (!channel) return apiError("Channel not found", 404);

      if (member.role === MemberRole.GUEST && channel.slowModeSeconds > 0) {
        const lastMessage = await db.message.findFirst({
          where: {
            channelId: channel.id,
            memberId: member.id,
            deleted: false,
          },
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
        });
        const elapsedSeconds = lastMessage
          ? Math.floor((Date.now() - lastMessage.createdAt.getTime()) / 1000)
          : channel.slowModeSeconds;

        if (elapsedSeconds < channel.slowModeSeconds) {
          return rateLimitError(channel.slowModeSeconds - elapsedSeconds, "В этом канале включён slow-mode");
        }
      }

      const message = await db.message.create({
        data: {
          content: forwardedContent(content),
          fileUrl,
          channelId: channel.id,
          memberId: member.id,
        },
        include: channelMessageInclude(member.id),
      });

      await broadcast(`chat:${channel.id}:messages`, { id: message.id, action: "add" });
      return Response.json({ message, url: `/servers/${serverId}/channels/${channel.id}` });
    }

    const targetMember = await db.member.findFirst({
      where: {
        id: targetId,
        serverId,
      },
      select: {
        id: true,
        profileId: true,
      },
    });

    if (!targetMember || targetMember.id === member.id) return apiError("Member not found", 404);

    const conversation = await getOrCreateConversation(member.id, targetMember.id);
    if (!conversation) return apiError("Conversation not found", 404);

    const message = await db.directMessage.create({
      data: {
        content: forwardedContent(content),
        fileUrl,
        conversationId: conversation.id,
        memberId: member.id,
      },
      include: directMessageInclude(member.id),
    });

    if (targetMember.profileId !== profile.id) {
      const notification = {
        type: NotificationType.DIRECT_MESSAGE,
        actorId: profile.id,
        targetId: targetMember.profileId,
        conversationId: conversation.id,
        directMessageId: message.id,
        metadata: { preview: message.content.slice(0, 160) },
      };

      await db.notification.create({ data: notification });
      await sendPushNotification(targetMember.profileId, notificationPushPayload({
        title: `${profile.name} переслал(а) сообщение`,
        preview: message.content,
        url: `/servers/${serverId}/conversations/${member.id}`,
      }));
    }

    await broadcast(`chat:${conversation.id}:messages`, { id: message.id, action: "add" });

    return Response.json({
      message,
      url: `/servers/${serverId}/conversations/${targetMember.id}`,
    });
  } catch (error) {
    console.log("[FORWARD_POST]", error);
    return apiError("Internal Error", 500);
  }
}
