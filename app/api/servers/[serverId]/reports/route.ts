import { MemberRole, ModerationReportReason, ModerationReportStatus } from "@prisma/client";
import { z } from "zod";

import { apiError, rateLimitError, unauthorized, validationError } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { canManageModeration } from "@/lib/permissions";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  serverId: z.string().uuid("Invalid server ID"),
});

const ReportCreateSchema = z.object({
  reason: z.nativeEnum(ModerationReportReason),
  comment: z.string().trim().max(1000).optional().nullable(),
  messageId: z.string().uuid().optional().nullable(),
  targetMemberId: z.string().uuid().optional().nullable(),
}).refine((value) => value.messageId || value.targetMemberId, {
  message: "Message or target member is required",
});

const QuerySchema = z.object({
  status: z.nativeEnum(ModerationReportStatus).optional().default(ModerationReportStatus.OPEN),
});

async function getCurrentMember(serverId: string, profileId: string) {
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

export async function GET(req: Request, context: { params: Promise<{ serverId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const { searchParams } = new URL(req.url);
    const parsedQuery = QuerySchema.safeParse({ status: searchParams.get("status") ?? undefined });
    if (!parsedQuery.success) return validationError(parsedQuery.error);

    const member = await getCurrentMember(parsedParams.data.serverId, profile.id);
    if (!member || !canManageModeration(member)) return unauthorized();

    const reports = await db.moderationReport.findMany({
      where: {
        serverId: parsedParams.data.serverId,
        status: parsedQuery.data.status,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        reporterMember: { include: { profile: true } },
        targetMember: { include: { profile: true } },
        message: {
          include: {
            member: { include: { profile: true } },
            channel: { select: { id: true, name: true } },
          },
        },
        resolvedBy: { select: { id: true, name: true, imageUrl: true } },
      },
    });

    return Response.json({ items: reports });
  } catch (error) {
    console.log("[MODERATION_REPORTS_GET]", error);
    return apiError("Internal Error", 500);
  }
}

export async function POST(req: Request, context: { params: Promise<{ serverId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const parsedBody = ReportCreateSchema.safeParse(await req.json());
    if (!parsedBody.success) return validationError(parsedBody.error);

    const { serverId } = parsedParams.data;
    const member = await getCurrentMember(serverId, profile.id);
    if (!member) return unauthorized();

    const limit = await checkRateLimit({
      key: rateLimitKey("moderation:report", profile.id, serverId),
      limit: 5,
      windowMs: 10 * 60_000,
    });
    if (!limit.ok) return rateLimitError(limit.retryAfterSeconds, "Слишком много жалоб");

    let targetMemberId = parsedBody.data.targetMemberId ?? null;
    let messageId = parsedBody.data.messageId ?? null;

    if (messageId) {
      const message = await db.message.findFirst({
        where: { id: messageId, channel: { serverId } },
        select: { id: true, memberId: true, deleted: true },
      });
      if (!message || message.deleted) return apiError("Message not found", 404);
      targetMemberId = targetMemberId ?? message.memberId;
    }

    if (targetMemberId) {
      const target = await db.member.findFirst({
        where: { id: targetMemberId, serverId },
        select: { id: true },
      });
      if (!target) return apiError("Target member not found", 404);
      if (target.id === member.id) return apiError("You cannot report yourself", 400);
    }

    const report = await db.moderationReport.create({
      data: {
        serverId,
        reporterMemberId: member.id,
        targetMemberId,
        messageId,
        reason: parsedBody.data.reason,
        comment: parsedBody.data.comment || null,
      },
    });

    await logAudit({
      action: "moderation.report.create",
      actorId: profile.id,
      serverId,
      targetId: report.id,
      metadata: {
        reason: report.reason,
        messageId,
        targetMemberId,
      },
    });

    return Response.json(report);
  } catch (error) {
    console.log("[MODERATION_REPORTS_POST]", error);
    return apiError("Internal Error", 500);
  }
}
