import { z } from "zod";

import { apiError, forbidden, notFound, rateLimitError, unauthorized, validationError } from "@/lib/api-response";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { canSaveMessage } from "@/lib/permissions";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  messageId: z.string().uuid("Invalid message ID"),
});

export async function POST(_req: Request, context: { params: Promise<{ messageId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const params = await context.params;
    const parsedParams = ParamsSchema.safeParse(params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const message = await db.message.findFirst({
      where: {
        id: parsedParams.data.messageId,
        deleted: false,
        channel: { server: { members: { some: { profileId: profile.id } } } },
      },
      select: {
        id: true,
        channel: { select: { serverId: true } },
      },
    });

    if (!message) return notFound("Message not found");

    const member = await db.member.findFirst({
      where: { profileId: profile.id, serverId: message.channel.serverId },
      select: { id: true, role: true },
    });

    if (!member) return unauthorized();
    if (!canSaveMessage(member)) return forbidden();

    const limit = await checkRateLimit({
      key: rateLimitKey("message:save", profile.id, "global"),
      limit: 30,
      windowMs: 60_000,
    });

    if (!limit.ok) {
      return rateLimitError(limit.retryAfterSeconds, `Too many save requests. Retry in ${limit.retryAfterSeconds}s`);
    }

    const existing = await db.savedMessage.findUnique({
      where: { memberId_messageId: { memberId: member.id, messageId: message.id } },
    });

    if (existing) {
      await db.savedMessage.delete({ where: { id: existing.id } });
      return Response.json({ saved: false });
    }

    await db.savedMessage.create({ data: { memberId: member.id, messageId: message.id } });
    return Response.json({ saved: true });
  } catch (error) {
    console.log("[MESSAGE_SAVE_POST]", error);
    return apiError("Internal Error", 500);
  }
}
