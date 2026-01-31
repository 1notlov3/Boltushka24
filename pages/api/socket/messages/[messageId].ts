import { NextApiRequest } from "next";
import { MemberRole } from "@prisma/client";
import { z } from "zod";

import { NextApiResponseServerIo } from "@/types";
import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIo,
) {
  if (req.method !== "DELETE" && req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const profile = await currentProfilePages(req);
    const { messageId, serverId, channelId } = req.query;
    const { content } = req.body;

    if (!profile) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!serverId) {
      return res.status(400).json({ error: "Server ID missing" });
    }

    if (!channelId) {
      return res.status(400).json({ error: "Channel ID missing" });
    }

    // 🛡️ Sentinel: Validate UUIDs
    const querySchema = z.object({
      messageId: z.string().uuid("Invalid Message ID"),
      serverId: z.string().uuid("Invalid Server ID"),
      channelId: z.string().uuid("Invalid Channel ID"),
    });

    const queryValidation = querySchema.safeParse(req.query);

    if (!queryValidation.success) {
      return res.status(400).json({ error: queryValidation.error.errors[0].message });
    }

    const member = await db.member.findFirst({
      where: {
        serverId: serverId as string,
        profileId: profile.id,
      }
    });

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    const channel = await db.channel.findFirst({
      where: {
        id: channelId as string,
        serverId: serverId as string,
      },
    });

    if (!channel) {
      return res.status(404).json({ error: "Channel not found" });
    }

    let message = await db.message.findFirst({
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

      const contentSchema = z.object({
        content: z.string().min(1).max(4000),
      });

      const contentValidation = contentSchema.safeParse(req.body);

      if (!contentValidation.success) {
        return res.status(400).json({ error: contentValidation.error.errors[0].message });
      }

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

    res?.socket?.server?.io?.emit(updateKey, message);

    return res.status(200).json(message);
  } catch (error) {
    console.log("[MESSAGE_ID]", error);
    return res.status(500).json({ error: "Internal Error" });
  }
}