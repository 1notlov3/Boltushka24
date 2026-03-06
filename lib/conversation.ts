import { db } from "@/lib/db";

export const getOrCreateConversation = async (memberOneId: string, memberTwoId: string) => {
  let conversation = await findConversation(memberOneId, memberTwoId);

  if (!conversation) {
    conversation = await createNewConversation(memberOneId, memberTwoId);
  }

  return conversation;
}

const findConversation = async (memberOneId: string, memberTwoId: string) => {
  try {
    return await db.conversation.findFirst({
      where: {
        OR: [
          {
            AND: [
              { memberOneId: memberOneId },
              { memberTwoId: memberTwoId },
            ]
          },
          {
            AND: [
              { memberOneId: memberTwoId },
              { memberTwoId: memberOneId },
            ]
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
    });
  } catch {
    return null;
  }
}

const createNewConversation = async (memberOneId: string, memberTwoId: string) => {
  try {
    return await db.conversation.create({
      data: {
        memberOneId,
        memberTwoId,
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
    })
  } catch {
    return null;
  }
}
