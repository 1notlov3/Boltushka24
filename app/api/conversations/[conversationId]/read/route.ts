import { z } from "zod";

import { apiError, unauthorized, validationError } from "@/lib/api-response";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  conversationId: z.string().uuid("Invalid Conversation ID"),
});

export async function POST(_req: Request, context: { params: Promise<{ conversationId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const conversation = await db.conversation.findFirst({
      where: {
        id: parsedParams.data.conversationId,
        OR: [
          { memberOne: { profileId: profile.id } },
          { memberTwo: { profileId: profile.id } },
        ],
      },
      select: {
        id: true,
        memberOne: {
          select: { id: true, profileId: true },
        },
        memberTwo: {
          select: { id: true, profileId: true },
        },
      },
    });

    if (!conversation) return unauthorized();

    const member = conversation.memberOne.profileId === profile.id
      ? conversation.memberOne
      : conversation.memberTwo;

    const readState = await db.conversationReadState.upsert({
      where: {
        memberId_conversationId: {
          memberId: member.id,
          conversationId: conversation.id,
        },
      },
      create: {
        memberId: member.id,
        conversationId: conversation.id,
        lastReadAt: new Date(),
      },
      update: {
        lastReadAt: new Date(),
      },
    });

    return Response.json(readState);
  } catch (error) {
    console.log("[CONVERSATION_READ_POST]", error);
    return apiError("Internal Error", 500);
  }
}
