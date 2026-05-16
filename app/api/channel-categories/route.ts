import { z } from "zod";

import { apiError, forbidden, unauthorized, validationError } from "@/lib/api-response";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { canManageChannels } from "@/lib/permissions";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  serverId: z.string().uuid("Invalid server ID"),
});

const BodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  position: z.number().int().min(0).optional(),
});

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsed = QuerySchema.safeParse({
      serverId: new URL(req.url).searchParams.get("serverId"),
    });
    if (!parsed.success) return validationError(parsed.error);

    const member = await db.member.findFirst({
      where: { profileId: profile.id, serverId: parsed.data.serverId },
      select: { id: true },
    });

    if (!member) return unauthorized();

    const items = await db.channelCategory.findMany({
      where: { serverId: parsed.data.serverId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        position: true,
      },
    });

    return Response.json({ items });
  } catch (error) {
    console.log("[CHANNEL_CATEGORIES_GET]", error);
    return apiError("Internal Error", 500);
  }
}

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const { searchParams } = new URL(req.url);
    const parsedQuery = QuerySchema.safeParse({ serverId: searchParams.get("serverId") });
    if (!parsedQuery.success) return validationError(parsedQuery.error);

    const parsedBody = BodySchema.safeParse(await req.json());
    if (!parsedBody.success) return validationError(parsedBody.error);

    const member = await db.member.findFirst({
      where: { profileId: profile.id, serverId: parsedQuery.data.serverId },
      select: { id: true, role: true },
    });

    if (!member) return unauthorized();
    if (!canManageChannels(member)) return forbidden();

    const limit = checkRateLimit({
      key: rateLimitKey("category:create", profile.id, parsedQuery.data.serverId),
      limit: 10,
      windowMs: 60_000,
    });

    if (!limit.ok) {
      return apiError(`Too many categories. Retry in ${limit.retryAfterSeconds}s`, 429);
    }

    const category = await db.channelCategory.create({
      data: {
        serverId: parsedQuery.data.serverId,
        name: parsedBody.data.name,
        position: parsedBody.data.position ?? 0,
      },
    });

    await db.auditLog.create({
      data: {
        action: "channel_category.create",
        actorId: profile.id,
        serverId: parsedQuery.data.serverId,
        targetId: category.id,
        metadata: { name: category.name },
      },
    });

    return Response.json(category);
  } catch (error) {
    console.log("[CHANNEL_CATEGORIES_POST]", error);
    return apiError("Internal Error", 500);
  }
}
