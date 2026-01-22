import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";
import { MemberRole } from "@prisma/client";
import * as z from "zod";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

const createServerSchema = z.object({
  name: z.string().min(1, {
    message: "Server name is required."
  }),
  imageUrl: z.string().url({
    message: "Server image is required."
  })
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const response = createServerSchema.safeParse(json);

    if (!response.success) {
      return new NextResponse(response.error.errors[0].message, { status: 400 });
    }

    const { name, imageUrl } = response.data;
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const server = await db.server.create({
      data: {
        profileId: profile.id,
        name,
        imageUrl,
        inviteCode: uuidv4(),
        channels: {
          create: [
            { name: "основной", profileId: profile.id }
          ]
        },
        members: {
          create: [
            { profileId: profile.id, role: MemberRole.ADMIN }
          ]
        }
      }
    });

    return NextResponse.json(server);
  } catch (error) {
    console.log("[SERVERS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}