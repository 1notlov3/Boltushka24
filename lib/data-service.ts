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
    include: {
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
        include: {
          profile: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              // Bolt Optimization: Remove email to reduce payload size and prevent PII leak
              // email: true,
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
