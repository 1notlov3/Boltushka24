import { NextApiRequest } from "next";
import { MemberRole } from "@prisma/client";
import { z } from "zod";

import { NextApiResponseServerIo } from "@/types";
import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";

const messageSchema = z.object({
  content: z.string().min(1, "Content is required").max(4000, "Content too long"),
});

const querySchema = z.object({
  directMessageId: z.string().uuid("Invalid Direct Message ID"),
  conversationId: z.string().uuid("Invalid Conversation ID"),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIo,
) {
  if (req.method !== "DELETE" && req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const profile = await currentProfilePages(req);
    const { directMessageId, conversationId } = req.query;

    if (!profile) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const queryValidation = querySchema.safeParse({
      directMessageId: directMessageId as string,
      conversationId: conversationId as string,
    });

    if (!queryValidation.success) {
      return res.status(400).json({ error: queryValidation.error.errors[0].message });
    }

    let [conversation, directMessage] = await Promise.all([
      db.conversation.findFirst({
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
            include: {
              profile: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                }
              }
            }
          },
          memberTwo: {
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
      }),
      db.directMessage.findFirst({
        where: {
          id: directMessageId as string,
          conversationId: conversationId as string,
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

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const member = conversation.memberOne.profileId === profile.id ? conversation.memberOne : conversation.memberTwo;

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    if (!directMessage || directMessage.deleted) {
      return res.status(404).json({ error: "Message not found" });
    }

    const isMessageOwner = directMessage.memberId === member.id;
    const isAdmin = member.role === MemberRole.ADMIN;
    const isModerator = member.role === MemberRole.MODERATOR;
    const canModify = isMessageOwner || isAdmin || isModerator;

    if (!canModify) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (req.method === "DELETE") {
      directMessage = await db.directMessage.update({
        where: {
          id: directMessageId as string,
        },
        data: {
          fileUrl: null,
          content: "This message has been deleted.",
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

      directMessage = await db.directMessage.update({
        where: {
          id: directMessageId as string,
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

    const updateKey = `chat:${conversation.id}:messages:update`;

    res?.socket?.server?.io?.emit(updateKey, directMessage);

    return res.status(200).json(directMessage);
  } catch (error) {
    console.log("[MESSAGE_ID]", error);
    return res.status(500).json({ error: "Internal Error" });
  }
}
