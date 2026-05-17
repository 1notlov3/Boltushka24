import type { Prisma } from "@prisma/client";

const memberWithProfile = {
  select: {
    id: true,
    role: true,
    profileId: true,
    profile: {
      select: {
        id: true,
        name: true,
        imageUrl: true,
      },
    },
  },
} satisfies Prisma.MemberDefaultArgs;

export function channelMessageInclude(currentMemberId: string) {
  return {
    member: memberWithProfile,
    reactions: {
      select: {
        id: true,
        emoji: true,
        memberId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    },
    savedBy: {
      where: {
        memberId: currentMemberId,
      },
      select: {
        id: true,
      },
    },
    parentMessage: {
      select: {
        id: true,
        content: true,
        deleted: true,
        member: memberWithProfile,
      },
    },
    _count: {
      select: {
        replies: true,
      },
    },
  } satisfies Prisma.MessageInclude;
}

export function directMessageInclude(currentMemberId: string) {
  return {
    member: memberWithProfile,
    reactions: {
      select: {
        id: true,
        emoji: true,
        memberId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    },
    savedBy: {
      where: {
        memberId: currentMemberId,
      },
      select: {
        id: true,
      },
    },
    parentDirectMessage: {
      select: {
        id: true,
        content: true,
        deleted: true,
        member: memberWithProfile,
      },
    },
    _count: {
      select: {
        replies: true,
      },
    },
  } satisfies Prisma.DirectMessageInclude;
}
