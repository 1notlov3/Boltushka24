import { ConversationParticipantRole, ConversationType } from "@prisma/client";
import { z } from "zod";

import { apiError, unauthorized, validationError } from "@/lib/api-response";
import { addConversationParticipants, getConversationAccess } from "@/lib/conversation";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { canManageGroupConversation } from "@/lib/group-conversation-ui";
import { createGroupSystemEvent } from "@/lib/group-system-event-service";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
});

const BodySchema = z.object({
  memberIds: z
    .array(z.string().uuid("Invalid member ID"))
    .min(1, "At least one member is required")
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

async function loadAccess(conversationId: string) {
  const profile = await currentProfile();
  if (!profile) return null;

  return getConversationAccess({ conversationId, profileId: profile.id });
}

export async function GET(_req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const resolvedParams = await params;
    const parsedParams = ParamsSchema.safeParse(resolvedParams);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const access = await loadAccess(parsedParams.data.conversationId);
    if (!access || !access.isGroup || access.conversation.type !== ConversationType.GROUP) return unauthorized();

    const activeMemberIds = new Set(access.participants.map((participant) => participant.memberId));
    const candidates = await db.member.findMany({
      where: {
        serverId: access.currentMember.serverId,
        id: {
          notIn: Array.from(activeMemberIds),
        },
      },
      select: {
        id: true,
        role: true,
        profile: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
      },
      orderBy: [
        { role: "asc" },
        { createdAt: "asc" },
        { id: "asc" },
      ],
      take: 100,
    });

    return Response.json({
      members: candidates.map((member) => ({
        id: member.id,
        profileId: member.profile.id,
        name: member.profile.name,
        imageUrl: member.profile.imageUrl,
        role: member.role,
      })),
    });
  } catch (error) {
    console.log("[CONVERSATION_GROUP_PARTICIPANTS_GET]", error);
    return apiError("Internal Error", 500);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const resolvedParams = await params;
    const parsedParams = ParamsSchema.safeParse(resolvedParams);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const access = await loadAccess(parsedParams.data.conversationId);
    if (!access || !access.isGroup || access.conversation.type !== ConversationType.GROUP) return unauthorized();

    const currentParticipant = access.participants.find((participant) => participant.memberId === access.currentMember.id);
    if (!canManageGroupConversation(currentParticipant?.role as ConversationParticipantRole | undefined)) {
      return unauthorized();
    }

    const parsedBody = BodySchema.safeParse(await req.json());
    if (!parsedBody.success) return validationError(parsedBody.error);

    const targetMembers = await db.member.findMany({
      where: {
        id: { in: parsedBody.data.memberIds },
        serverId: access.currentMember.serverId,
      },
      select: { id: true },
    });

    if (targetMembers.length !== parsedBody.data.memberIds.length) {
      return apiError("One or more members are not in this server", 400);
    }

    const conversation = await addConversationParticipants({
      conversationId: access.conversation.id,
      actorMemberId: access.currentMember.id,
      memberIds: parsedBody.data.memberIds,
    });

    if (!conversation) return apiError("Unable to add participants", 400);

    const targetNameById = new Map(access.participants.map((participant) => [participant.memberId, participant.member.profile.name]));
    for (const member of await db.member.findMany({
      where: { id: { in: parsedBody.data.memberIds } },
      select: { id: true, profile: { select: { name: true } } },
    })) {
      targetNameById.set(member.id, member.profile.name);
    }

    await createGroupSystemEvent({
      conversationId: access.conversation.id,
      actorProfileId: profile.id,
      actorMemberId: access.currentMember.id,
      serverId: access.currentMember.serverId,
      event: {
        type: "member_added",
        actorName: profile.name,
        targetNames: parsedBody.data.memberIds.map((memberId) => targetNameById.get(memberId) ?? "Участник"),
      },
      participants: conversation.participants,
    });

    return Response.json({ conversation });
  } catch (error) {
    console.log("[CONVERSATION_GROUP_PARTICIPANTS_POST]", error);
    return apiError("Internal Error", 500);
  }
}
