"use server";

import { z } from "zod";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import type { ServerMemberWithProfile } from "@/types";

const PAGE_SIZE = 50;

const PageSchema = z.object({
  serverId: z.string().uuid(),
  cursor: z.string().uuid().optional(),
});

export type ServerMembersPage = {
  items: ServerMemberWithProfile[];
  nextCursor: string | null;
};

export async function getServerMembersPage(
  serverId: string,
  cursor?: string,
): Promise<ServerMembersPage> {
  const profile = await currentProfile();

  if (!profile) {
    return { items: [], nextCursor: null };
  }

  const parsed = PageSchema.safeParse({ serverId, cursor });
  if (!parsed.success) {
    return { items: [], nextCursor: null };
  }

  const isMember = await db.member.findFirst({
    where: {
      serverId: parsed.data.serverId,
      profileId: profile.id,
    },
    select: {
      id: true,
    },
  });

  if (!isMember) {
    return { items: [], nextCursor: null };
  }

  const members = await db.member.findMany({
    take: PAGE_SIZE,
    ...(parsed.data.cursor ? { skip: 1, cursor: { id: parsed.data.cursor } } : {}),
    where: {
      serverId: parsed.data.serverId,
      profileId: {
        not: profile.id,
      },
    },
    include: {
      serverRoles: {
        include: {
          role: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      },
      profile: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          status: true,
          customStatus: true,
          lastSeenAt: true,
        },
      },
    },
    orderBy: [
      { role: "asc" },
      { createdAt: "asc" },
      { id: "asc" },
    ],
  });

  return {
    items: members,
    nextCursor: members.length === PAGE_SIZE ? members[PAGE_SIZE - 1].id : null,
  };
}
