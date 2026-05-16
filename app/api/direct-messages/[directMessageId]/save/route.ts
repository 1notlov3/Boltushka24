import { z } from "zod";

import { apiError, forbidden, notFound, unauthorized, validationError } from "@/lib/api-response";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { canSaveMessage } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  directMessageId: z.string().uuid("Invalid direct message ID"),
});

export async function POST(_req: Request, context: { params: Promise<{ directMessageId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const params = await context.params;
    const parsedParams = ParamsSchema.safeParse(params);
    if (!parsedParams.success) return validationError(parsedParams.error);

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
        conversation: {
          select: {
            memberOne: { select: { id: true, role: true, profileId: true } },
            memberTwo: { select: { id: true, role: true, profileId: true } },
          },
        },
      },
    });

    if (!directMessage) return notFound("Message not found");

    const member = directMessage.conversation.memberOne.profileId === profile.id
      ? directMessage.conversation.memberOne
      : directMessage.conversation.memberTwo;

    if (!canSaveMessage(member)) return forbidden();

    const existing = await db.savedDirectMessage.findUnique({
      where: { memberId_directMessageId: { memberId: member.id, directMessageId: directMessage.id } },
    });

    if (existing) {
      await db.savedDirectMessage.delete({ where: { id: existing.id } });
      return Response.json({ saved: false });
    }

    await db.savedDirectMessage.create({ data: { memberId: member.id, directMessageId: directMessage.id } });
    return Response.json({ saved: true });
  } catch (error) {
    console.log("[DIRECT_MESSAGE_SAVE_POST]", error);
    return apiError("Internal Error", 500);
  }
}
