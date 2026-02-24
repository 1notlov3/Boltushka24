import { NextApiRequest } from "next";
import { z } from "zod";

import { NextApiResponseServerIo } from "@/types";
import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";

const messageSchema = z.object({
  content: z.string().min(1, "Content is required").max(4000, "Content too long"),
  fileUrl: z.string().url("Invalid file URL").regex(/^(http|https):\/\//i, "Invalid file URL protocol").optional().nullable(),
});

const querySchema = z.object({
  conversationId: z.string().uuid("Invalid Conversation ID"),
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
    const { conversationId } = req.query;

    if (!profile) {
      return res.status(401).json({ error: "Unauthorized" });
    }    

    const queryValidation = querySchema.safeParse({
      conversationId: conversationId as string,
    });

    if (!queryValidation.success) {
      return res.status(400).json({ error: queryValidation.error.errors[0].message });
    }

    const validation = messageSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const { content, fileUrl } = validation.data;

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
            profileId: true,
          }
        },
        memberTwo: {
          select: {
            id: true,
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

    const message = await db.directMessage.create({
      data: {
        content,
        fileUrl,
        conversationId: conversationId as string,
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

    const channelKey = `chat:${conversationId}:messages`;

    res?.socket?.server?.io?.emit(channelKey, message);

    return res.status(200).json(message);
  } catch (error) {
    console.log("[DIRECT_MESSAGES_POST]", error);
    return res.status(500).json({ message: "Internal Error" }); 
  }
}
