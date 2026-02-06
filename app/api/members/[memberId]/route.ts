import { NextResponse } from "next/server";
import { MemberRole } from "@prisma/client";
import { z } from "zod";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

const UpdateMemberSchema = z.object({
  role: z.nativeEnum(MemberRole),
});

const ParamsSchema = z.object({
  memberId: z.string().uuid("Invalid Member ID"),
});

const QuerySchema = z.object({
  serverId: z.string().uuid("Invalid Server ID"),
});

export async function DELETE(
  req: Request,
  { params }: { params: { memberId: string } }
) {
  try {
    const profile = await currentProfile();
    const { searchParams } = new URL(req.url);

    const serverId = searchParams.get("serverId");

    if (!profile) {
      return new NextResponse("Unauthorized" ,{ status: 401 });
    }

    if (!serverId) {
      return new NextResponse("Server ID missing", { status: 400 });
    }

    if (!params.memberId) {
      return new NextResponse("Member ID missing", { status: 400 });
    }

    const paramsValidation = ParamsSchema.safeParse(params);
    const queryValidation = QuerySchema.safeParse({ serverId });

    if (!paramsValidation.success) {
      return new NextResponse(paramsValidation.error.errors[0].message, { status: 400 });
    }

    if (!queryValidation.success) {
      return new NextResponse(queryValidation.error.errors[0].message, { status: 400 });
    }

    const server = await db.server.update({
      where: {
        id: serverId,
        profileId: profile.id,
      },
      data: {
        members: {
          deleteMany: {
            id: params.memberId,
            profileId: {
              not: profile.id
            }
          }
        }
      },
      include: {
        members: {
          include: {
            profile: true,
          },
          orderBy: {
            role: "asc",
          }
        },
      },
    });

    return NextResponse.json(server);
  } catch (error) {
    console.log("[MEMBER_ID_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { memberId: string } }
) {
  try {
    const profile = await currentProfile();
    const { searchParams } = new URL(req.url);
    const body = await req.json();

    const serverId = searchParams.get("serverId");

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const validationResult = UpdateMemberSchema.safeParse(body);

    if (!validationResult.success) {
      return new NextResponse(validationResult.error.errors[0].message, { status: 400 });
    }

    const { role } = validationResult.data;

    if (!serverId) {
      return new NextResponse("Server ID missing", { status: 400 });
    }

    if (!params.memberId) {
      return new NextResponse("Member ID missing", { status: 400 });
    }

    const paramsValidation = ParamsSchema.safeParse(params);
    const queryValidation = QuerySchema.safeParse({ serverId });

    if (!paramsValidation.success) {
      return new NextResponse(paramsValidation.error.errors[0].message, { status: 400 });
    }

    if (!queryValidation.success) {
      return new NextResponse(queryValidation.error.errors[0].message, { status: 400 });
    }

    const server = await db.server.update({
      where: {
        id: serverId,
        profileId: profile.id,
      },
      data: {
        members: {
          update: {
            where: {
              id: params.memberId,
              profileId: {
                not: profile.id
              }
            },
            data: {
              role
            }
          }
        }
      },
      include: {
        members: {
          include: {
            profile: true,
          },
          orderBy: {
            role: "asc"
          }
        }
      }
    });

    return NextResponse.json(server);
  } catch (error) {
    console.log("[MEMBERS_ID_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}