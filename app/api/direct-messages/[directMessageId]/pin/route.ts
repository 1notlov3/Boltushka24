import { NotificationType } from "@prisma/client";
import { z } from "zod";

import { apiError, forbidden, notFound, rateLimitError, unauthorized, validationError } from "@/lib/api-response";
import { directMessageInclude } from "@/lib/chat-includes";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { canPinMessage } from "@/lib/permissions";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { broadcast } from "@/lib/realtime";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  directMessageId: z.string().uuid("Invalid direct message ID"),
});

const BodySchema = z.object({
  pinned: z.boolean(),
});

export async function PATCH(req: Request, context: { params: Promise<{ directMessageId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const params = await context.params;
    const parsedParams = ParamsSchema.safeParse(params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const parsedBody = BodySchema.safeParse(await req.json());
    if (!parsedBody.success) return validationError(parsedBody.error);

    const directMessage = await db.directMessage.findFirst({
      where: {
        id: parsedParams.data.directMessageId,
        deleted: false,
        conversation: {
          OR: [
            { memberOne: { profileId: profile.id } },
            { memberTwo: { profileId: profile.id } },
          ],
        },
      },
      select: {
        id: true,
        memberId: true,
        conversationId: true,
        member: { select: { profileId: true } },
        conversation: {
          select: {
            memberOne: { select: { id: true, role: true, profileId: true } },
            memberTwo: { select: { id: true, role: true, profileId: true } },
          },
        },
      },
    });

    if (!directMessage) return notFound("Message not found");

    const member = directMessage.conversation.memberOne.profileId === profile.id
      ? directMessage.conversation.memberOne
      : directMessage.conversation.memberTwo;

    if (!canPinMessage(member, directMessage.memberId)) return forbidden();

    const limit = await checkRateLimit({
      key: rateLimitKey("direct-message:pin", profile.id, "global"),
      limit: 30,
      windowMs: 60_000,
    });

    if (!limit.ok) {
      return rateLimitError(limit.retryAfterSeconds, `Too many pin requests. Retry in ${limit.retryAfterSeconds}s`);
    }

    const updated = await db.directMessage.update({
      where: { id: directMessage.id },
      data: parsedBody.data.pinned
        ? { pinned: true, pinnedAt: new Date(), pinnedById: member.id }
        : { pinned: false, pinnedAt: null, pinnedById: null },
      include: directMessageInclude(member.id),
    });

    if (parsedBody.data.pinned && directMessage.member.profileId !== profile.id) {
      await db.notification.create({
        data: {
          type: NotificationType.PIN,
          actorId: profile.id,
          targetId: directMessage.member.profileId,
          conversationId: directMessage.conversationId,
          directMessageId: directMessage.id,
        },
      });
    }

    await broadcast(`chat:${directMessage.conversationId}:messages:update`, { id: directMessage.id, type: "pin" });

    return Response.json(updated);
  } catch (error) {
    console.log("[DIRECT_MESSAGE_PIN_PATCH]", error);
    return apiError("Internal Error", 500);
  }
}
