import { z } from "zod";

import { apiError, unauthorized, validationError } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { canManageModeration } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  serverId: z.string().uuid("Invalid server ID"),
  profileId: z.string().uuid("Invalid profile ID"),
});

async function requireModerator(serverId: string, profileId: string) {
  const member = await db.member.findFirst({
    where: { serverId, profileId },
    include: {
      serverRoles: {
        include: {
          role: { select: { permissions: true } },
        },
      },
    },
  });
  return member && canManageModeration(member) ? member : null;
}

export async function DELETE(_req: Request, context: { params: Promise<{ serverId: string; profileId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const { serverId, profileId } = parsedParams.data;
    const moderator = await requireModerator(serverId, profile.id);
    if (!moderator) return unauthorized();

    const ban = await db.serverBan.update({
      where: { serverId_profileId: { serverId, profileId } },
      data: { revokedAt: new Date() },
    });

    await logAudit({
      action: "moderation.member.unban",
      actorId: profile.id,
      serverId,
      targetId: ban.id,
      metadata: { targetProfileId: profileId },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.log("[SERVER_BAN_DELETE]", error);
    return apiError("Internal Error", 500);
  }
}
