import { NextResponse } from "next/server";
import { MemberRole, ChannelType } from "@prisma/client";
import { z } from "zod";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

const CreateChannelSchema = z.object({
  name: z.string().min(1, {
    message: "Channel name is required",
  }).max(100, {
    message: "Channel name cannot be longer than 100 characters",
  }).refine((name) => name !== "основной", {
    message: "Name cannot be 'основной'",
  }),
  type: z.nativeEnum(ChannelType),
});

export async function POST(
  req: Request
) {
  try {
    const profile = await currentProfile();
    const { name, type } = await req.json();
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

    const validationResult = CreateChannelSchema.safeParse({ name, type });

    if (!validationResult.success) {
      return new NextResponse(validationResult.error.errors[0].message, { status: 400 });
    }

    const server = await db.server.update({
      where: {
        id: serverId,
        members: {
          some: {
            profileId: profile.id,
            role: {
              in: [MemberRole.ADMIN, MemberRole.MODERATOR]
            }
          }
        }
      },
      data: {
        channels: {
          create: {
            profileId: profile.id,
            name,
            type,
          }
        }
      }
    });

    return NextResponse.json(server);
  } catch (error) {
    console.log("CHANNELS_POST", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
