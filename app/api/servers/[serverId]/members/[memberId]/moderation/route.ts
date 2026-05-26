import { z } from "zod";

import { apiError, unauthorized, validationError } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { canModerateTarget } from "@/lib/moderation";
import { canManageModeration } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  serverId: z.string().uuid("Invalid server ID"),
  memberId: z.string().uuid("Invalid member ID"),
});

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("timeout"),
    durationSeconds: z.number().int().min(60).max(30 * 24 * 60 * 60),
    reason: z.string().trim().max(1000).optional().nullable(),
    reportId: z.string().uuid().optional().nullable(),
  }),
  z.object({
    action: z.literal("ban"),
    reason: z.string().trim().max(1000).optional().nullable(),
    reportId: z.string().uuid().optional().nullable(),
  }),
]);

async function getActor(serverId: string, profileId: string) {
  return db.member.findFirst({
    where: { serverId, profileId },
    include: {
      serverRoles: {
        include: {
          role: { select: { permissions: true } },
        },
      },
    },
  });
}

export async function PATCH(req: Request, context: { params: Promise<{ serverId: string; memberId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const parsedBody = ActionSchema.safeParse(await req.json());
    if (!parsedBody.success) return validationError(parsedBody.error);

    const { serverId, memberId } = parsedParams.data;
    const [server, actor, target] = await Promise.all([
      db.server.findUnique({ where: { id: serverId }, select: { id: true, profileId: true } }),
      getActor(serverId, profile.id),
      db.member.findFirst({
        where: { id: memberId, serverId },
        select: { id: true, role: true, profileId: true },
      }),
    ]);

    if (!server || !actor || !canManageModeration(actor)) return unauthorized();
    if (!target) return apiError("Target member not found", 404);
    if (!canModerateTarget({ actor, target, serverOwnerProfileId: server.profileId })) {
      return apiError("Cannot moderate this member", 403);
    }

    if (parsedBody.data.action === "timeout") {
      const expiresAt = new Date(Date.now() + parsedBody.data.durationSeconds * 1000);
      const timeout = await db.memberTimeout.create({
        data: {
          serverId,
          memberId: target.id,
          moderatorId: actor.id,
          moderatorProfileId: profile.id,
          reason: parsedBody.data.reason || null,
          expiresAt,
        },
      });

      if (parsedBody.data.reportId) {
        await db.moderationReport.updateMany({
          where: { id: parsedBody.data.reportId, serverId },
          data: { status: "RESOLVED", resolvedById: profile.id, resolvedAt: new Date() },
        });
      }

      await logAudit({
        action: "moderation.member.timeout",
        actorId: profile.id,
        serverId,
        targetId: target.id,
        metadata: {
          targetProfileId: target.profileId,
          expiresAt: expiresAt.toISOString(),
          reason: parsedBody.data.reason || null,
          reportId: parsedBody.data.reportId || null,
        },
      });

      return Response.json({ timeout });
    }

    const ban = await db.$transaction(async (tx) => {
      const createdBan = await tx.serverBan.upsert({
        where: { serverId_profileId: { serverId, profileId: target.profileId } },
        create: {
          serverId,
          profileId: target.profileId,
          moderatorId: actor.id,
          moderatorProfileId: profile.id,
          reason: parsedBody.data.reason || null,
        },
        update: {
          revokedAt: null,
          expiresAt: null,
          moderatorId: actor.id,
          moderatorProfileId: profile.id,
          reason: parsedBody.data.reason || null,
        },
      });

      if (parsedBody.data.reportId) {
        await tx.moderationReport.updateMany({
          where: { id: parsedBody.data.reportId, serverId },
          data: { status: "RESOLVED", resolvedById: profile.id, resolvedAt: new Date() },
        });
      }

      await tx.member.delete({ where: { id: target.id } });
      return createdBan;
    });

    await logAudit({
      action: "moderation.member.ban",
      actorId: profile.id,
      serverId,
      targetId: target.id,
      metadata: {
        targetProfileId: target.profileId,
        reason: parsedBody.data.reason || null,
        reportId: parsedBody.data.reportId || null,
      },
    });

    return Response.json({ ban });
  } catch (error) {
    console.log("[MEMBER_MODERATION_PATCH]", error);
    return apiError("Internal Error", 500);
  }
}
