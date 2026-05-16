import { NextApiRequest, NextApiResponse } from "next";
import { NotificationType } from "@prisma/client";
import { z } from "zod";

import { channelMessageInclude } from "@/lib/chat-includes";
import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
import { extractMentionNames } from "@/lib/message-formatting";
import { canCreateMessage } from "@/lib/permissions";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { broadcast } from "@/lib/realtime";

const messageSchema = z.object({
  content: z.string().min(1, "Content is required").max(4000, "Content too long"),
  fileUrl: z.string().url("Invalid file URL").regex(/^(http|https):\/\//i, "Invalid file URL protocol").optional().nullable(),
  parentMessageId: z.string().uuid("Invalid parent message ID").optional().nullable(),
});

const querySchema = z.object({
  serverId: z.string().uuid("Invalid Server ID"),
  channelId: z.string().uuid("Invalid Channel ID"),
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
    const { serverId, channelId } = req.query;

    if (!profile) {
      return res.status(401).json({ error: "Unauthorized" });
    }    

    // Validate Query Params
    const queryValidation = querySchema.safeParse({
      serverId: serverId as string,
      channelId: channelId as string,
    });

    if (!queryValidation.success) {
      return res.status(400).json({ error: queryValidation.error.errors[0].message });
    }

    const validation = messageSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const { content, fileUrl, parentMessageId } = validation.data;

    // Optimized: Reduced from 3 queries to 2.
    // `db.member.findFirst` implicitly confirms server existence and membership, making `db.server.findFirst` redundant.
    const [channel, member] = await Promise.all([
      db.channel.findFirst({
        where: {
          id: channelId as string,
          serverId: serverId as string,
        },
        select: { id: true }
      }),
      db.member.findFirst({
        where: {
          serverId: serverId as string,
          profileId: profile.id,
        },
        select: { id: true, role: true }
      })
    ]);

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    if (!canCreateMessage(member)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const limit = checkRateLimit({
      key: rateLimitKey("message:create", profile.id, channelId as string),
      limit: 20,
      windowMs: 60_000,
    });

    if (!limit.ok) {
      return res.status(429).json({ error: `Too many messages. Retry in ${limit.retryAfterSeconds}s` });
    }

    const parentMessage = parentMessageId
      ? await db.message.findFirst({
          where: {
            id: parentMessageId,
            channelId: channelId as string,
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

    if (parentMessageId && !parentMessage) {
      return res.status(404).json({ error: "Parent message not found" });
    }

    const message = await db.message.create({
      data: {
        content,
        fileUrl,
        parentMessageId: parentMessage?.id,
        channelId: channelId as string,
        memberId: member.id,
      },
      include: channelMessageInclude(member.id),
    });

    const mentionedNames = extractMentionNames(content);
    const mentionedMembers = mentionedNames.length
      ? await db.member.findMany({
          where: {
            serverId: serverId as string,
            profile: {
              name: {
                in: mentionedNames,
              },
            },
            id: {
              not: member.id,
            },
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
            serverId: serverId as string,
            channelId: channelId as string,
            messageId: message.id,
            metadata: { preview: content.slice(0, 160) },
          }]
        : []),
      ...mentionedMembers.map((target) => ({
        type: NotificationType.MENTION,
        actorId: profile.id,
        targetId: target.profileId,
        serverId: serverId as string,
        channelId: channelId as string,
        messageId: message.id,
        metadata: { preview: content.slice(0, 160) },
      })),
    ];

    if (notifications.length) {
      await db.notification.createMany({ data: notifications });
    }

    const channelKey = `chat:${channelId}:messages`;

    await broadcast(channelKey, { id: message.id, type: "add" });

    return res.status(200).json(message);
  } catch (error) {
    console.log("[MESSAGES_POST]", error);
    return res.status(500).json({ message: "Internal Error" }); 
  }
}
