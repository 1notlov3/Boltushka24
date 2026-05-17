import { z } from "zod";

import { apiError, unauthorized, validationError } from "@/lib/api-response";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  serverId: z.string().uuid("Invalid Server ID"),
});

export type UnreadResponse = {
  channels: Record<string, number>;
  conversations: Record<string, number>;
  total: number;
};

export async function GET(_req: Request, context: { params: Promise<{ serverId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const member = await db.member.findFirst({
      where: {
        serverId: parsedParams.data.serverId,
        profileId: profile.id,
      },
      select: { id: true },
    });

    if (!member) return unauthorized();

    const [channels, conversations, channelReadStates, conversationReadStates] = await Promise.all([
      db.channel.findMany({
        where: { serverId: parsedParams.data.serverId },
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

    const [channelCounts, conversationCounts] = await Promise.all([
      Promise.all(channels.map(async (channel) => {
        const count = await db.message.count({
          where: {
            channelId: channel.id,
            memberId: { not: member.id },
            deleted: false,
            createdAt: { gt: channelReadMap.get(channel.id) ?? new Date(0) },
          },
        });

        return [channel.id, count] as const;
      })),
      Promise.all(conversations.map(async (conversation) => {
        const count = await db.directMessage.count({
          where: {
            conversationId: conversation.id,
            memberId: { not: member.id },
            deleted: false,
            createdAt: { gt: conversationReadMap.get(conversation.id) ?? new Date(0) },
          },
        });

        return [conversation.id, count] as const;
      })),
    ]);

    const channelsRecord = Object.fromEntries(channelCounts);
    const conversationsRecord = Object.fromEntries(conversationCounts);
    const total = [
      ...Object.values(channelsRecord),
      ...Object.values(conversationsRecord),
    ].reduce((sum, count) => sum + count, 0);

    return Response.json(
      {
        channels: channelsRecord,
        conversations: conversationsRecord,
        total,
      } satisfies UnreadResponse,
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    console.log("[SERVER_UNREAD_GET]", error);
    return apiError("Internal Error", 500);
  }
}
