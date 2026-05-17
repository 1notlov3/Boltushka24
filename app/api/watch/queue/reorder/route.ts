import { z } from "zod";

import { apiError, unauthorized, validationError } from "@/lib/api-response";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
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
      select: { id: true },
    });

    if (!member) return unauthorized();

    const session = await db.watchSession.findFirst({
      where: {
        channelId,
        channel: { serverId },
      },
      select: { id: true },
    });

    if (!session) return apiError("Watch session not found", 404);

    await db.$transaction(itemIds.map((id, position) => (
      db.watchQueueItem.update({
        where: { id },
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
