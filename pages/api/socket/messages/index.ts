import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
import { broadcast } from "@/lib/realtime";

const messageSchema = z.object({
  content: z.string().min(1, "Content is required").max(4000, "Content too long"),
  fileUrl: z.string().url("Invalid file URL").regex(/^(http|https):\/\//i, "Invalid file URL protocol").optional().nullable(),
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

    const { content, fileUrl } = validation.data;

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
        select: { id: true }
      })
    ]);

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

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

    await broadcast(channelKey, message);

    return res.status(200).json(message);
  } catch (error) {
    console.log("[MESSAGES_POST]", error);
    return res.status(500).json({ message: "Internal Error" }); 
  }
}
