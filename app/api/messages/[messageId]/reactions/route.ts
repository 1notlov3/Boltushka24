import { NotificationType } from "@prisma/client";
import { z } from "zod";

import { apiError, forbidden, notFound, rateLimitError, unauthorized, validationError } from "@/lib/api-response";
import { channelMessageInclude } from "@/lib/chat-includes";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { canReactToMessage } from "@/lib/permissions";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { broadcast } from "@/lib/realtime";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  messageId: z.string().uuid("Invalid message ID"),
});

const BodySchema = z.object({
  emoji: z.string().trim().min(1).max(32),
});

export async function POST(req: Request, context: { params: Promise<{ messageId: string }> }) {
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
        memberId: true,
        channelId: true,
        member: {
          select: {
            profileId: true,
          },
        },
        channel: {
          select: {
            serverId: true,
          },
        },
      },
    });

    if (!message) return notFound("Message not found");

    const member = await db.member.findFirst({
      where: {
        profileId: profile.id,
        serverId: message.channel.serverId,
      },
      include: {
        serverRoles: {
          include: {
            role: {
              select: { permissions: true },
            },
          },
        },
      },
    });

    if (!member) return unauthorized();
    if (!canReactToMessage(member)) return forbidden();

    const limit = await checkRateLimit({
      key: rateLimitKey("message:reaction", profile.id, "global"),
      limit: 60,
      windowMs: 60_000,
    });

    if (!limit.ok) {
      return rateLimitError(limit.retryAfterSeconds, `Too many reactions. Retry in ${limit.retryAfterSeconds}s`);
    }

    const existing = await db.messageReaction.findUnique({
      where: {
        memberId_messageId_emoji: {
          memberId: member.id,
          messageId: message.id,
          emoji: parsedBody.data.emoji,
        },
      },
    });

    if (existing) {
      await db.messageReaction.delete({ where: { id: existing.id } });
    } else {
      await db.messageReaction.create({
        data: {
          memberId: member.id,
          messageId: message.id,
          emoji: parsedBody.data.emoji,
        },
      });

      if (message.member.profileId !== profile.id) {
        await db.notification.create({
          data: {
            type: NotificationType.REACTION,
            actorId: profile.id,
            targetId: message.member.profileId,
            serverId: message.channel.serverId,
            channelId: message.channelId,
            messageId: message.id,
            metadata: { emoji: parsedBody.data.emoji },
          },
        });
      }
    }

    const updated = await db.message.findUnique({
      where: { id: message.id },
      include: channelMessageInclude(member.id),
    });

    await broadcast(`chat:${message.channelId}:messages:update`, { id: message.id, type: "reaction" });

    return Response.json(updated);
  } catch (error) {
    console.log("[MESSAGE_REACTION_POST]", error);
    return apiError("Internal Error", 500);
  }
}
