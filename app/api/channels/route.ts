import { NextResponse } from "next/server";
import { ChannelType } from "@prisma/client";
import { z } from "zod";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { canManageChannels } from "@/lib/permissions";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const CreateChannelSchema = z.object({
  name: z.string().min(1, {
    message: "Channel name is required",
  }).max(100, {
    message: "Channel name cannot be longer than 100 characters",
  }).refine((name) => name !== "основной", {
    message: "Name cannot be 'основной'",
  }),
  type: z.nativeEnum(ChannelType),
  topic: z.string().trim().max(300).optional().nullable(),
  icon: z.string().trim().max(32).optional().nullable(),
  categoryId: z.string().uuid("Invalid category ID").optional().nullable(),
  position: z.number().int().min(0).optional(),
  slowModeSeconds: z.number().int().min(0).max(21_600).optional(),
});

export async function POST(
  req: Request
) {
  try {
    const profile = await currentProfile();
    const body = await req.json();
    const { searchParams } = new URL(req.url);

    const serverId = searchParams.get("serverId");

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!serverId) {
      return new NextResponse("Server ID missing", { status: 400 });
    }

    const serverIdValidation = z.string().uuid().safeParse(serverId);
    if (!serverIdValidation.success) {
      return new NextResponse("Invalid Server ID", { status: 400 });
    }

    const validationResult = CreateChannelSchema.safeParse(body);

    if (!validationResult.success) {
      return new NextResponse(validationResult.error.errors[0].message, { status: 400 });
    }

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

    if (!member) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!canManageChannels(member)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const limit = await checkRateLimit({
      key: rateLimitKey("channel:create", profile.id, serverId),
      limit: 20,
      windowMs: 60_000,
    });

    if (!limit.ok) {
      return new NextResponse(`Too many channels. Retry in ${limit.retryAfterSeconds}s`, { status: 429 });
    }

    const { name, type, topic, icon, categoryId, position, slowModeSeconds } = validationResult.data;

    if (categoryId) {
      const category = await db.channelCategory.findFirst({
        where: { id: categoryId, serverId },
        select: { id: true },
      });

      if (!category) {
        return new NextResponse("Category not found", { status: 404 });
      }
    }

    const server = await db.server.update({
      where: { id: serverId },
      data: {
        channels: {
          create: {
            profileId: profile.id,
            name,
            type,
            topic: topic || null,
            icon: icon || null,
            categoryId: categoryId || null,
            position: position ?? 0,
            slowModeSeconds: slowModeSeconds ?? 0,
          }
        },
        auditLogs: {
          create: {
            action: "channel.create",
            actorId: profile.id,
            metadata: { name, type, categoryId, slowModeSeconds },
          },
        },
      },
    });

    return NextResponse.json(server);
  } catch (error) {
    console.log("CHANNELS_POST", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
