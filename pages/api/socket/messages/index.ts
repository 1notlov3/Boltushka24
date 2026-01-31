import { NextApiRequest } from "next";
import { z } from "zod";

import { NextApiResponseServerIo } from "@/types";
import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";

const messageSchema = z.object({
  content: z.string().min(1, "Content is required").max(4000, "Content too long"),
  fileUrl: z.string().url("Invalid file URL").optional().nullable(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIo,
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

    if (!serverId) {
      return res.status(400).json({ error: "Server ID missing" });
    }

    if (!channelId) {
      return res.status(400).json({ error: "Channel ID missing" });
    }

    // 🛡️ Sentinel: Validate UUIDs to prevent errors and ensure data integrity
    const querySchema = z.object({
      serverId: z.string().uuid("Invalid Server ID"),
      channelId: z.string().uuid("Invalid Channel ID"),
    });

    const queryValidation = querySchema.safeParse(req.query);

    if (!queryValidation.success) {
      return res.status(400).json({ error: queryValidation.error.errors[0].message });
    }

    const validation = messageSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const { content, fileUrl } = validation.data;

    const server = await db.server.findFirst({
      where: {
        id: serverId as string,
        members: {
          some: {
            profileId: profile.id
          }
        }
      }
    });

    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }

    const channel = await db.channel.findFirst({
      where: {
        id: channelId as string,
        serverId: serverId as string,
      }
    });

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    const member = await db.member.findFirst({
      where: {
        serverId: serverId as string,
        profileId: profile.id,
      }
    });

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    const message = await db.message.create({
      data: {
        content,
        fileUrl,
        channelId: channelId as string,
        memberId: member.id,
      },
      include: {
        member: {
          include: {
            // 🛡️ Sentinel: Prevent PII (email) leakage by selecting only necessary fields
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
    });

    const channelKey = `chat:${channelId}:messages`;

    res?.socket?.server?.io?.emit(channelKey, message);

    return res.status(200).json(message);
  } catch (error) {
    console.log("[MESSAGES_POST]", error);
    return res.status(500).json({ message: "Internal Error" }); 
  }
}