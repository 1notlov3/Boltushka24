import { z } from "zod";

import { apiError, forbidden, unauthorized, validationError } from "@/lib/api-response";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { canControlWatchSession } from "@/lib/permissions";
import { broadcast } from "@/lib/realtime";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  serverId: z.string().uuid("Invalid server ID"),
  channelId: z.string().uuid("Invalid channel ID"),
  itemIds: z.array(z.string().uuid()).min(1),
});

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedBody = BodySchema.safeParse(await req.json());
    if (!parsedBody.success) return validationError(parsedBody.error);

    const { serverId, channelId, itemIds } = parsedBody.data;
    const member = await db.member.findFirst({
      where: { serverId, profileId: profile.id },
      select: {
        id: true,
        role: true,
        serverRoles: {
          select: {
            role: {
              select: { permissions: true },
            },
          },
        },
      },
    });

    if (!member) return unauthorized();
    if (!canControlWatchSession(member)) return forbidden("Only hosts can reorder the watch queue");

    const session = await db.watchSession.findFirst({
      where: {
        channelId,
        channel: { serverId },
      },
      select: {
        id: true,
        queue: {
          select: {
            id: true,
            _count: { select: { votes: true } },
          },
        },
      },
    });

    if (!session) return apiError("Watch session not found", 404);

    const uniqueItemIds = new Set(itemIds);
    const sessionItemIds = new Set(session.queue.map((item) => item.id));
    if (uniqueItemIds.size !== itemIds.length || uniqueItemIds.size !== sessionItemIds.size) {
      return validationError(BodySchema.refine(() => false, "Queue reorder must include each item exactly once").safeParse(parsedBody.data).error!);
    }

    const hasOnlySessionItems = itemIds.every((id) => sessionItemIds.has(id));
    if (!hasOnlySessionItems) {
      return validationError(BodySchema.refine(() => false, "Queue reorder contains unknown items").safeParse(parsedBody.data).error!);
    }

    const orderedItems = itemIds
      .map((id) => session.queue.find((item) => item.id === id))
      .filter((item): item is NonNullable<typeof item> => !!item);
    const isMovingVotedItemDown = orderedItems.some((item, index) => {
      const previous = orderedItems[index - 1];
      return !!previous && item._count.votes > previous._count.votes;
    });

    if (isMovingVotedItemDown) {
      return validationError(BodySchema.refine(() => false, "Queue reorder cannot move higher-voted items below lower-voted items").safeParse(parsedBody.data).error!);
    }

    await db.$transaction(itemIds.map((id, position) => (
      db.watchQueueItem.update({
        where: { id, sessionId: session.id },
        data: { position },
      })
    )));

    await broadcast(`watch:${channelId}:state`, { action: "queue:reorder" });

    return Response.json({ ok: true });
  } catch (error) {
    console.log("[WATCH_QUEUE_REORDER_POST]", error);
    return apiError("Internal Error", 500);
  }
}
