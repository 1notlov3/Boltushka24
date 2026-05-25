import { NextResponse } from "next/server";
import { z } from "zod";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  memberId: z.string().uuid("Invalid Member ID"),
});

const QuerySchema = z.object({
  serverId: z.string().uuid("Invalid Server ID"),
});

export async function GET(
  req: Request,
  context: { params: Promise<{ memberId: string }> }
) {
  try {
    const params = await context.params;
    const profile = await currentProfile();
    const { searchParams } = new URL(req.url);

    const serverId = searchParams.get("serverId");

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!serverId) {
      return NextResponse.json(
        { error: "Server ID missing" },
        { status: 400 }
      );
    }

    const paramsValidation = ParamsSchema.safeParse(params);
    const queryValidation = QuerySchema.safeParse({ serverId });

    if (!paramsValidation.success) {
      return NextResponse.json(
        { error: paramsValidation.error.errors[0].message },
        { status: 400 }
      );
    }

    if (!queryValidation.success) {
      return NextResponse.json(
        { error: queryValidation.error.errors[0].message },
        { status: 400 }
      );
    }

    // Verify requester is a member of this server
    const requesterMember = await db.member.findFirst({
      where: {
        serverId,
        profileId: profile.id,
      },
      select: { id: true },
    });

    if (!requesterMember) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const member = await db.member.findFirst({
      where: {
        id: paramsValidation.data.memberId,
        serverId,
      },
      select: {
        id: true,
        role: true,
        createdAt: true,
        profile: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            email: true,
            status: true,
            customStatus: true,
            lastSeenAt: true,
            createdAt: true,
          },
        },
        serverRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
          orderBy: {
            role: {
              position: "asc",
            },
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: member.id,
      role: member.role,
      joinedAt: member.createdAt,
      profile: {
        id: member.profile.id,
        name: member.profile.name,
        imageUrl: member.profile.imageUrl,
        status: member.profile.status,
        customStatus: member.profile.customStatus,
        lastSeenAt: member.profile.lastSeenAt,
        createdAt: member.profile.createdAt,
      },
      roles: member.serverRoles.map((sr) => ({
        id: sr.role.id,
        name: sr.role.name,
        color: sr.role.color,
      })),
    });
  } catch (error) {
    console.log("[MEMBER_PROFILE_GET]", error);
    return NextResponse.json(
      { error: "Internal Error" },
      { status: 500 }
    );
  }
}
