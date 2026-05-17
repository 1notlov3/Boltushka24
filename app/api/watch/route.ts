import { z } from "zod";

import { apiError, rateLimitError, unauthorized, validationError } from "@/lib/api-response";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { broadcast } from "@/lib/realtime";

export const dynamic = "force-dynamic";

type WatchState = {
  channelId: string;
  videoId: string;
  time: number;
  isPlaying: boolean;
  updatedAt: number;
  updatedByProfileId: string;
  updatedByName: string;
};

type GlobalWithWatchState = typeof globalThis & {
  __watchStateStore?: Map<string, WatchState>;
};

const getStore = () => {
  const globalStore = globalThis as GlobalWithWatchState;

  if (!globalStore.__watchStateStore) {
    globalStore.__watchStateStore = new Map<string, WatchState>();
  }

  return globalStore.__watchStateStore;
};

const PostSchema = z.object({
  serverId: z.string().uuid("Invalid server ID"),
  channelId: z.string().uuid("Invalid channel ID"),
  videoId: z.string().min(3, "Invalid video ID"),
  action: z.enum(["load", "play", "pause", "seek", "sync"]),
  time: z.number().min(0).optional(),
});

const QuerySchema = z.object({
  serverId: z.string().uuid("Invalid server ID"),
  channelId: z.string().uuid("Invalid channel ID"),
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

    const member = await db.member.findFirst({
      where: {
        serverId: parsedQuery.data.serverId,
        profileId: profile.id,
      },
      select: { id: true },
    });

    if (!member) return unauthorized();

    return Response.json({ state: getStore().get(parsedQuery.data.channelId) ?? null });
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

    const [member, channel] = await Promise.all([
      db.member.findFirst({
        where: { serverId, profileId: profile.id },
        select: { id: true },
      }),
      db.channel.findFirst({
        where: { id: channelId, serverId },
        select: { id: true },
      }),
    ]);

    if (!member || !channel) return unauthorized();

    const limit = await checkRateLimit({
      key: rateLimitKey("watch:update", profile.id, channelId),
      limit: 30,
      windowMs: 60_000,
    });

    if (!limit.ok) {
      return rateLimitError(limit.retryAfterSeconds, `Too many watch updates. Retry in ${limit.retryAfterSeconds}s`);
    }

    const store = getStore();
    const prevState = store.get(channelId);

    const nextState: WatchState = {
      channelId,
      videoId,
      time: typeof time === "number" ? time : prevState?.time ?? 0,
      isPlaying:
        action === "play"
          ? true
          : action === "pause"
            ? false
            : prevState?.isPlaying ?? false,
      updatedAt: Date.now(),
      updatedByProfileId: profile.id,
      updatedByName: profile.name,
    };

    if (action === "load") {
      nextState.time = 0;
      nextState.isPlaying = false;
    }

    store.set(channelId, nextState);

    await broadcast(`watch:${channelId}:state`, {
      ...nextState,
      action,
    });

    return Response.json({ state: nextState });
  } catch (error) {
    console.log("[WATCH_POST]", error);
    return apiError("Internal Error", 500);
  }
}
