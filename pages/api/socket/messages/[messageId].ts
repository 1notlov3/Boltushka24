import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { channelMessageInclude } from "@/lib/chat-includes";
import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
import { canDeleteMessage, canEditMessage } from "@/lib/permissions";
import { broadcast } from "@/lib/realtime";

const messageSchema = z.object({
  content: z.string().min(1, "Content is required").max(4000, "Content too long"),
});

const idSchema = z.string().uuid("Invalid message ID");

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "DELETE" && req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const profile = await currentProfilePages(req);
    const { messageId, serverId, channelId } = req.query;

    if (!profile) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!serverId) {
      return res.status(400).json({ error: "Server ID missing" });
    }

    if (!channelId) {
      return res.status(400).json({ error: "Channel ID missing" });
    }

    const messageIdValidation = idSchema.safeParse(messageId);
    if (!messageIdValidation.success) {
      return res.status(400).json({ error: messageIdValidation.error.errors[0].message });
    }

    let [member, channel, message] = await Promise.all([
      db.member.findFirst({
        where: {
          serverId: serverId as string,
          profileId: profile.id,
        },
        select: {
          id: true,
          role: true,
        },
      }),
      db.channel.findFirst({
        where: {
          id: channelId as string,
          serverId: serverId as string,
        },
      }),
      db.message.findFirst({
        where: {
          id: messageId as string,
          channelId: channelId as string,
        },
        include: channelMessageInclude(""),
      })
    ]);

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    if (!channel) {
      return res.status(404).json({ error: "Channel not found" });
    }

    if (!message || message.deleted) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (!canDeleteMessage(member, message.memberId)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (req.method === "DELETE") {
      message = await db.message.update({
        where: {
          id: messageId as string,
        },
        data: {
          fileUrl: null,
          content: "Это сообщение удалено",
          deleted: true,
        },
        include: channelMessageInclude(member.id),
      })
    }

    if (req.method === "PATCH") {
      if (!canEditMessage(member, message.memberId)) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const validation = messageSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { content } = validation.data;

      message = await db.message.update({
        where: {
          id: messageId as string,
        },
        data: {
          content,
        },
        include: channelMessageInclude(member.id),
      })
    }

    const updateKey = `chat:${channelId}:messages:update`;

    await broadcast(updateKey, { id: message.id, type: "update" });

    return res.status(200).json(message);
  } catch (error) {
    console.log("[MESSAGE_ID]", error);
    return res.status(500).json({ error: "Internal Error" });
  }
}
