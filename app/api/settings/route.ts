import { UserStatus } from "@prisma/client";
import { z } from "zod";

import { apiError, unauthorized, validationError } from "@/lib/api-response";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const SettingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  language: z.enum(["ru", "en"]).optional(),
  compactMode: z.boolean().optional(),
  notificationsEnabled: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  showOnlineStatus: z.boolean().optional(),
  status: z.nativeEnum(UserStatus).optional(),
  customStatus: z.string().trim().max(80).optional().nullable(),
});

export async function GET() {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const settings = await db.userSettings.upsert({
      where: { profileId: profile.id },
      update: {},
      create: { profileId: profile.id },
    });

    return Response.json({
      profile: {
        status: profile.status,
        customStatus: profile.customStatus,
        lastSeenAt: profile.lastSeenAt,
      },
      settings,
    });
  } catch (error) {
    console.log("[SETTINGS_GET]", error);
    return apiError("Internal Error", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsed = SettingsSchema.safeParse(await req.json());
    if (!parsed.success) return validationError(parsed.error);

    const {
      status,
      customStatus,
      theme,
      language,
      compactMode,
      notificationsEnabled,
      soundEnabled,
      showOnlineStatus,
    } = parsed.data;

    const [updatedProfile, settings] = await db.$transaction([
      db.profile.update({
        where: { id: profile.id },
        data: {
          ...(status ? { status } : {}),
          ...(customStatus !== undefined ? { customStatus: customStatus || null } : {}),
          lastSeenAt: new Date(),
        },
        select: {
          status: true,
          customStatus: true,
          lastSeenAt: true,
        },
      }),
      db.userSettings.upsert({
        where: { profileId: profile.id },
        update: {
          ...(theme ? { theme } : {}),
          ...(language ? { language } : {}),
          ...(compactMode !== undefined ? { compactMode } : {}),
          ...(notificationsEnabled !== undefined ? { notificationsEnabled } : {}),
          ...(soundEnabled !== undefined ? { soundEnabled } : {}),
          ...(showOnlineStatus !== undefined ? { showOnlineStatus } : {}),
        },
        create: {
          profileId: profile.id,
          theme: theme ?? "system",
          language: language ?? "ru",
          compactMode: compactMode ?? false,
          notificationsEnabled: notificationsEnabled ?? true,
          soundEnabled: soundEnabled ?? true,
          showOnlineStatus: showOnlineStatus ?? true,
        },
      }),
    ]);

    return Response.json({ profile: updatedProfile, settings });
  } catch (error) {
    console.log("[SETTINGS_PATCH]", error);
    return apiError("Internal Error", 500);
  }
}
