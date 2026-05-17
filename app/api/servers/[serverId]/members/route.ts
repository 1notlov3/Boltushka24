import { z } from "zod";

import { apiError, unauthorized, validationError } from "@/lib/api-response";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  serverId: z.string().uuid("Invalid Server ID"),
});

const QuerySchema = z.object({
  q: z.string().trim().max(80).optional().default(""),
  ids: z.string().trim().optional(),
});

export async function GET(req: Request, context: { params: Promise<{ serverId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const { searchParams } = new URL(req.url);
    const parsedQuery = QuerySchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      ids: searchParams.get("ids") ?? undefined,
    });
    if (!parsedQuery.success) return validationError(parsedQuery.error);

    const member = await db.member.findFirst({
      where: {
        serverId: parsedParams.data.serverId,
        profileId: profile.id,
      },
      select: { id: true },
    });

    if (!member) return unauthorized();

    const ids = parsedQuery.data.ids
      ?.split(",")
      .map((id) => id.trim())
      .filter((id) => z.string().uuid().safeParse(id).success) ?? [];

    const members = await db.member.findMany({
      take: ids.length ? 100 : 8,
      where: {
        serverId: parsedParams.data.serverId,
        ...(ids.length
          ? { id: { in: ids } }
          : parsedQuery.data.q
            ? { profile: { name: { contains: parsedQuery.data.q, mode: "insensitive" } } }
            : {}),
      },
      select: {
        id: true,
        profile: {
          select: {
            name: true,
            imageUrl: true,
          },
        },
      },
      orderBy: [
        { role: "asc" },
        { createdAt: "asc" },
      ],
    });

    return Response.json({
      items: members.map((item) => ({
        id: item.id,
        name: item.profile.name,
        imageUrl: item.profile.imageUrl,
      })),
    });
  } catch (error) {
    console.log("[SERVER_MEMBERS_GET]", error);
    return apiError("Internal Error", 500);
  }
}
