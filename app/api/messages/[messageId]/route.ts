import { z } from "zod";

import { apiError, notFound, unauthorized, validationError } from "@/lib/api-response";
import { channelMessageInclude } from "@/lib/chat-includes";
import { logAudit } from "@/lib/audit";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { canDeleteMessage, canEditMessage } from "@/lib/permissions";
import { broadcast } from "@/lib/realtime";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  messageId: z.string().uuid("Invalid message ID"),
});

const QuerySchema = z.object({
  serverId: z.string().uuid("Invalid Server ID"),
  channelId: z.string().uuid("Invalid Channel ID"),
});

const BodySchema = z.object({
  content: z.string().min(1, "Content is required").max(4000, "Content too long"),
});

export async function GET(_req: Request, context: { params: Promise<{ messageId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const access = await db.message.findFirst({
      where: {
        id: parsedParams.data.messageId,
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
        channel: {
          select: {
            serverId: true,
          },
        },
      },
    });

    if (!access) return notFound("Message not found");

    const member = await db.member.findFirst({
      where: {
        serverId: access.channel.serverId,
        profileId: profile.id,
      },
      select: {
        id: true,
      },
    });

    if (!member) return unauthorized();

    const message = await db.message.findUnique({
      where: {
        id: access.id,
      },
      include: channelMessageInclude(member.id),
    });

    if (!message) return notFound("Message not found");

    return Response.json(message, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.log("[MESSAGE_GET]", error);
    return apiError("Internal Error", 500);
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ messageId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const { searchParams } = new URL(req.url);
    const parsedQuery = QuerySchema.safeParse({
      serverId: searchParams.get("serverId"),
      channelId: searchParams.get("channelId"),
    });
    if (!parsedQuery.success) return validationError(parsedQuery.error);

    const parsedBody = BodySchema.safeParse(await req.json());
    if (!parsedBody.success) return validationError(parsedBody.error);

    const { serverId, channelId } = parsedQuery.data;

    const [member, message] = await Promise.all([
      db.member.findFirst({
        where: { serverId, profileId: profile.id },
        select: { id: true, role: true },
      }),
      db.message.findFirst({
        where: {
          id: parsedParams.data.messageId,
          channelId,
          deleted: false,
        },
        select: { id: true, memberId: true },
      }),
    ]);

    if (!member) return unauthorized();
    if (!message) return notFound("Message not found");
    if (!canEditMessage(member, message.memberId)) return unauthorized();

    const updated = await db.message.update({
      where: { id: message.id },
      data: { content: parsedBody.data.content },
      include: channelMessageInclude(member.id),
    });

    await broadcast(`chat:${channelId}:messages:update`, { id: updated.id, action: "update" });

    return Response.json(updated);
  } catch (error) {
    console.log("[MESSAGE_PATCH]", error);
    return apiError("Internal Error", 500);
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ messageId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const { searchParams } = new URL(req.url);
    const parsedQuery = QuerySchema.safeParse({
      serverId: searchParams.get("serverId"),
      channelId: searchParams.get("channelId"),
    });
    if (!parsedQuery.success) return validationError(parsedQuery.error);

    const { serverId, channelId } = parsedQuery.data;

    const [member, message] = await Promise.all([
      db.member.findFirst({
        where: { serverId, profileId: profile.id },
        select: { id: true, role: true },
      }),
      db.message.findFirst({
        where: {
          id: parsedParams.data.messageId,
          channelId,
          deleted: false,
        },
        select: { id: true, memberId: true },
      }),
    ]);

    if (!member) return unauthorized();
    if (!message) return notFound("Message not found");
    if (!canDeleteMessage(member, message.memberId)) return unauthorized();

    const deleted = await db.message.update({
      where: { id: message.id },
      data: {
        fileUrl: null,
        content: "Сообщение удалено",
        deleted: true,
      },
      include: channelMessageInclude(member.id),
    });

    if (member.id !== message.memberId) {
      await logAudit({
        action: "message.delete.other",
        actorId: profile.id,
        serverId,
        targetId: deleted.id,
        metadata: {
          channelId,
          authorMemberId: message.memberId,
        },
      });
    }

    await broadcast(`chat:${channelId}:messages:update`, { id: deleted.id, action: "delete" });

    return Response.json(deleted);
  } catch (error) {
    console.log("[MESSAGE_DELETE]", error);
    return apiError("Internal Error", 500);
  }
}
