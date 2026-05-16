import { NextApiRequest, NextApiResponse } from "next";
import { NotificationType } from "@prisma/client";
import { z } from "zod";

import { directMessageInclude } from "@/lib/chat-includes";
import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
import { canCreateMessage } from "@/lib/permissions";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { broadcast } from "@/lib/realtime";

const messageSchema = z.object({
  content: z.string().min(1, "Content is required").max(4000, "Content too long"),
  fileUrl: z.string().url("Invalid file URL").regex(/^(http|https):\/\//i, "Invalid file URL protocol").optional().nullable(),
  parentDirectMessageId: z.string().uuid("Invalid parent message ID").optional().nullable(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const profile = await currentProfilePages(req);
    const { conversationId } = req.query;

    if (!profile) {
      return res.status(401).json({ error: "Unauthorized" });
    }    

    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID missing" });
    }

    const validation = messageSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const { content, fileUrl, parentDirectMessageId } = validation.data;

    const conversation = await db.conversation.findFirst({
      where: {
        id: conversationId as string,
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
      include: {
        memberOne: {
          select: {
            id: true,
            role: true,
            profileId: true,
          }
        },
        memberTwo: {
          select: {
            id: true,
            role: true,
            profileId: true,
          }
        }
      }
    })

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const member = conversation.memberOne.profileId === profile.id ? conversation.memberOne : conversation.memberTwo

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    if (!canCreateMessage(member)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const limit = checkRateLimit({
      key: rateLimitKey("direct-message:create", profile.id, conversationId as string),
      limit: 20,
      windowMs: 60_000,
    });

    if (!limit.ok) {
      return res.status(429).json({ error: `Too many messages. Retry in ${limit.retryAfterSeconds}s` });
    }

    const parentDirectMessage = parentDirectMessageId
      ? await db.directMessage.findFirst({
          where: {
            id: parentDirectMessageId,
            conversationId: conversationId as string,
            deleted: false,
          },
          select: {
            id: true,
            memberId: true,
            member: {
              select: {
                profileId: true,
              },
            },
          },
        })
      : null;

    if (parentDirectMessageId && !parentDirectMessage) {
      return res.status(404).json({ error: "Parent message not found" });
    }

    const message = await db.directMessage.create({
      data: {
        content,
        fileUrl,
        parentDirectMessageId: parentDirectMessage?.id,
        conversationId: conversationId as string,
        memberId: member.id,
      },
      include: directMessageInclude(member.id),
    });

    const otherMember = conversation.memberOne.id === member.id ? conversation.memberTwo : conversation.memberOne;
    const notificationTargetId = parentDirectMessage?.member.profileId ?? otherMember.profileId;

    if (notificationTargetId !== profile.id) {
      await db.notification.create({
        data: {
          type: parentDirectMessage ? NotificationType.REPLY : NotificationType.DIRECT_MESSAGE,
          actorId: profile.id,
          targetId: notificationTargetId,
          conversationId: conversationId as string,
          directMessageId: message.id,
          metadata: { preview: content.slice(0, 160) },
        },
      });
    }

    const channelKey = `chat:${conversationId}:messages`;

    await broadcast(channelKey, { id: message.id, type: "add" });

    return res.status(200).json(message);
  } catch (error) {
    console.log("[DIRECT_MESSAGES_POST]", error);
    return res.status(500).json({ message: "Internal Error" }); 
  }
}
