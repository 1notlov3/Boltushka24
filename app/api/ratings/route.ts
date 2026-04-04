import { NextResponse } from "next/server";

import { z } from "zod";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

type CounterMap = Record<string, number>;
type LastActiveMap = Record<string, Date | null>;

const toCountMap = <T extends { memberId: string; _count: { _all: number } }>(rows: T[]): CounterMap => {
  return rows.reduce<CounterMap>((acc, row) => {
    acc[row.memberId] = row._count._all;
    return acc;
  }, {});
};

const toLastActiveMap = <T extends { memberId: string; _max: { createdAt: Date | null } }>(rows: T[]): LastActiveMap => {
  return rows.reduce<LastActiveMap>((acc, row) => {
    acc[row.memberId] = row._max.createdAt;
    return acc;
  }, {});
};

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
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

    const membership = await db.member.findFirst({
      where: {
        serverId,
        profileId: profile.id,
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const members = await db.member.findMany({
      where: { serverId },
      include: {
        profile: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
        _count: {
          select: {
            messages: true,
            directMessages: true,
          },
        },
      },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      recentMessages,
      recentDirectMessages,
      lastMessageActivity,
      lastDirectMessageActivity,
    ] = await Promise.all([
      db.message.groupBy({
        by: ["memberId"],
        where: {
          deleted: false,
          createdAt: { gte: thirtyDaysAgo },
          member: { serverId },
        },
        _count: { _all: true },
      }),
      db.directMessage.groupBy({
        by: ["memberId"],
        where: {
          deleted: false,
          createdAt: { gte: thirtyDaysAgo },
          member: { serverId },
        },
        _count: { _all: true },
      }),
      db.message.groupBy({
        by: ["memberId"],
        where: {
          deleted: false,
          member: { serverId },
        },
        _max: { createdAt: true },
      }),
      db.directMessage.groupBy({
        by: ["memberId"],
        where: {
          deleted: false,
          member: { serverId },
        },
        _max: { createdAt: true },
      }),
    ]);

    const recentMessagesMap = toCountMap(recentMessages);
    const recentDirectMessagesMap = toCountMap(recentDirectMessages);
    const lastMessageMap = toLastActiveMap(lastMessageActivity);
    const lastDirectMessageMap = toLastActiveMap(lastDirectMessageActivity);

    const leaderboard = members
      .map((member) => {
        const totalMessages = member._count.messages;
        const totalDirectMessages = member._count.directMessages;
        const recentMsg = recentMessagesMap[member.id] ?? 0;
        const recentDm = recentDirectMessagesMap[member.id] ?? 0;

        // Прозрачная формула:
        // - обычные сообщения: 1 очко
        // - личные сообщения: 1.2 очка
        // - активность за 30 дней: +60%
        const baseScore = totalMessages + totalDirectMessages * 1.2;
        const recentScore = recentMsg * 0.6 + recentDm * 0.9;
        const ratingScore = Number((baseScore + recentScore).toFixed(2));

        const lastMessage = lastMessageMap[member.id];
        const lastDm = lastDirectMessageMap[member.id];
        const lastActiveAt = [lastMessage, lastDm]
          .filter((d): d is Date => Boolean(d))
          .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

        return {
          memberId: member.id,
          profileId: member.profile.id,
          name: member.profile.name,
          imageUrl: member.profile.imageUrl,
          role: member.role,
          totalMessages,
          totalDirectMessages,
          recentActivity: recentMsg + recentDm,
          ratingScore,
          lastActiveAt,
        };
      })
      .sort((a, b) => b.ratingScore - a.ratingScore)
      .map((user, index) => ({
        ...user,
        rank: index + 1,
      }));

    return NextResponse.json({
      items: leaderboard,
      formula: {
        base: "messages * 1 + directMessages * 1.2",
        recentBonus: "messages30d * 0.6 + directMessages30d * 0.9",
      },
    });
  } catch (error) {
    console.log("[RATINGS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
