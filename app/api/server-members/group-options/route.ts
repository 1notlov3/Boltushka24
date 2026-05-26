import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const profile = await currentProfile();
  if (!profile) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const serverId = searchParams.get("serverId");

  if (!serverId) {
    return Response.json({ error: "Server ID missing" }, { status: 400 });
  }

  const currentMember = await db.member.findFirst({
    where: {
      serverId,
      profileId: profile.id,
    },
    select: {
      id: true,
    },
  });

  if (!currentMember) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const members = await db.member.findMany({
    where: {
      serverId,
      id: { not: currentMember.id },
    },
    select: {
      id: true,
      role: true,
      profile: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
        },
      },
    },
    orderBy: [
      { role: "asc" },
      { createdAt: "asc" },
      { id: "asc" },
    ],
    take: 100,
  });

  return Response.json({
    currentMemberId: currentMember.id,
    members: members.map((member) => ({
      id: member.id,
      profileId: member.profile.id,
      name: member.profile.name,
      imageUrl: member.profile.imageUrl,
      role: member.role,
    })),
  });
}
