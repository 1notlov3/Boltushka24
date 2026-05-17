import { z } from "zod";

import { apiError, notFound, unauthorized, validationError } from "@/lib/api-response";
import { directMessageInclude } from "@/lib/chat-includes";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  directMessageId: z.string().uuid("Invalid direct message ID"),
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
