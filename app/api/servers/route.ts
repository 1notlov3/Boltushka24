import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";
import { MemberRole } from "@prisma/client";
import { z } from "zod";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { serverIconDataUri } from "@/lib/server-icon";
import { normalizeServerDescription } from "@/lib/discovery";

export const dynamic = "force-dynamic";

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
  description: z.string().trim().max(500).optional().nullable(),
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
      return NextResponse.json(
        { error: "Validation Error", issues: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name } = validationResult.data;
    const imageUrl = validationResult.data.imageUrl || serverIconDataUri(name);
    const description = normalizeServerDescription(validationResult.data.description);

    const server = await db.server.create({
      data: {
        profileId: profile.id,
        name,
        imageUrl,
        description,
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
