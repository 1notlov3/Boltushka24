import { z } from "zod";

import { apiError, notFound, unauthorized, validationError } from "@/lib/api-response";
import { directMessageInclude } from "@/lib/chat-includes";
import { logAudit } from "@/lib/audit";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { canDeleteMessage, canEditMessage } from "@/lib/permissions";
import { broadcast } from "@/lib/realtime";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  directMessageId: z.string().uuid("Invalid direct message ID"),
});

const QuerySchema = z.object({
  conversationId: z.string().uuid("Invalid Conversation ID"),
});

const BodySchema = z.object({
  content: z.string().min(1, "Content is required").max(4000, "Content too long"),
});

export async function GET(_req: Request, context: { params: Promise<{ directMessageId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const conversation = await db.conversation.findFirst({
      where: {
        directMessages: {
          some: {
            id: parsedParams.data.directMessageId,
          },
        },
        OR: [
          { memberOne: { profileId: profile.id } },
          { memberTwo: { profileId: profile.id } },
        ],
      },
      select: {
        id: true,
        memberOne: {
          select: {
            id: true,
            profileId: true,
          },
        },
        memberTwo: {
          select: {
            id: true,
            profileId: true,
          },
        },
      },
    });

    if (!conversation) return notFound("Message not found");

    const member = conversation.memberOne.profileId === profile.id
      ? conversation.memberOne
      : conversation.memberTwo;

    const directMessage = await db.directMessage.findFirst({
      where: {
        id: parsedParams.data.directMessageId,
        conversationId: conversation.id,
      },
      include: directMessageInclude(member.id),
    });

    if (!directMessage) return notFound("Message not found");

    return Response.json(directMessage, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.log("[DIRECT_MESSAGE_GET]", error);
    return apiError("Internal Error", 500);
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ directMessageId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const { searchParams } = new URL(req.url);
    const parsedQuery = QuerySchema.safeParse({
      conversationId: searchParams.get("conversationId"),
    });
    if (!parsedQuery.success) return validationError(parsedQuery.error);

    const parsedBody = BodySchema.safeParse(await req.json());
    if (!parsedBody.success) return validationError(parsedBody.error);

    const conversation = await db.conversation.findFirst({
      where: {
        id: parsedQuery.data.conversationId,
        OR: [
          { memberOne: { profileId: profile.id } },
          { memberTwo: { profileId: profile.id } },
        ],
      },
      include: {
        memberOne: { select: { id: true, role: true, profileId: true, serverId: true } },
        memberTwo: { select: { id: true, role: true, profileId: true, serverId: true } },
      },
    });

    if (!conversation) return notFound("Conversation not found");

    const member = conversation.memberOne.profileId === profile.id
      ? conversation.memberOne
      : conversation.memberTwo;

    const directMessage = await db.directMessage.findFirst({
      where: {
        id: parsedParams.data.directMessageId,
        conversationId: conversation.id,
        deleted: false,
      },
      select: { id: true, memberId: true },
    });

    if (!directMessage) return notFound("Message not found");
    if (!canEditMessage(member, directMessage.memberId)) return unauthorized();

    const updated = await db.directMessage.update({
      where: { id: directMessage.id },
      data: { content: parsedBody.data.content },
      include: directMessageInclude(member.id),
    });

    await broadcast(`chat:${conversation.id}:messages:update`, { id: updated.id, action: "update" });

    return Response.json(updated);
  } catch (error) {
    console.log("[DIRECT_MESSAGE_PATCH]", error);
    return apiError("Internal Error", 500);
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ directMessageId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const { searchParams } = new URL(req.url);
    const parsedQuery = QuerySchema.safeParse({
      conversationId: searchParams.get("conversationId"),
    });
    if (!parsedQuery.success) return validationError(parsedQuery.error);

    const conversation = await db.conversation.findFirst({
      where: {
        id: parsedQuery.data.conversationId,
        OR: [
          { memberOne: { profileId: profile.id } },
          { memberTwo: { profileId: profile.id } },
        ],
      },
      include: {
        memberOne: { select: { id: true, role: true, profileId: true, serverId: true } },
        memberTwo: { select: { id: true, role: true, profileId: true, serverId: true } },
      },
    });

    if (!conversation) return notFound("Conversation not found");

    const member = conversation.memberOne.profileId === profile.id
      ? conversation.memberOne
      : conversation.memberTwo;

    const directMessage = await db.directMessage.findFirst({
      where: {
        id: parsedParams.data.directMessageId,
        conversationId: conversation.id,
        deleted: false,
      },
      select: { id: true, memberId: true },
    });

    if (!directMessage) return notFound("Message not found");
    if (!canDeleteMessage(member, directMessage.memberId)) return unauthorized();

    const deleted = await db.directMessage.update({
      where: { id: directMessage.id },
      data: {
        fileUrl: null,
        content: "Сообщение удалено",
        deleted: true,
      },
      include: directMessageInclude(member.id),
    });

    if (member.id !== directMessage.memberId) {
      await logAudit({
        action: "direct_message.delete.other",
        actorId: profile.id,
        serverId: member.serverId,
        targetId: deleted.id,
        metadata: {
          conversationId: conversation.id,
          authorMemberId: directMessage.memberId,
        },
      });
    }

    await broadcast(`chat:${conversation.id}:messages:update`, { id: deleted.id, action: "delete" });

    return Response.json(deleted);
  } catch (error) {
    console.log("[DIRECT_MESSAGE_DELETE]", error);
    return apiError("Internal Error", 500);
  }
}
