import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
import { broadcast } from "@/lib/realtime";

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
  const g = globalThis as GlobalWithWatchState;

  if (!g.__watchStateStore) {
    g.__watchStateStore = new Map<string, WatchState>();
  }

  return g.__watchStateStore;
};

const postSchema = z.object({
  serverId: z.string().uuid("Invalid server ID"),
  channelId: z.string().uuid("Invalid channel ID"),
  videoId: z.string().min(3, "Invalid video ID"),
  action: z.enum(["load", "play", "pause", "seek", "sync"]),
  time: z.number().min(0).optional(),
});

const getSchema = z.object({
  serverId: z.string().uuid("Invalid server ID"),
  channelId: z.string().uuid("Invalid channel ID"),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const profile = await currentProfilePages(req);

    if (!profile) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (req.method === "GET") {
      const parsed = getSchema.safeParse({
        serverId: req.query.serverId,
        channelId: req.query.channelId,
      });

      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid query" });
      }

      const { serverId, channelId } = parsed.data;

      const member = await db.member.findFirst({
        where: {
          serverId,
          profileId: profile.id,
        },
        select: { id: true },
      });

      if (!member) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const state = getStore().get(channelId) ?? null;
      return res.status(200).json({ state });
    }

    if (req.method === "POST") {
      const parsed = postSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid payload" });
      }

      const { serverId, channelId, videoId, action, time } = parsed.data;

      const [member, channel] = await Promise.all([
        db.member.findFirst({
          where: {
            serverId,
            profileId: profile.id,
          },
          select: { id: true },
        }),
        db.channel.findFirst({
          where: {
            id: channelId,
            serverId,
          },
          select: { id: true },
        }),
      ]);

      if (!member || !channel) {
        return res.status(401).json({ error: "Unauthorized" });
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

      const eventKey = `watch:${channelId}:state`;
      await broadcast(eventKey, {
        ...nextState,
        action,
      });

      return res.status(200).json({ state: nextState });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.log("[WATCH_SOCKET]", error);
    return res.status(500).json({ error: "Internal Error" });
  }
}
