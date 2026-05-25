import { apiError, unauthorized } from "@/lib/api-response";
import { channelMessageInclude, directMessageInclude } from "@/lib/chat-includes";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const members = await db.member.findMany({
      where: { profileId: profile.id },
      select: { id: true },
    });
    const memberIds = members.map((member) => member.id);

    if (memberIds.length === 0) {
      return Response.json({ messages: [], directMessages: [] });
    }

    const [messages, directMessages] = await Promise.all([
      db.savedMessage.findMany({
        take: 50,
        where: { memberId: { in: memberIds }, message: { deleted: false } },
        include: {
          message: {
            include: {
              ...channelMessageInclude(memberIds[0] ?? ""),
              channel: {
                select: {
                  id: true,
                  name: true,
                  serverId: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.savedDirectMessage.findMany({
        take: 50,
        where: { memberId: { in: memberIds }, directMessage: { deleted: false } },
        include: {
          member: {
            select: {
              id: true,
              serverId: true,
            },
          },
          directMessage: {
            include: {
              ...directMessageInclude(memberIds[0] ?? ""),
              conversation: {
                select: {
                  id: true,
                  memberOneId: true,
                  memberTwoId: true,
                  memberOne: {
                    select: {
                      id: true,
                      profile: { select: { name: true, imageUrl: true } },
                    },
                  },
                  memberTwo: {
                    select: {
                      id: true,
                      profile: { select: { name: true, imageUrl: true } },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return Response.json({ messages, directMessages });
  } catch (error) {
    console.log("[SAVED_MESSAGES_GET]", error);
    return apiError("Internal Error", 500);
  }
}
