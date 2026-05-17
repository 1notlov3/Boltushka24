import { UserStatus } from "@prisma/client";
import { z } from "zod";

import { apiError, rateLimitError, unauthorized, validationError } from "@/lib/api-response";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const PresenceSchema = z.object({
  status: z.nativeEnum(UserStatus),
});

async function parseBody(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return req.json();
  }

  const text = await req.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { status: text };
  }
}

async function updatePresence(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const limit = await checkRateLimit({
      key: rateLimitKey("presence:update", profile.id, profile.id),
      limit: 180,
      windowMs: 60_000,
    });

    if (!limit.ok) {
      return rateLimitError(limit.retryAfterSeconds);
    }

    const parsed = PresenceSchema.safeParse(await parseBody(req));
    if (!parsed.success) return validationError(parsed.error);

    const updated = await db.profile.update({
      where: { id: profile.id },
      data: {
        status: parsed.data.status,
        lastSeenAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        lastSeenAt: true,
      },
    });

    return Response.json({ profile: updated });
  } catch (error) {
    console.log("[PRESENCE_UPDATE]", error);
    return apiError("Internal Error", 500);
  }
}

export async function PATCH(req: Request) {
  return updatePresence(req);
}

export async function POST(req: Request) {
  return updatePresence(req);
}
