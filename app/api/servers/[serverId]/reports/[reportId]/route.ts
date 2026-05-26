import { ModerationReportStatus } from "@prisma/client";
import { z } from "zod";

import { apiError, unauthorized, validationError } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { canManageModeration } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  serverId: z.string().uuid("Invalid server ID"),
  reportId: z.string().uuid("Invalid report ID"),
});

const PatchSchema = z.object({
  status: z.enum([ModerationReportStatus.RESOLVED, ModerationReportStatus.DISMISSED]),
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

export async function PATCH(req: Request, context: { params: Promise<{ serverId: string; reportId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const parsedBody = PatchSchema.safeParse(await req.json());
    if (!parsedBody.success) return validationError(parsedBody.error);

    const { serverId, reportId } = parsedParams.data;
    const moderator = await requireModerator(serverId, profile.id);
    if (!moderator) return unauthorized();

    const report = await db.moderationReport.update({
      where: { id: reportId, serverId },
      data: {
        status: parsedBody.data.status,
        resolvedById: profile.id,
        resolvedAt: new Date(),
      },
    });

    await logAudit({
      action: parsedBody.data.status === ModerationReportStatus.RESOLVED
        ? "moderation.report.resolve"
        : "moderation.report.dismiss",
      actorId: profile.id,
      serverId,
      targetId: report.id,
      metadata: {
        messageId: report.messageId,
        targetMemberId: report.targetMemberId,
      },
    });

    return Response.json(report);
  } catch (error) {
    console.log("[MODERATION_REPORT_PATCH]", error);
    return apiError("Internal Error", 500);
  }
}
