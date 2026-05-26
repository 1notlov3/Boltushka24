import { z } from "zod";

import { apiError, rateLimitError, unauthorized, validationError } from "@/lib/api-response";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { broadcast } from "@/lib/realtime";
import { normalizeWatchQueueItem } from "@/lib/watch-queue";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  serverId: z.string().uuid("Invalid server ID"),
  channelId: z.string().uuid("Invalid channel ID"),
  videoId: z.string().min(3, "Invalid video ID"),
  title: z.string().trim().max(200).optional().nullable(),
});

const ensureAccess = async (serverId: string, channelId: string, profileId: string) => {
  const [member, channel] = await Promise.all([
    db.member.findFirst({
      where: { serverId, profileId },
      select: { id: true },
    }),
    db.channel.findFirst({
      where: { id: channelId, serverId },
      select: { id: true },
    }),
  ]);

  if (!member || !channel) return null;
  return member;
};

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedBody = BodySchema.safeParse(await req.json());
    if (!parsedBody.success) return validationError(parsedBody.error);

    const { serverId, channelId, videoId, title } = parsedBody.data;
    const member = await ensureAccess(serverId, channelId, profile.id);
    if (!member) return unauthorized();

    const limit = await checkRateLimit({
      key: rateLimitKey("watch:queue-add", profile.id, channelId),
      limit: 10,
      windowMs: 60_000,
    });

    if (!limit.ok) {
      return rateLimitError(limit.retryAfterSeconds, `Too many queue additions. Retry in ${limit.retryAfterSeconds}s`);
    }

    const session = await db.watchSession.upsert({
      where: { channelId },
      create: {
        channelId,
        updatedById: profile.id,
        updatedByName: profile.name,
      },
      update: {},
      include: {
        queue: {
          include: {
            _count: { select: { votes: true } },
            votes: { where: { memberId: member.id }, select: { id: true } },
          },
        },
      },
    });

    const maxPosition = session.queue.reduce((max, item) => Math.max(max, item.position), -1);
    const item = await db.watchQueueItem.create({
      data: {
        sessionId: session.id,
        videoId,
        title: title || null,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        addedById: profile.id,
        addedByName: profile.name,
        position: maxPosition + 1,
      },
      include: {
        _count: { select: { votes: true } },
        votes: { where: { memberId: member.id }, select: { id: true } },
      },
    });

    const queueItem = normalizeWatchQueueItem(item);
    await broadcast(`watch:${channelId}:state`, { action: "queue", item: queueItem });

    return Response.json(queueItem);
  } catch (error) {
    console.log("[WATCH_QUEUE_POST]", error);
    return apiError("Internal Error", 500);
  }
}
