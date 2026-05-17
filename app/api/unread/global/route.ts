import { apiError, unauthorized } from "@/lib/api-response";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export type GlobalUnreadResponse = {
  total: number;
};

export async function GET() {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const members = await db.member.findMany({
      where: { profileId: profile.id },
      select: { id: true, serverId: true },
    });

    const totals = await Promise.all(members.map(async (member) => {
      const [channels, conversations, channelReadStates, conversationReadStates] = await Promise.all([
        db.channel.findMany({
          where: { serverId: member.serverId },
          select: { id: true },
        }),
        db.conversation.findMany({
          where: {
            OR: [
              { memberOneId: member.id },
              { memberTwoId: member.id },
            ],
          },
          select: { id: true },
        }),
        db.channelReadState.findMany({
          where: { memberId: member.id },
          select: { channelId: true, lastReadAt: true },
        }),
        db.conversationReadState.findMany({
          where: { memberId: member.id },
          select: { conversationId: true, lastReadAt: true },
        }),
      ]);

      const channelReadMap = new Map(channelReadStates.map((state) => [state.channelId, state.lastReadAt]));
      const conversationReadMap = new Map(conversationReadStates.map((state) => [state.conversationId, state.lastReadAt]));

      const counts = await Promise.all([
        ...channels.map((channel) => db.message.count({
          where: {
            channelId: channel.id,
            memberId: { not: member.id },
            deleted: false,
            createdAt: { gt: channelReadMap.get(channel.id) ?? new Date(0) },
          },
        })),
        ...conversations.map((conversation) => db.directMessage.count({
          where: {
            conversationId: conversation.id,
            memberId: { not: member.id },
            deleted: false,
            createdAt: { gt: conversationReadMap.get(conversation.id) ?? new Date(0) },
          },
        })),
      ]);

      return counts.reduce((sum, count) => sum + count, 0);
    }));

    return Response.json(
      { total: totals.reduce((sum, count) => sum + count, 0) } satisfies GlobalUnreadResponse,
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    console.log("[GLOBAL_UNREAD_GET]", error);
    return apiError("Internal Error", 500);
  }
}
