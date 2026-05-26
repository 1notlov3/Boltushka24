import { NotificationType } from "@prisma/client";
import { z } from "zod";

import { apiError, forbidden, notFound, rateLimitError, unauthorized, validationError } from "@/lib/api-response";
import { directMessageInclude } from "@/lib/chat-includes";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { assertNoActiveMemberTimeout } from "@/lib/moderation-enforcement";
import { canReactToMessage } from "@/lib/permissions";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { broadcast } from "@/lib/realtime";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  directMessageId: z.string().uuid("Invalid direct message ID"),
});

const BodySchema = z.object({
  emoji: z.string().trim().min(1).max(32),
});

export async function POST(req: Request, context: { params: Promise<{ directMessageId: string }> }) {
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
        member: {
          select: {
            profileId: true,
          },
        },
        conversation: {
          select: {
            memberOne: {
              select: {
                id: true,
                role: true,
                profileId: true,
                serverId: true,
                serverRoles: { include: { role: { select: { permissions: true } } } },
              },
            },
            memberTwo: {
              select: {
                id: true,
                role: true,
                profileId: true,
                serverId: true,
                serverRoles: { include: { role: { select: { permissions: true } } } },
              },
            },
          },
        },
      },
    });

    if (!directMessage) return notFound("Message not found");

    const member = directMessage.conversation.memberOne.profileId === profile.id
      ? directMessage.conversation.memberOne
      : directMessage.conversation.memberTwo;

    if (!canReactToMessage(member)) return forbidden();

    const timeoutError = await assertNoActiveMemberTimeout(member.serverId, member.id, "У вас таймаут на реакции");
    if (timeoutError) return timeoutError;

    const limit = await checkRateLimit({
      key: rateLimitKey("direct-message:reaction", profile.id, "global"),
      limit: 60,
      windowMs: 60_000,
    });

    if (!limit.ok) {
      return rateLimitError(limit.retryAfterSeconds, `Too many reactions. Retry in ${limit.retryAfterSeconds}s`);
    }

    const existing = await db.directMessageReaction.findUnique({
      where: {
        memberId_directMessageId_emoji: {
          memberId: member.id,
          directMessageId: directMessage.id,
          emoji: parsedBody.data.emoji,
        },
      },
    });

    if (existing) {
      await db.directMessageReaction.delete({ where: { id: existing.id } });
    } else {
      await db.directMessageReaction.create({
        data: {
          memberId: member.id,
          directMessageId: directMessage.id,
          emoji: parsedBody.data.emoji,
        },
      });

      if (directMessage.member.profileId !== profile.id) {
        await db.notification.create({
          data: {
            type: NotificationType.REACTION,
            actorId: profile.id,
            targetId: directMessage.member.profileId,
            conversationId: directMessage.conversationId,
            directMessageId: directMessage.id,
            metadata: { emoji: parsedBody.data.emoji },
          },
        });
      }
    }

    const updated = await db.directMessage.findUnique({
      where: { id: directMessage.id },
      include: directMessageInclude(member.id),
    });

    await broadcast(`chat:${directMessage.conversationId}:messages:update`, { id: directMessage.id, type: "reaction" });

    return Response.json(updated);
  } catch (error) {
    console.log("[DIRECT_MESSAGE_REACTION_POST]", error);
    return apiError("Internal Error", 500);
  }
}
