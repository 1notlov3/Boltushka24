import { NextResponse } from "next/server";
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

const UpdateServerSchema = z.object({
  name: z.string().min(1).max(100),
  imageUrl: ImageUrlSchema.optional(),
});

export async function DELETE(
  req: Request,
  { params }: { params: { serverId: string } }
) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const server = await db.server.delete({
      where: {
        id: params.serverId,
        profileId: profile.id,
      }
    });

    return NextResponse.json(server);
  } catch (error) {
    console.log("[SERVER_ID_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}


export async function PATCH(
  req: Request,
  { params }: { params: { serverId: string } }
) {
  try {
    const profile = await currentProfile();
    const body = await req.json();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const validationResult = UpdateServerSchema.safeParse(body);

    if (!validationResult.success) {
      return new NextResponse("Validation Error", { status: 400 });
    }

    const { name } = validationResult.data;
    const imageUrl = validationResult.data.imageUrl || serverIconDataUri(name);

    const server = await db.server.update({
      where: {
        id: params.serverId,
        profileId: profile.id,
      },
      data: {
        name,
        imageUrl,
      },
    });

    return NextResponse.json(server);
  } catch (error) {
    console.log("[SERVER_ID_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
