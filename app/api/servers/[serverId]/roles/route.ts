import { z } from "zod";

import { apiError, unauthorized, validationError } from "@/lib/api-response";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { ALL_PERMISSIONS, canManageMembers, type Permission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const permissions: Permission[] = ALL_PERMISSIONS;

const ParamsSchema = z.object({
  serverId: z.string().uuid("Invalid server ID"),
});

const RoleSchema = z.object({
  roleId: z.string().uuid("Invalid role ID").optional(),
  name: z.string().trim().min(1).max(40).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  permissions: z.array(z.enum(permissions as [Permission, ...Permission[]])).optional(),
  position: z.number().int().min(0).optional(),
});

async function requireManager(serverId: string) {
  const profile = await currentProfile();
  if (!profile) return null;

  const member = await db.member.findFirst({
    where: {
      serverId,
      profileId: profile.id,
    },
    include: {
      serverRoles: {
        include: {
          role: {
            select: {
              permissions: true,
            },
          },
        },
      },
    },
  });

  if (!member || !canManageMembers(member)) return null;
  return { profile, member };
}

export async function GET(_req: Request, context: { params: Promise<{ serverId: string }> }) {
  try {
    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const access = await requireManager(parsedParams.data.serverId);
    if (!access) return unauthorized();

    const roles = await db.serverRole.findMany({
      where: { serverId: parsedParams.data.serverId },
      orderBy: [
        { position: "asc" },
        { createdAt: "asc" },
      ],
    });

    return Response.json({ items: roles, permissions });
  } catch (error) {
    console.log("[SERVER_ROLES_GET]", error);
    return apiError("Internal Error", 500);
  }
}

export async function POST(req: Request, context: { params: Promise<{ serverId: string }> }) {
  try {
    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const access = await requireManager(parsedParams.data.serverId);
    if (!access) return unauthorized();

    const parsed = RoleSchema.required({ name: true }).safeParse(await req.json());
    if (!parsed.success) return validationError(parsed.error);

    const role = await db.serverRole.create({
      data: {
        serverId: parsedParams.data.serverId,
        name: parsed.data.name,
        color: parsed.data.color ?? "#6366f1",
        permissions: parsed.data.permissions ?? ["message.create", "message.react"],
        position: parsed.data.position ?? 0,
      },
    });

    return Response.json(role);
  } catch (error) {
    console.log("[SERVER_ROLES_POST]", error);
    return apiError("Internal Error", 500);
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ serverId: string }> }) {
  try {
    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const access = await requireManager(parsedParams.data.serverId);
    if (!access) return unauthorized();

    const parsed = RoleSchema.required({ roleId: true }).safeParse(await req.json());
    if (!parsed.success) return validationError(parsed.error);

    const role = await db.serverRole.update({
      where: {
        id: parsed.data.roleId,
        serverId: parsedParams.data.serverId,
      },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.color !== undefined ? { color: parsed.data.color } : {}),
        ...(parsed.data.permissions !== undefined ? { permissions: parsed.data.permissions } : {}),
        ...(parsed.data.position !== undefined ? { position: parsed.data.position } : {}),
      },
    });

    return Response.json(role);
  } catch (error) {
    console.log("[SERVER_ROLES_PATCH]", error);
    return apiError("Internal Error", 500);
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ serverId: string }> }) {
  try {
    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationError(parsedParams.error);

    const access = await requireManager(parsedParams.data.serverId);
    if (!access) return unauthorized();

    const parsed = RoleSchema.pick({ roleId: true }).required().safeParse(await req.json());
    if (!parsed.success) return validationError(parsed.error);

    await db.serverRole.delete({
      where: {
        id: parsed.data.roleId,
        serverId: parsedParams.data.serverId,
      },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.log("[SERVER_ROLES_DELETE]", error);
    return apiError("Internal Error", 500);
  }
}
