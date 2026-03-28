import { cache } from "react";
import { Channel } from "@prisma/client";

import { db } from "@/lib/db";
import { currentProfile } from "@/lib/current-profile";
import { ServerWithMembersWithProfiles } from "@/types";

export const getServers = cache(async () => {
  const profile = await currentProfile();

  if (!profile) {
    return null;
  }

  const servers = await db.server.findMany({
    where: {
      members: {
        some: {
          profileId: profile.id
        }
      }
    },
    select: {
      id: true,
      name: true,
      imageUrl: true,
    }
  });

  return servers;
});

export const getServerDetails = cache(async (serverId: string) => {
  const profile = await currentProfile();

  if (!profile) {
    return null;
  }

  const server = await db.server.findUnique({
    where: {
      id: serverId,
    },
    // ⚡ Bolt Optimization: Use select instead of include to fetch only explicitly required
    // fields for Server. inviteCode and profileId are kept since they are used by components
    // like InviteModal and for permission checks, avoiding fetching unused scalars like createdAt, etc.
    select: {
      id: true,
      name: true,
      imageUrl: true,
      inviteCode: true,
      profileId: true,
      channels: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
      members: {
        select: {
          id: true,
          role: true,
          profileId: true,
          profile: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            }
          },
        },
        orderBy: {
          role: "asc",
        },
      },
    },
  });

  return server as unknown as ServerWithMembersWithProfiles & { channels: Channel[] };
});
