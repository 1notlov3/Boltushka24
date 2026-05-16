import { z } from "zod";

import { apiError, unauthorized, validationError } from "@/lib/api-response";
import { directMessageInclude } from "@/lib/chat-includes";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
  q: z.string().trim().min(1).max(100),
});

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const limit = checkRateLimit({
      key: rateLimitKey("dm:search", profile.id, profile.id),
      limit: 20,
      windowMs: 60_000,
    });
    if (!limit.ok) {
      return apiError(`Too many requests. Retry in ${limit.retryAfterSeconds}s`, 429);
    }

    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      conversationId: searchParams.get("conversationId"),
      q: searchParams.get("q"),
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
      take: 25,
      where: {
        conversationId: conversation.id,
        deleted: false,
        content: { contains: parsed.data.q, mode: "insensitive" },
      },
      include: directMessageInclude(member.id),
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ items });
  } catch (error) {
    console.log("[DIRECT_MESSAGES_SEARCH_GET]", error);
    return apiError("Internal Error", 500);
  }
}
