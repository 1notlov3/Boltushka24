import { ChannelType } from "@prisma/client";
import { z } from "zod";

import { apiError, unauthorized, validationError } from "@/lib/api-response";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  serverId: z.string().uuid("Invalid Server ID"),
});

const QuerySchema = z.object({
  q: z.string().trim().max(80).optional().default(""),
});

export async function GET(req: Request, context: { params: Promise<{ serverId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const { searchParams } = new URL(req.url);
    const parsedQuery = QuerySchema.safeParse({
      q: searchParams.get("q") ?? undefined,
    });
    if (!parsedQuery.success) return validationError(parsedQuery.error);

    const serverId = parsedParams.data.serverId;
    const query = parsedQuery.data.q;

    const currentMember = await db.member.findFirst({
      where: {
        serverId,
        profileId: profile.id,
      },
      select: {
        id: true,
      },
    });

    if (!currentMember) return unauthorized();

    const [channels, members] = await Promise.all([
      db.channel.findMany({
        where: {
          serverId,
          ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
        },
        select: {
          id: true,
          name: true,
          type: true,
        },
        orderBy: [
          { position: "asc" },
          { createdAt: "asc" },
        ],
        take: 30,
      }),
      db.member.findMany({
        where: {
          serverId,
          id: { not: currentMember.id },
          ...(query ? { profile: { name: { contains: query, mode: "insensitive" } } } : {}),
        },
        select: {
          id: true,
          role: true,
          profile: {
            select: {
              name: true,
              imageUrl: true,
            },
          },
        },
        orderBy: [
          { role: "asc" },
          { createdAt: "asc" },
        ],
        take: 30,
      }),
    ]);

    return Response.json({
      channels: channels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        canReceiveForward: channel.type === ChannelType.TEXT,
        url: `/servers/${serverId}/channels/${channel.id}`,
      })),
      members: members.map((member) => ({
        id: member.id,
        name: member.profile.name,
        imageUrl: member.profile.imageUrl,
        role: member.role,
        url: `/servers/${serverId}/conversations/${member.id}`,
      })),
    });
  } catch (error) {
    console.log("[SERVER_DESTINATIONS_GET]", error);
    return apiError("Internal Error", 500);
  }
}
