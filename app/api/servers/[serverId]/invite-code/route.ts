import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";
import { z } from "zod";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  serverId: z.string().uuid(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ serverId: string }> }
) {
  try {
    const params = await context.params;
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.serverId) {
      return new NextResponse("Server ID Missing", { status: 400 });
    }

    const paramsValidation = ParamsSchema.safeParse(params);

    if (!paramsValidation.success) {
      return new NextResponse("Invalid Server ID", { status: 400 });
    }

    const server = await db.server.update({
      where: {
        id: params.serverId,
        profileId: profile.id,
      },
      data: {
        inviteCode: uuidv4(),
      },
    });

    return NextResponse.json(server);
  } catch (error) {
    console.log("[SERVER_ID]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
