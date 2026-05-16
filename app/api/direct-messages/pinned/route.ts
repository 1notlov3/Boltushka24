import { z } from "zod";

import { apiError, unauthorized, validationError } from "@/lib/api-response";
import { directMessageInclude } from "@/lib/chat-includes";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
});

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsed = QuerySchema.safeParse({
      conversationId: new URL(req.url).searchParams.get("conversationId"),
    });
    if (!parsed.success) return validationError(parsed.error);

    const conversation = await db.conversation.findFirst({
      where: {
        id: parsed.data.conversationId,
        OR: [
          { memberOne: { profileId: profile.id } },
          { memberTwo: { profileId: profile.id } },
        ],
      },
      select: {
        id: true,
        memberOne: { select: { id: true, profileId: true } },
        memberTwo: { select: { id: true, profileId: true } },
      },
    });

    if (!conversation) return unauthorized();

    const member = conversation.memberOne.profileId === profile.id
      ? conversation.memberOne
      : conversation.memberTwo;

    const items = await db.directMessage.findMany({
      take: 50,
      where: { conversationId: conversation.id, pinned: true, deleted: false },
      include: directMessageInclude(member.id),
      orderBy: { pinnedAt: "desc" },
    });

    return Response.json({ items });
  } catch (error) {
    console.log("[DIRECT_MESSAGES_PINNED_GET]", error);
    return apiError("Internal Error", 500);
  }
}
