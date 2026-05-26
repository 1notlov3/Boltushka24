import { ConversationType } from "@prisma/client";
import { z } from "zod";

import { apiError, rateLimitError, unauthorized, validationError } from "@/lib/api-response";
import { createGroupConversation } from "@/lib/conversation";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  serverId: z.string().uuid("Invalid server ID"),
  name: z.string().trim().min(1, "Name is required").max(120, "Name too long"),
  imageUrl: z.string().url("Invalid image URL").regex(/^(http|https):\/\//i, "Invalid image URL protocol").optional().nullable(),
  memberIds: z
    .array(z.string().uuid("Invalid member ID"))
    .min(2, "Group conversation requires at least 3 participants")
    .max(99, "Too many participants")
    .superRefine((memberIds, ctx) => {
      if (new Set(memberIds).size !== memberIds.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate member IDs are not allowed",
        });
      }
    }),
});

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const { searchParams } = new URL(req.url);
    const parsedQuery = z.object({
      serverId: z.string().uuid("Invalid server ID"),
    }).safeParse({
      serverId: searchParams.get("serverId"),
    });

    if (!parsedQuery.success) return validationError(parsedQuery.error);

    const member = await db.member.findFirst({
      where: {
        profileId: profile.id,
        serverId: parsedQuery.data.serverId,
      },
      select: { id: true },
    });

    if (!member) return unauthorized();

    const conversations = await db.conversation.findMany({
      where: {
        type: ConversationType.GROUP,
        serverId: parsedQuery.data.serverId,
        participants: {
          some: {
            memberId: member.id,
            leftAt: null,
          },
        },
      },
      include: {
        participants: {
          where: { leftAt: null },
          include: {
            member: {
              include: {
                profile: true,
              },
            },
          },
        },
        directMessages: {
          where: { deleted: false },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    return Response.json({ conversations });
  } catch (error) {
    console.log("[CONVERSATIONS_GROUP_GET]", error);
    return apiError("Internal Error", 500);
  }
}

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedBody = BodySchema.safeParse(await req.json());
    if (!parsedBody.success) return validationError(parsedBody.error);

    const body = parsedBody.data;

    const ownerMember = await db.member.findFirst({
      where: {
        profileId: profile.id,
        serverId: body.serverId,
      },
      select: {
        id: true,
        serverId: true,
      },
    });

    if (!ownerMember) return unauthorized();

    if (body.memberIds.includes(ownerMember.id)) {
      return apiError("Owner member ID must not be included in memberIds", 400);
    }

    const limit = await checkRateLimit({
      key: rateLimitKey("conversation:group:create", profile.id, body.serverId),
      limit: 10,
      windowMs: 60_000,
    });

    if (!limit.ok) {
      return rateLimitError(
        limit.retryAfterSeconds,
        `Too many group conversations. Retry in ${limit.retryAfterSeconds}s`,
      );
    }

    const targetMembers = await db.member.findMany({
      where: {
        id: { in: body.memberIds },
        serverId: body.serverId,
      },
      select: { id: true },
    });

    if (targetMembers.length !== body.memberIds.length) {
      return apiError("One or more members are not in this server", 400);
    }

    const conversation = await createGroupConversation({
      ownerMemberId: ownerMember.id,
      memberIds: body.memberIds,
      name: body.name,
      imageUrl: body.imageUrl ?? null,
    });

    if (!conversation) {
      return apiError("Unable to create group conversation", 400);
    }

    return Response.json({ conversation }, { status: 201 });
  } catch (error) {
    console.log("[CONVERSATIONS_GROUP_POST]", error);
    return apiError("Internal Error", 500);
  }
}
