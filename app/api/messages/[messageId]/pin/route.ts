import { NotificationType } from "@prisma/client";
import { z } from "zod";

import { apiError, forbidden, notFound, rateLimitError, unauthorized, validationError } from "@/lib/api-response";
import { channelMessageInclude } from "@/lib/chat-includes";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { canPinMessage } from "@/lib/permissions";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { broadcast } from "@/lib/realtime";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  messageId: z.string().uuid("Invalid message ID"),
});

const BodySchema = z.object({
  pinned: z.boolean(),
});

export async function PATCH(req: Request, context: { params: Promise<{ messageId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const params = await context.params;
    const parsedParams = ParamsSchema.safeParse(params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const parsedBody = BodySchema.safeParse(await req.json());
    if (!parsedBody.success) return validationError(parsedBody.error);

    const message = await db.message.findFirst({
      where: {
        id: parsedParams.data.messageId,
        deleted: false,
        channel: { server: { members: { some: { profileId: profile.id } } } },
      },
      select: {
        id: true,
        memberId: true,
        channelId: true,
        member: { select: { profileId: true } },
        channel: { select: { serverId: true } },
      },
    });

    if (!message) return notFound("Message not found");

    const member = await db.member.findFirst({
      where: { profileId: profile.id, serverId: message.channel.serverId },
      select: { id: true, role: true },
    });

    if (!member) return unauthorized();
    if (!canPinMessage(member, message.memberId)) return forbidden();

    const limit = await checkRateLimit({
      key: rateLimitKey("message:pin", profile.id, "global"),
      limit: 30,
      windowMs: 60_000,
    });

    if (!limit.ok) {
      return rateLimitError(limit.retryAfterSeconds, `Too many pin requests. Retry in ${limit.retryAfterSeconds}s`);
    }

    const updated = await db.message.update({
      where: { id: message.id },
      data: parsedBody.data.pinned
        ? { pinned: true, pinnedAt: new Date(), pinnedById: member.id }
        : { pinned: false, pinnedAt: null, pinnedById: null },
      include: channelMessageInclude(member.id),
    });

    if (parsedBody.data.pinned && message.member.profileId !== profile.id) {
      await db.notification.create({
        data: {
          type: NotificationType.PIN,
          actorId: profile.id,
          targetId: message.member.profileId,
          serverId: message.channel.serverId,
          channelId: message.channelId,
          messageId: message.id,
        },
      });
    }

    await broadcast(`chat:${message.channelId}:messages:update`, { id: message.id, type: "pin" });

    return Response.json(updated);
  } catch (error) {
    console.log("[MESSAGE_PIN_PATCH]", error);
    return apiError("Internal Error", 500);
  }
}
