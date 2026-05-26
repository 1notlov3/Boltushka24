import { z } from "zod";

import { apiError, rateLimitError, unauthorized, validationError } from "@/lib/api-response";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { broadcast } from "@/lib/realtime";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  serverId: z.string().uuid("Invalid server ID"),
  channelId: z.string().uuid("Invalid channel ID"),
  voted: z.boolean().optional(),
});

export async function POST(req: Request, context: { params: Promise<{ itemId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const { itemId } = await context.params;
    const parsedBody = BodySchema.safeParse(await req.json());
    if (!parsedBody.success) return validationError(parsedBody.error);

    const { serverId, channelId, voted } = parsedBody.data;
    const member = await db.member.findFirst({
      where: { serverId, profileId: profile.id },
      select: { id: true },
    });

    if (!member) return unauthorized();

    const limit = await checkRateLimit({
      key: rateLimitKey("watch:queue-vote", profile.id, channelId),
      limit: 60,
      windowMs: 60_000,
    });

    if (!limit.ok) {
      return rateLimitError(limit.retryAfterSeconds, `Too many watch votes. Retry in ${limit.retryAfterSeconds}s`);
    }

    const item = await db.watchQueueItem.findFirst({
      where: {
        id: itemId,
        session: {
          channelId,
          channel: { serverId },
        },
      },
      select: { id: true },
    });

    if (!item) return apiError("Queue item not found", 404);

    const existingVote = await db.watchQueueVote.findUnique({
      where: {
        itemId_memberId: {
          itemId: item.id,
          memberId: member.id,
        },
      },
      select: { id: true },
    });

    const shouldVote = voted ?? !existingVote;

    if (shouldVote && !existingVote) {
      await db.watchQueueVote.create({
        data: {
          itemId: item.id,
          memberId: member.id,
        },
      });
    }

    if (!shouldVote && existingVote) {
      await db.watchQueueVote.delete({ where: { id: existingVote.id } });
    }

    const voteCount = await db.watchQueueVote.count({ where: { itemId: item.id } });
    await broadcast(`watch:${channelId}:state`, {
      action: "queue:vote",
      itemId: item.id,
      voteCount,
      votedByMe: shouldVote,
    });

    return Response.json({ itemId: item.id, voteCount, votedByMe: shouldVote });
  } catch (error) {
    console.log("[WATCH_QUEUE_VOTE_POST]", error);
    return apiError("Internal Error", 500);
  }
}
