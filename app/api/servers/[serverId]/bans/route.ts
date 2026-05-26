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
  active: z.enum(["true", "false"]).optional().default("true"),
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

export async function GET(req: Request, context: { params: Promise<{ serverId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const { searchParams } = new URL(req.url);
    const parsedQuery = QuerySchema.safeParse({
      active: searchParams.get("active") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    if (!parsedQuery.success) return validationError(parsedQuery.error);

    const { serverId } = parsedParams.data;
    const moderator = await requireModerator(serverId, profile.id);
    if (!moderator) return unauthorized();

    const now = new Date();
    const activeOnly = parsedQuery.data.active === "true";

    const bans = await db.serverBan.findMany({
      where: {
        serverId,
        ...(activeOnly ? {
          revokedAt: null,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
          ],
        } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: parsedQuery.data.limit,
      select: {
        id: true,
        reason: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
        updatedAt: true,
        profile: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
        moderatorProfile: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
      },
    });

    return Response.json({ items: bans });
  } catch (error) {
    console.log("[SERVER_BANS_GET]", error);
    return apiError("Internal Error", 500);
  }
}
