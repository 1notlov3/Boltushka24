import { Prisma } from "@prisma/client";
import { z } from "zod";

import { apiError, notFound, rateLimitError, unauthorized, validationError } from "@/lib/api-response";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { assertNoActiveMemberTimeout } from "@/lib/moderation-enforcement";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { broadcast } from "@/lib/realtime";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  pollId: z.string().uuid("Invalid poll ID"),
});

const VoteSchema = z.object({
  optionId: z.string().trim().min(1).max(80),
});

const pollInclude = {
  votes: {
    select: {
      id: true,
      memberId: true,
      optionId: true,
    },
  },
} satisfies Prisma.PollInclude;

async function resolvePollAccess(pollId: string, profileId: string) {
  const poll = await db.poll.findUnique({
    where: { id: pollId },
    include: {
      message: {
        select: {
          id: true,
          channelId: true,
          channel: {
            select: {
              serverId: true,
            },
          },
        },
      },
      directMessage: {
        select: {
          id: true,
          conversationId: true,
          conversation: {
            select: {
              memberOne: {
                select: {
                  id: true,
                  profileId: true,
                  serverId: true,
                },
              },
              memberTwo: {
                select: {
                  id: true,
                  profileId: true,
                  serverId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!poll) return null;

  if (poll.message) {
    const member = await db.member.findFirst({
      where: {
        serverId: poll.message.channel.serverId,
        profileId,
      },
      select: {
        id: true,
      },
    });

    if (!member) return null;

    return {
      poll,
      member,
      serverId: poll.message.channel.serverId,
      messageId: poll.message.id,
      topic: `chat:${poll.message.channelId}:messages:update`,
    };
  }

  if (poll.directMessage) {
    const { memberOne, memberTwo } = poll.directMessage.conversation;
    const member = memberOne.profileId === profileId ? memberOne : memberTwo.profileId === profileId ? memberTwo : null;

    if (!member) return null;

    return {
      poll,
      member: { id: member.id },
      serverId: member.serverId,
      messageId: poll.directMessage.id,
      topic: `chat:${poll.directMessage.conversationId}:messages:update`,
    };
  }

  return null;
}

function hasOption(options: Prisma.JsonValue, optionId: string) {
  return Array.isArray(options) && options.some((option) => (
    !!option &&
    typeof option === "object" &&
    !Array.isArray(option) &&
    (option as { id?: unknown }).id === optionId
  ));
}

export async function POST(req: Request, context: { params: Promise<{ pollId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const parsedBody = VoteSchema.safeParse(await req.json());
    if (!parsedBody.success) return validationError(parsedBody.error);

    const access = await resolvePollAccess(parsedParams.data.pollId, profile.id);
    if (!access) return notFound("Poll not found");

    const { poll, member, topic, messageId } = access;
    const optionId = parsedBody.data.optionId;

    const timeoutError = await assertNoActiveMemberTimeout(access.serverId, member.id, "У вас таймаут на голосование");
    if (timeoutError) return timeoutError;

    if (poll.closesAt && poll.closesAt.getTime() <= Date.now()) {
      return apiError("Poll is closed", 400);
    }

    if (!hasOption(poll.options, optionId)) {
      return apiError("Poll option not found", 404);
    }

    const limit = await checkRateLimit({
      key: rateLimitKey("poll:vote", profile.id, poll.id),
      limit: 60,
      windowMs: 60_000,
    });

    if (!limit.ok) {
      return rateLimitError(limit.retryAfterSeconds);
    }

    await db.$transaction(async (tx) => {
      if (!poll.multiple) {
        await tx.pollVote.deleteMany({
          where: {
            pollId: poll.id,
            memberId: member.id,
            optionId: {
              not: optionId,
            },
          },
        });
      }

      await tx.pollVote.upsert({
        where: {
          pollId_memberId_optionId: {
            pollId: poll.id,
            memberId: member.id,
            optionId,
          },
        },
        create: {
          pollId: poll.id,
          memberId: member.id,
          optionId,
        },
        update: {},
      });
    });

    const updated = await db.poll.findUnique({
      where: { id: poll.id },
      include: pollInclude,
    });

    await broadcast(topic, { id: messageId, action: "update" });

    return Response.json(updated);
  } catch (error) {
    console.log("[POLL_VOTE_POST]", error);
    return apiError("Internal Error", 500);
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ pollId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const parsedBody = VoteSchema.safeParse(await req.json());
    if (!parsedBody.success) return validationError(parsedBody.error);

    const access = await resolvePollAccess(parsedParams.data.pollId, profile.id);
    if (!access) return notFound("Poll not found");

    const { poll, member, topic, messageId } = access;

    await db.pollVote.deleteMany({
      where: {
        pollId: poll.id,
        memberId: member.id,
        optionId: parsedBody.data.optionId,
      },
    });

    const updated = await db.poll.findUnique({
      where: { id: poll.id },
      include: pollInclude,
    });

    await broadcast(topic, { id: messageId, action: "update" });

    return Response.json(updated);
  } catch (error) {
    console.log("[POLL_VOTE_DELETE]", error);
    return apiError("Internal Error", 500);
  }
}
