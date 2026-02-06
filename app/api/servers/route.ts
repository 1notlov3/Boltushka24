import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";
import { MemberRole } from "@prisma/client";
import { z } from "zod";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { serverIconDataUri } from "@/lib/server-icon";

const ImageUrlSchema = z
  .string()
  .min(1)
  .refine(
    (v) => v.startsWith("data:image/") || /^https?:\/\//.test(v),
    "imageUrl must be an http(s) URL or a data:image/* URI"
  );

const CreateServerSchema = z.object({
  name: z.string().min(1).max(100),
  imageUrl: ImageUrlSchema.optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const validationResult = CreateServerSchema.safeParse({
      ...body,
      imageUrl: body.imageUrl || undefined
    });

    if (!validationResult.success) {
      return new NextResponse("Validation Error", { status: 400 });
    }

    const { name } = validationResult.data;
    const imageUrl = validationResult.data.imageUrl || serverIconDataUri(name);

    const server = await db.server.create({
      data: {
        profileId: profile.id,
        name,
        imageUrl,
        inviteCode: uuidv4(),
        channels: {
          create: [{ name: "основной", profileId: profile.id }],
        },
        members: {
          create: [{ profileId: profile.id, role: MemberRole.ADMIN }],
        },
      },
    });

    return NextResponse.json(server);
  } catch (error) {
    console.log("[SERVERS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
