import { ConversationParticipantRole, ConversationType } from "@prisma/client";
import { z } from "zod";

import { apiError, unauthorized, validationError } from "@/lib/api-response";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { getConversationAccess } from "@/lib/conversation";
import { buildGroupSettingsPayload, canManageGroupConversation, canSubmitGroupSettings } from "@/lib/group-conversation-ui";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
});

const BodySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Name too long"),
  imageUrl: z.string().url("Invalid image URL").regex(/^(http|https):\/\//i, "Invalid image URL protocol").optional().nullable(),
});

const serializeParticipant = (participant: NonNullable<Awaited<ReturnType<typeof getConversationAccess>>>["participants"][number]) => ({
  id: participant.id,
  memberId: participant.memberId,
  role: participant.role,
  joinedAt: participant.joinedAt,
  member: {
    id: participant.member.id,
    role: participant.member.role,
    profile: {
      id: participant.member.profile.id,
      name: participant.member.profile.name,
      imageUrl: participant.member.profile.imageUrl,
      status: participant.member.profile.status,
      customStatus: participant.member.profile.customStatus,
      lastSeenAt: participant.member.profile.lastSeenAt,
    },
  },
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

    const currentParticipant = access.participants.find((participant) => participant.memberId === access.currentMember.id);
    if (!currentParticipant) return unauthorized();

    return Response.json({
      conversation: {
        id: access.conversation.id,
        serverId: access.conversation.serverId,
        name: access.conversation.name,
        imageUrl: access.conversation.imageUrl,
        ownerId: access.conversation.ownerId,
      },
      currentMemberId: access.currentMember.id,
      currentRole: currentParticipant.role,
      participants: access.participants.map(serializeParticipant),
    });
  } catch (error) {
    console.log("[CONVERSATION_GROUP_GET]", error);
    return apiError("Internal Error", 500);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
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

    const payload = buildGroupSettingsPayload(parsedBody.data);
    if (!canSubmitGroupSettings(payload)) return apiError("Invalid group settings", 400);

    const conversation = await db.conversation.update({
      where: { id: access.conversation.id },
      data: {
        name: payload.name,
        imageUrl: payload.imageUrl,
      },
    });

    return Response.json({ conversation });
  } catch (error) {
    console.log("[CONVERSATION_GROUP_PATCH]", error);
    return apiError("Internal Error", 500);
  }
}
