import { z } from "zod";

import { apiError, unauthorized, validationError } from "@/lib/api-response";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { canManageModeration } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  serverId: z.string().uuid("Invalid server ID"),
});

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
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

function sanitizeMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;

  const allowedKeys = [
    "reason",
    "expiresAt",
    "targetMemberId",
    "targetProfileId",
    "messageId",
    "durationSeconds",
    "reportId",
    "emoji",
    "name",
    "type",
  ];

  return Object.fromEntries(
    Object.entries(value).filter(([key]) => allowedKeys.includes(key)),
  );
}

export async function GET(req: Request, context: { params: Promise<{ serverId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const { searchParams } = new URL(req.url);
    const parsedQuery = QuerySchema.safeParse({ limit: searchParams.get("limit") ?? undefined });
    if (!parsedQuery.success) return validationError(parsedQuery.error);

    const { serverId } = parsedParams.data;
    const moderator = await requireModerator(serverId, profile.id);
    if (!moderator) return unauthorized();

    const logs = await db.auditLog.findMany({
      where: { serverId },
      orderBy: { createdAt: "desc" },
      take: parsedQuery.data.limit,
      select: {
        id: true,
        action: true,
        targetId: true,
        metadata: true,
        createdAt: true,
        actor: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
      },
    });

    return Response.json({
      items: logs.map((log) => ({
        ...log,
        metadata: sanitizeMetadata(log.metadata),
      })),
    });
  } catch (error) {
    console.log("[SERVER_AUDIT_LOG_GET]", error);
    return apiError("Internal Error", 500);
  }
}
