import { ConversationParticipantRole, ConversationType } from "@prisma/client";
import { z } from "zod";

import { apiError, unauthorized, validationError } from "@/lib/api-response";
import { getConversationAccess, removeConversationParticipant } from "@/lib/conversation";
import { currentProfile } from "@/lib/current-profile";
import { canRemoveGroupParticipant } from "@/lib/group-conversation-ui";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
  memberId: z.string().uuid("Invalid member ID"),
});

async function loadAccess(conversationId: string) {
  const profile = await currentProfile();
  if (!profile) return null;

  return getConversationAccess({ conversationId, profileId: profile.id });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ conversationId: string; memberId: string }> }) {
  try {
    const resolvedParams = await params;
    const parsedParams = ParamsSchema.safeParse(resolvedParams);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const access = await loadAccess(parsedParams.data.conversationId);
    if (!access || !access.isGroup || access.conversation.type !== ConversationType.GROUP) return unauthorized();

    const actor = access.participants.find((participant) => participant.memberId === access.currentMember.id);
    const target = access.participants.find((participant) => participant.memberId === parsedParams.data.memberId);
    if (!actor || !target) return unauthorized();

    const ownerCount = access.participants.filter((participant) => participant.role === ConversationParticipantRole.OWNER).length;
    const isSelf = access.currentMember.id === parsedParams.data.memberId;
    const canRemove = canRemoveGroupParticipant({
      actorRole: actor.role as ConversationParticipantRole,
      targetRole: target.role as ConversationParticipantRole,
      isSelf,
      ownerCount,
    });

    if (!canRemove) return unauthorized();

    const conversation = await removeConversationParticipant({
      conversationId: access.conversation.id,
      actorMemberId: access.currentMember.id,
      memberId: parsedParams.data.memberId,
    });

    if (!conversation) return apiError("Unable to remove participant", 400);

    return Response.json({ conversation, left: isSelf });
  } catch (error) {
    console.log("[CONVERSATION_GROUP_PARTICIPANT_DELETE]", error);
    return apiError("Internal Error", 500);
  }
}
