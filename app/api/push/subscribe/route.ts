import { z } from "zod";

import { apiError, rateLimitError, unauthorized, validationError } from "@/lib/api-response";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { getVapidPublicKey, isWebPushEnabled } from "@/lib/web-push";

export const dynamic = "force-dynamic";

const SubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    auth: z.string().min(1),
    p256dh: z.string().min(1),
  }),
});

const DeleteSchema = z.object({
  endpoint: z.string().url(),
});

export async function GET() {
  return Response.json({
    enabled: isWebPushEnabled(),
    publicKey: getVapidPublicKey(),
  });
}

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    if (!isWebPushEnabled()) {
      return Response.json({ enabled: false, subscribed: false });
    }

    const limit = await checkRateLimit({
      key: rateLimitKey("push:subscribe", profile.id, profile.id),
      limit: 10,
      windowMs: 60_000,
    });

    if (!limit.ok) {
      return rateLimitError(limit.retryAfterSeconds);
    }

    const parsed = SubscriptionSchema.safeParse(await req.json());
    if (!parsed.success) return validationError(parsed.error);

    await db.pushSubscription.upsert({
      where: { endpoint: parsed.data.endpoint },
      create: {
        profileId: profile.id,
        endpoint: parsed.data.endpoint,
        keysAuth: parsed.data.keys.auth,
        keysP256dh: parsed.data.keys.p256dh,
      },
      update: {
        profileId: profile.id,
        keysAuth: parsed.data.keys.auth,
        keysP256dh: parsed.data.keys.p256dh,
      },
    });

    return Response.json({ enabled: true, subscribed: true });
  } catch (error) {
    console.log("[PUSH_SUBSCRIBE_POST]", error);
    return apiError("Internal Error", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsed = DeleteSchema.safeParse(await req.json());
    if (!parsed.success) return validationError(parsed.error);

    await db.pushSubscription.deleteMany({
      where: {
        profileId: profile.id,
        endpoint: parsed.data.endpoint,
      },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.log("[PUSH_SUBSCRIBE_DELETE]", error);
    return apiError("Internal Error", 500);
  }
}
