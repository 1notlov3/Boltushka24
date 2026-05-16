import { z } from "zod";

import { apiError, unauthorized, validationError } from "@/lib/api-response";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  markAllRead: z.boolean().optional(),
});

export async function GET() {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const limit = checkRateLimit({
      key: rateLimitKey("notifications:get", profile.id, profile.id),
      limit: 30,
      windowMs: 60_000,
    });
    if (!limit.ok) {
      return apiError(`Too many requests. Retry in ${limit.retryAfterSeconds}s`, 429);
    }

    const items = await db.notification.findMany({
      take: 50,
      where: { targetId: profile.id },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
        server: {
          select: {
            id: true,
            name: true,
          },
        },
        channel: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const unreadCount = await db.notification.count({
      where: { targetId: profile.id, read: false },
    });

    return Response.json({ items, unreadCount });
  } catch (error) {
    console.log("[NOTIFICATIONS_GET]", error);
    return apiError("Internal Error", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const limit = checkRateLimit({
      key: rateLimitKey("notifications:patch", profile.id, profile.id),
      limit: 10,
      windowMs: 60_000,
    });
    if (!limit.ok) {
      return apiError(`Too many requests. Retry in ${limit.retryAfterSeconds}s`, 429);
    }

    const parsed = PatchSchema.safeParse(await req.json());
    if (!parsed.success) return validationError(parsed.error);

    if (parsed.data.markAllRead) {
      await db.notification.updateMany({
        where: { targetId: profile.id, read: false },
        data: { read: true },
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.log("[NOTIFICATIONS_PATCH]", error);
    return apiError("Internal Error", 500);
  }
}
