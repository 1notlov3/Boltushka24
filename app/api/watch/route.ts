import { z } from "zod";

import { apiError, forbidden, rateLimitError, unauthorized, validationError } from "@/lib/api-response";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { canControlWatchSession } from "@/lib/permissions";
import { broadcast } from "@/lib/realtime";
import { normalizeWatchQueueItem, sortWatchQueueItems } from "@/lib/watch-queue";

export const dynamic = "force-dynamic";

const PostSchema = z.object({
  serverId: z.string().uuid("Invalid server ID"),
  channelId: z.string().uuid("Invalid channel ID"),
  videoId: z.string().min(3, "Invalid video ID").optional(),
  action: z.enum(["load", "play", "pause", "seek", "sync", "ended"]),
  time: z.number().min(0).optional(),
});

const QuerySchema = z.object({
  serverId: z.string().uuid("Invalid server ID"),
  channelId: z.string().uuid("Invalid channel ID"),
});

const ensureAccess = async (serverId: string, channelId: string, profileId: string) => {
  const [member, channel] = await Promise.all([
    db.member.findFirst({
      where: { serverId, profileId },
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
    }),
    db.channel.findFirst({
      where: { id: channelId, serverId },
      select: { id: true },
    }),
  ]);

  if (!member || !channel) return null;
  return member;
};

const queueInclude = (memberId: string) => ({
  _count: {
    select: { votes: true },
  },
  votes: {
    where: { memberId },
    select: { id: true },
  },
});

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const { searchParams } = new URL(req.url);
    const parsedQuery = QuerySchema.safeParse({
      serverId: searchParams.get("serverId"),
      channelId: searchParams.get("channelId"),
    });
    if (!parsedQuery.success) return validationError(parsedQuery.error);

    const { serverId, channelId } = parsedQuery.data;
    const member = await ensureAccess(serverId, channelId, profile.id);
    if (!member) return unauthorized();

    const session = await db.watchSession.findUnique({
      where: { channelId },
      include: {
        queue: {
          orderBy: { position: "asc" },
          include: queueInclude(member.id),
        },
      },
    });

    if (!session) return Response.json({ session });

    return Response.json({
      session: {
        ...session,
        queue: sortWatchQueueItems(session.queue.map(normalizeWatchQueueItem)),
      },
    });
  } catch (error) {
    console.log("[WATCH_GET]", error);
    return apiError("Internal Error", 500);
  }
}

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedBody = PostSchema.safeParse(await req.json());
    if (!parsedBody.success) return validationError(parsedBody.error);

    const { serverId, channelId, videoId, action, time } = parsedBody.data;
    const member = await ensureAccess(serverId, channelId, profile.id);
    if (!member) return unauthorized();
    if (!canControlWatchSession(member)) return forbidden("Only hosts can control watch playback");

    const limit = await checkRateLimit({
      key: rateLimitKey("watch:update", profile.id, channelId),
      limit: 30,
      windowMs: 60_000,
    });

    if (!limit.ok) {
      return rateLimitError(limit.retryAfterSeconds, `Too many watch updates. Retry in ${limit.retryAfterSeconds}s`);
    }

    const existingSession = await db.watchSession.upsert({
      where: { channelId },
      create: {
        channelId,
        currentVideoId: videoId ?? null,
        currentTime: time ?? 0,
        isPlaying: action === "play",
        updatedById: profile.id,
        updatedByName: profile.name,
      },
      update: {},
      include: {
        queue: {
          orderBy: { position: "asc" },
          include: queueInclude(member.id),
        },
      },
    });

    let nextVideoId = videoId ?? existingSession.currentVideoId;
    let nextTime = typeof time === "number" ? time : existingSession.currentTime;
    let nextIsPlaying = existingSession.isPlaying;

    if (action === "play") nextIsPlaying = true;
    if (action === "pause") nextIsPlaying = false;
    if (action === "load") {
      nextTime = 0;
      nextIsPlaying = false;

      if (videoId) {
        const existingItem = existingSession.queue.find((item) => item.videoId === videoId);
        if (!existingItem) {
          await db.watchQueueItem.create({
            data: {
              sessionId: existingSession.id,
              videoId,
              title: null,
              thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
              addedById: profile.id,
              addedByName: profile.name,
              position: 0,
            },
          });
          await db.watchQueueItem.updateMany({
            where: {
              sessionId: existingSession.id,
              videoId: { not: videoId },
            },
            data: {
              position: { increment: 1 },
            },
          });
        } else {
          await db.watchQueueItem.update({
            where: { id: existingItem.id },
            data: { position: 0 },
          });
          await db.watchQueueItem.updateMany({
            where: {
              sessionId: existingSession.id,
              id: { not: existingItem.id },
              position: { lt: existingItem.position },
            },
            data: {
              position: { increment: 1 },
            },
          });
        }
      }
    }

    if (action === "ended") {
      const [nextItem] = sortWatchQueueItems(
        existingSession.queue
          .map(normalizeWatchQueueItem)
          .filter((item) => item.videoId !== existingSession.currentVideoId),
      );

      if (nextItem) {
        nextVideoId = nextItem.videoId;
        nextTime = 0;
        nextIsPlaying = true;
      } else {
        nextIsPlaying = false;
      }
    }

    const session = await db.watchSession.update({
      where: { id: existingSession.id },
      data: {
        currentVideoId: nextVideoId,
        currentTime: nextTime,
        isPlaying: nextIsPlaying,
        updatedById: profile.id,
        updatedByName: profile.name,
      },
      include: {
        queue: {
          orderBy: { position: "asc" },
          include: queueInclude(member.id),
        },
      },
    });

    const queue = sortWatchQueueItems(session.queue.map(normalizeWatchQueueItem));
    await broadcast(`watch:${channelId}:state`, {
      action,
      videoId: session.currentVideoId,
      time: session.currentTime,
      isPlaying: session.isPlaying,
      updatedByName: session.updatedByName,
      queue,
    });

    return Response.json({
      session: {
        ...session,
        queue,
      },
    });
  } catch (error) {
    console.log("[WATCH_POST]", error);
    return apiError("Internal Error", 500);
  }
}
