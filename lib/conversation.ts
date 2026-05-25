import { ConversationParticipantRole, ConversationType } from "@prisma/client";

import { db } from "@/lib/db";

export const conversationParticipantInclude = {
  member: {
    include: {
      profile: true,
      server: true,
      serverRoles: {
        include: {
          role: true,
        },
      },
    },
  },
} as const;

export const conversationAccessInclude = {
  memberOne: {
    include: {
      profile: true,
      server: true,
    },
  },
  memberTwo: {
    include: {
      profile: true,
      server: true,
    },
  },
  participants: {
    where: {
      leftAt: null,
    },
    include: conversationParticipantInclude,
  },
} as const;

export const getOrCreateConversation = async (memberOneId: string, memberTwoId: string) => {
  return getOrCreateDirectConversation({ memberOneId, memberTwoId });
};

export const getOrCreateDirectConversation = async ({
  memberOneId,
  memberTwoId,
}: {
  memberOneId: string;
  memberTwoId: string;
}) => {
  if (memberOneId === memberTwoId) return null;

  let conversation = await findDirectConversation({ memberOneId, memberTwoId });

  if (!conversation) {
    conversation = await createNewDirectConversation(memberOneId, memberTwoId);
  } else {
    await ensureDirectConversationParticipants(conversation.id, memberOneId, memberTwoId);
  }

  return conversation;
};

export const findDirectConversation = async ({
  memberOneId,
  memberTwoId,
}: {
  memberOneId: string;
  memberTwoId: string;
}) => {
  try {
    return await db.conversation.findFirst({
      where: {
        type: ConversationType.DIRECT,
        OR: [
          {
            AND: [
              { memberOneId },
              { memberTwoId },
            ],
          },
          {
            AND: [
              { memberOneId: memberTwoId },
              { memberTwoId: memberOneId },
            ],
          },
        ],
      },
      include: conversationAccessInclude,
    });
  } catch {
    return null;
  }
};

const createNewDirectConversation = async (memberOneId: string, memberTwoId: string) => {
  try {
    const memberOne = await db.member.findUnique({
      where: { id: memberOneId },
      select: { serverId: true },
    });

    if (!memberOne) return null;

    return await db.conversation.create({
      data: {
        type: ConversationType.DIRECT,
        memberOneId,
        memberTwoId,
        serverId: memberOne.serverId,
        participants: {
          create: [
            { memberId: memberOneId, role: ConversationParticipantRole.MEMBER },
            { memberId: memberTwoId, role: ConversationParticipantRole.MEMBER },
          ],
        },
      },
      include: conversationAccessInclude,
    });
  } catch {
    return null;
  }
};

export const ensureDirectConversationParticipants = async (
  conversationId: string,
  memberOneId: string,
  memberTwoId: string,
) => {
  await Promise.all([memberOneId, memberTwoId].map((memberId) => (
    db.conversationParticipant.upsert({
      where: {
        conversationId_memberId: {
          conversationId,
          memberId,
        },
      },
      update: {
        leftAt: null,
      },
      create: {
        conversationId,
        memberId,
        role: ConversationParticipantRole.MEMBER,
      },
    })
  )));
};

export const createGroupConversation = async ({
  ownerMemberId,
  memberIds,
  name,
  imageUrl,
}: {
  ownerMemberId: string;
  memberIds: string[];
  name: string;
  imageUrl?: string | null;
}) => {
  const uniqueMemberIds = [...new Set([ownerMemberId, ...memberIds])];
  if (uniqueMemberIds.length < 3) return null;

  const members = await db.member.findMany({
    where: { id: { in: uniqueMemberIds } },
    select: { id: true, serverId: true },
  });

  if (members.length !== uniqueMemberIds.length) return null;

  const serverIds = new Set(members.map((member) => member.serverId));
  if (serverIds.size !== 1) return null;

  const serverId = members[0]?.serverId;
  if (!serverId) return null;

  return db.conversation.create({
    data: {
      type: ConversationType.GROUP,
      name,
      imageUrl,
      serverId,
      ownerId: ownerMemberId,
      memberOneId: ownerMemberId,
      memberTwoId: uniqueMemberIds.find((memberId) => memberId !== ownerMemberId)!,
      participants: {
        create: uniqueMemberIds.map((memberId) => ({
          memberId,
          role: memberId === ownerMemberId
            ? ConversationParticipantRole.OWNER
            : ConversationParticipantRole.MEMBER,
        })),
      },
    },
    include: conversationAccessInclude,
  });
};

export const addConversationParticipants = async ({
  conversationId,
  actorMemberId,
  memberIds,
}: {
  conversationId: string;
  actorMemberId: string;
  memberIds: string[];
}) => {
  const access = await getConversationAccessByMemberId({ conversationId, memberId: actorMemberId });
  if (!access || access.conversation.type !== ConversationType.GROUP) return null;

  const actor = access.participants.find((participant) => participant.memberId === actorMemberId);
  if (!actor || actor.role === ConversationParticipantRole.MEMBER) return null;

  const uniqueMemberIds = [...new Set(memberIds)].filter((memberId) => memberId !== actorMemberId);
  if (uniqueMemberIds.length === 0) return access.conversation;

  await Promise.all(uniqueMemberIds.map((memberId) => (
    db.conversationParticipant.upsert({
      where: {
        conversationId_memberId: {
          conversationId,
          memberId,
        },
      },
      update: {
        leftAt: null,
      },
      create: {
        conversationId,
        memberId,
        role: ConversationParticipantRole.MEMBER,
      },
    })
  )));

  return db.conversation.findUnique({
    where: { id: conversationId },
    include: conversationAccessInclude,
  });
};

export const removeConversationParticipant = async ({
  conversationId,
  actorMemberId,
  memberId,
}: {
  conversationId: string;
  actorMemberId: string;
  memberId: string;
}) => {
  const access = await getConversationAccessByMemberId({ conversationId, memberId: actorMemberId });
  if (!access || access.conversation.type !== ConversationType.GROUP) return null;

  const actor = access.participants.find((participant) => participant.memberId === actorMemberId);
  const target = access.participants.find((participant) => participant.memberId === memberId);
  if (!actor || !target) return null;

  const removingSelf = actorMemberId === memberId;
  const actorCanRemoveOthers = actor.role === ConversationParticipantRole.OWNER || actor.role === ConversationParticipantRole.ADMIN;
  if (!removingSelf && !actorCanRemoveOthers) return null;

  if (target.role === ConversationParticipantRole.OWNER) {
    const ownerCount = access.participants.filter((participant) => participant.role === ConversationParticipantRole.OWNER).length;
    if (ownerCount <= 1) return null;
  }

  await db.conversationParticipant.update({
    where: {
      conversationId_memberId: {
        conversationId,
        memberId,
      },
    },
    data: {
      leftAt: new Date(),
    },
  });

  return db.conversation.findUnique({
    where: { id: conversationId },
    include: conversationAccessInclude,
  });
};

export const leaveGroupConversation = async ({
  conversationId,
  memberId,
}: {
  conversationId: string;
  memberId: string;
}) => removeConversationParticipant({ conversationId, actorMemberId: memberId, memberId });

export const getConversationAccess = async ({
  conversationId,
  profileId,
}: {
  conversationId: string;
  profileId: string;
}) => {
  const conversation = await db.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [
        { memberOne: { profileId } },
        { memberTwo: { profileId } },
        {
          participants: {
            some: {
              leftAt: null,
              member: { profileId },
            },
          },
        },
      ],
    },
    include: conversationAccessInclude,
  });

  if (!conversation) return null;

  const currentParticipant = conversation.participants.find((participant) => participant.member.profileId === profileId);
  const currentMember = currentParticipant?.member
    ?? (conversation.memberOne.profileId === profileId ? conversation.memberOne : conversation.memberTwo.profileId === profileId ? conversation.memberTwo : null);

  if (!currentMember) return null;

  return {
    conversation,
    currentMember,
    participants: conversation.participants,
    isDirect: conversation.type === ConversationType.DIRECT,
    isGroup: conversation.type === ConversationType.GROUP,
  };
};

export const getConversationAccessByMemberId = async ({
  conversationId,
  memberId,
}: {
  conversationId: string;
  memberId: string;
}) => {
  const conversation = await db.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [
        { memberOneId: memberId },
        { memberTwoId: memberId },
        {
          participants: {
            some: {
              leftAt: null,
              memberId,
            },
          },
        },
      ],
    },
    include: conversationAccessInclude,
  });

  if (!conversation) return null;

  return {
    conversation,
    currentMember: conversation.participants.find((participant) => participant.memberId === memberId)?.member
      ?? (conversation.memberOneId === memberId ? conversation.memberOne : conversation.memberTwo),
    participants: conversation.participants,
    isDirect: conversation.type === ConversationType.DIRECT,
    isGroup: conversation.type === ConversationType.GROUP,
  };
};

export const findConversationParticipants = async ({
  conversationId,
  includeLeft = false,
}: {
  conversationId: string;
  includeLeft?: boolean;
}) => db.conversationParticipant.findMany({
  where: {
    conversationId,
    ...(includeLeft ? {} : { leftAt: null }),
  },
  include: conversationParticipantInclude,
  orderBy: [
    { role: "asc" },
    { joinedAt: "asc" },
  ],
});

export const getConversationUnreadCount = async ({
  conversationId,
  memberId,
}: {
  conversationId: string;
  memberId: string;
}) => {
  const readState = await db.conversationReadState.findUnique({
    where: {
      memberId_conversationId: {
        memberId,
        conversationId,
      },
    },
    select: { lastReadAt: true },
  });

  return db.directMessage.count({
    where: {
      conversationId,
      memberId: { not: memberId },
      deleted: false,
      createdAt: { gt: readState?.lastReadAt ?? new Date(0) },
    },
  });
};

export const markConversationRead = async ({
  conversationId,
  profileId,
}: {
  conversationId: string;
  profileId: string;
}) => {
  const access = await getConversationAccess({ conversationId, profileId });
  if (!access) return null;

  return db.conversationReadState.upsert({
    where: {
      memberId_conversationId: {
        memberId: access.currentMember.id,
        conversationId,
      },
    },
    update: {
      lastReadAt: new Date(),
    },
    create: {
      memberId: access.currentMember.id,
      conversationId,
    },
  });
};
