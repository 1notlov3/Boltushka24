import { NextApiRequest, NextApiResponse } from "next";
import { MemberRole } from "@prisma/client";
import { z } from "zod";

import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
import { broadcast } from "@/lib/realtime";

const messageSchema = z.object({
  content: z.string().min(1, "Content is required").max(4000, "Content too long"),
});

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

    let [member, channel, message] = await Promise.all([
      db.member.findFirst({
        where: {
          serverId: serverId as string,
          profileId: profile.id,
        }
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
        include: {
          member: {
            include: {
              profile: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                }
              }
            }
          }
        }
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

    const isMessageOwner = message.memberId === member.id;
    const isAdmin = member.role === MemberRole.ADMIN;
    const isModerator = member.role === MemberRole.MODERATOR;
    const canModify = isMessageOwner || isAdmin || isModerator;

    if (!canModify) {
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
        include: {
          member: {
            include: {
              profile: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                }
              }
            }
          }
        }
      })
    }

    if (req.method === "PATCH") {
      if (!isMessageOwner) {
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
        include: {
          member: {
            include: {
              profile: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                }
              }
            }
          }
        }
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
