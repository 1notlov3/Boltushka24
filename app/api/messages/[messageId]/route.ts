import { z } from "zod";

import { apiError, notFound, unauthorized, validationError } from "@/lib/api-response";
import { channelMessageInclude } from "@/lib/chat-includes";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  messageId: z.string().uuid("Invalid message ID"),
});

export async function GET(_req: Request, context: { params: Promise<{ messageId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const access = await db.message.findFirst({
      where: {
        id: parsedParams.data.messageId,
        channel: {
          server: {
            members: {
              some: { profileId: profile.id },
            },
          },
        },
      },
      select: {
        id: true,
        channel: {
          select: {
            serverId: true,
          },
        },
      },
    });

    if (!access) return notFound("Message not found");

    const member = await db.member.findFirst({
      where: {
        serverId: access.channel.serverId,
        profileId: profile.id,
      },
      select: {
        id: true,
      },
    });

    if (!member) return unauthorized();

    const message = await db.message.findUnique({
      where: {
        id: access.id,
      },
      include: channelMessageInclude(member.id),
    });

    if (!message) return notFound("Message not found");

    return Response.json(message, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.log("[MESSAGE_GET]", error);
    return apiError("Internal Error", 500);
  }
}
