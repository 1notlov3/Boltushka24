import { z } from "zod";

import { apiError, unauthorized, validationError } from "@/lib/api-response";
import { markConversationRead } from "@/lib/conversation";
import { currentProfile } from "@/lib/current-profile";

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

    const readState = await markConversationRead({
      conversationId: parsedParams.data.conversationId,
      profileId: profile.id,
    });

    if (!readState) return unauthorized();

    return Response.json(readState);
  } catch (error) {
    console.log("[CONVERSATION_READ_POST]", error);
    return apiError("Internal Error", 500);
  }
}
