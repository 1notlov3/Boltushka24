import { z } from "zod";

import { apiError, unauthorized, validationError } from "@/lib/api-response";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  channelId: z.string().uuid("Invalid Channel ID"),
});

export async function POST(_req: Request, context: { params: Promise<{ channelId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const channel = await db.channel.findFirst({
      where: {
        id: parsedParams.data.channelId,
        server: {
          members: {
            some: { profileId: profile.id },
          },
        },
      },
      select: {
        id: true,
        serverId: true,
      },
    });

    if (!channel) return unauthorized();

    const member = await db.member.findFirst({
      where: {
        serverId: channel.serverId,
        profileId: profile.id,
      },
      select: { id: true },
    });

    if (!member) return unauthorized();

    const readState = await db.channelReadState.upsert({
      where: {
        memberId_channelId: {
          memberId: member.id,
          channelId: channel.id,
        },
      },
      create: {
        memberId: member.id,
        channelId: channel.id,
        lastReadAt: new Date(),
      },
      update: {
        lastReadAt: new Date(),
      },
    });

    return Response.json(readState);
  } catch (error) {
    console.log("[CHANNEL_READ_POST]", error);
    return apiError("Internal Error", 500);
  }
}
