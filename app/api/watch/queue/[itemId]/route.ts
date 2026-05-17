import { z } from "zod";

import { apiError, unauthorized, validationError } from "@/lib/api-response";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { broadcast } from "@/lib/realtime";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  itemId: z.string().uuid("Invalid queue item ID"),
});

const QuerySchema = z.object({
  serverId: z.string().uuid("Invalid server ID"),
  channelId: z.string().uuid("Invalid channel ID"),
});

export async function DELETE(req: Request, context: { params: Promise<{ itemId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const { searchParams } = new URL(req.url);
    const parsedQuery = QuerySchema.safeParse({
      serverId: searchParams.get("serverId"),
      channelId: searchParams.get("channelId"),
    });
    if (!parsedQuery.success) return validationError(parsedQuery.error);

    const member = await db.member.findFirst({
      where: { serverId: parsedQuery.data.serverId, profileId: profile.id },
      select: { id: true },
    });

    if (!member) return unauthorized();

    const item = await db.watchQueueItem.findFirst({
      where: {
        id: parsedParams.data.itemId,
        session: {
          channelId: parsedQuery.data.channelId,
          channel: { serverId: parsedQuery.data.serverId },
        },
      },
      select: {
        id: true,
        sessionId: true,
        position: true,
      },
    });

    if (!item) return apiError("Queue item not found", 404);

    await db.watchQueueItem.delete({ where: { id: item.id } });
    await db.watchQueueItem.updateMany({
      where: {
        sessionId: item.sessionId,
        position: { gt: item.position },
      },
      data: {
        position: { decrement: 1 },
      },
    });

    await broadcast(`watch:${parsedQuery.data.channelId}:state`, { action: "queue:delete", itemId: item.id });

    return Response.json({ ok: true });
  } catch (error) {
    console.log("[WATCH_QUEUE_DELETE]", error);
    return apiError("Internal Error", 500);
  }
}
