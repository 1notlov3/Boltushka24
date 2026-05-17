import { z } from "zod";

import { apiError, forbidden, notFound, unauthorized, validationError } from "@/lib/api-response";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { canManageChannels } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  categoryId: z.string().uuid("Invalid category ID"),
});

const BodySchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  position: z.number().int().min(0).optional(),
});

async function getCategoryAccess(profileId: string, categoryId: string) {
  const category = await db.channelCategory.findFirst({
    where: { id: categoryId },
    select: { id: true, serverId: true },
  });
  if (!category) return null;

  const member = await db.member.findFirst({
    where: { profileId, serverId: category.serverId },
    include: {
      serverRoles: {
        include: {
          role: {
            select: { permissions: true },
          },
        },
      },
    },
  });

  return { category, member };
}

export async function PATCH(req: Request, context: { params: Promise<{ categoryId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const params = await context.params;
    const parsedParams = ParamsSchema.safeParse(params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const parsedBody = BodySchema.safeParse(await req.json());
    if (!parsedBody.success) return validationError(parsedBody.error);

    const access = await getCategoryAccess(profile.id, parsedParams.data.categoryId);
    if (!access) return notFound("Category not found");
    if (!access.member) return unauthorized();
    if (!canManageChannels(access.member)) return forbidden();

    const category = await db.channelCategory.update({
      where: { id: access.category.id },
      data: parsedBody.data,
    });

    await db.auditLog.create({
      data: {
        action: "channel_category.update",
        actorId: profile.id,
        serverId: access.category.serverId,
        targetId: category.id,
        metadata: parsedBody.data,
      },
    });

    return Response.json(category);
  } catch (error) {
    console.log("[CHANNEL_CATEGORY_PATCH]", error);
    return apiError("Internal Error", 500);
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ categoryId: string }> }) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const params = await context.params;
    const parsedParams = ParamsSchema.safeParse(params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const access = await getCategoryAccess(profile.id, parsedParams.data.categoryId);
    if (!access) return notFound("Category not found");
    if (!access.member) return unauthorized();
    if (!canManageChannels(access.member)) return forbidden();

    await db.channel.updateMany({
      where: { categoryId: access.category.id },
      data: { categoryId: null },
    });

    const deleted = await db.channelCategory.delete({ where: { id: access.category.id } });

    await db.auditLog.create({
      data: {
        action: "channel_category.delete",
        actorId: profile.id,
        serverId: access.category.serverId,
        targetId: deleted.id,
        metadata: { name: deleted.name },
      },
    });

    return Response.json(deleted);
  } catch (error) {
    console.log("[CHANNEL_CATEGORY_DELETE]", error);
    return apiError("Internal Error", 500);
  }
}
