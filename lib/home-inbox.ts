import { ChannelType, NotificationType } from "@prisma/client";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

const MAX_RECENT_MESSAGES = 120;
const MAX_INBOX_ITEMS = 24;
const MAX_SERVERS = 12;
const MAX_NOTIFICATIONS = 10;

export type HomeInboxItem = {
  id: string;
  kind: "channel" | "conversation";
  title: string;
  subtitle: string;
  preview: string;
  href: string;
  unreadCount: number;
  lastActivityAt: string | null;
  imageUrl: string | null;
};

export type HomeInboxServer = {
  id: string;
  name: string;
  imageUrl: string | null;
  href: string;
  membersCount: number;
  channelsCount: number;
  unreadCount: number;
};

export type HomeInboxNotification = {
  id: string;
  type: NotificationType;
  read: boolean;
  title: string;
  subtitle: string;
  href: string | null;
  createdAt: string;
};

export type HomeInboxData = {
  profile: {
    id: string;
    name: string;
    imageUrl: string;
  };
  totals: {
    unreadMessages: number;
    unreadNotifications: number;
    servers: number;
    conversations: number;
  };
  items: HomeInboxItem[];
  servers: HomeInboxServer[];
  notifications: HomeInboxNotification[];
};

const safePreview = (content: string | null | undefined, fallback: string) => {
  const normalized = content?.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;
  return normalized.length > 120 ? `${normalized.slice(0, 117)}...` : normalized;
};

const toIso = (date: Date | null | undefined) => date ? date.toISOString() : null;

const notificationTitle = (type: NotificationType) => {
  switch (type) {
    case "MENTION":
      return "Вас упомянули";
    case "REPLY":
      return "Новый ответ";
    case "REACTION":
      return "Новая реакция";
    case "PIN":
      return "Сообщение закреплено";
    case "DIRECT_MESSAGE":
      return "Новое личное сообщение";
    default:
      return "Новое уведомление";
  }
};

export async function getHomeInboxData(): Promise<HomeInboxData | null> {
  const profile = await currentProfile();
  if (!profile) return null;

  const members = await db.member.findMany({
    where: { profileId: profile.id },
    select: {
      id: true,
      serverId: true,
      server: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          updatedAt: true,
          _count: {
            select: {
              members: true,
              channels: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const memberIds = members.map((member) => member.id);
  const serverIds = members.map((member) => member.serverId);
  const memberByServerId = new Map(members.map((member) => [member.serverId, member]));

  if (members.length === 0) {
    const unreadNotifications = await db.notification.count({
      where: { targetId: profile.id, read: false },
    });

    return {
      profile: {
        id: profile.id,
        name: profile.name,
        imageUrl: profile.imageUrl,
      },
      totals: {
        unreadMessages: 0,
        unreadNotifications,
        servers: 0,
        conversations: 0,
      },
      items: [],
      servers: [],
      notifications: [],
    };
  }

  const [
    recentMessages,
    conversations,
    channelReadStates,
    conversationReadStates,
    notifications,
    unreadNotifications,
  ] = await Promise.all([
    db.message.findMany({
      where: {
        deleted: false,
        channel: {
          serverId: { in: serverIds },
          type: ChannelType.TEXT,
        },
      },
      include: {
        member: {
          include: {
            profile: {
              select: {
                name: true,
                imageUrl: true,
              },
            },
          },
        },
        channel: {
          select: {
            id: true,
            name: true,
            serverId: true,
            server: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: MAX_RECENT_MESSAGES,
    }),
    db.conversation.findMany({
      where: {
        OR: [
          { memberOneId: { in: memberIds } },
          { memberTwoId: { in: memberIds } },
        ],
      },
      include: {
        memberOne: {
          include: {
            profile: {
              select: {
                name: true,
                imageUrl: true,
              },
            },
            server: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
        memberTwo: {
          include: {
            profile: {
              select: {
                name: true,
                imageUrl: true,
              },
            },
            server: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
        directMessages: {
          where: { deleted: false },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            member: {
              include: {
                profile: {
                  select: {
                    name: true,
                    imageUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    db.channelReadState.findMany({
      where: { memberId: { in: memberIds } },
      select: { memberId: true, channelId: true, lastReadAt: true },
    }),
    db.conversationReadState.findMany({
      where: { memberId: { in: memberIds } },
      select: { memberId: true, conversationId: true, lastReadAt: true },
    }),
    db.notification.findMany({
      where: { targetId: profile.id },
      include: {
        actor: {
          select: {
            name: true,
          },
        },
        server: {
          select: {
            id: true,
            name: true,
          },
        },
        channel: {
          select: {
            id: true,
            name: true,
            serverId: true,
          },
        },
        conversation: {
          select: {
            id: true,
            memberOneId: true,
            memberTwoId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: MAX_NOTIFICATIONS,
    }),
    db.notification.count({
      where: { targetId: profile.id, read: false },
    }),
  ]);

  const channelReadMap = new Map(channelReadStates.map((state) => [`${state.memberId}:${state.channelId}`, state.lastReadAt]));
  const conversationReadMap = new Map(conversationReadStates.map((state) => [`${state.memberId}:${state.conversationId}`, state.lastReadAt]));
  const latestMessageByChannel = new Map<string, typeof recentMessages[number]>();

  for (const message of recentMessages) {
    if (!latestMessageByChannel.has(message.channelId)) {
      latestMessageByChannel.set(message.channelId, message);
    }
  }

  const channelUnreadPairs = await Promise.all(
    [...latestMessageByChannel.values()].map(async (message) => {
      const member = memberByServerId.get(message.channel.serverId);
      if (!member) return [message.channelId, 0] as const;

      const lastReadAt = channelReadMap.get(`${member.id}:${message.channelId}`) ?? new Date(0);
      const count = await db.message.count({
        where: {
          channelId: message.channelId,
          memberId: { not: member.id },
          deleted: false,
          createdAt: { gt: lastReadAt },
        },
      });

      return [message.channelId, count] as const;
    }),
  );

  const channelUnreadMap = new Map(channelUnreadPairs);

  const conversationItems = await Promise.all(conversations.map(async (conversation) => {
    const myMember = memberIds.includes(conversation.memberOneId)
      ? conversation.memberOne
      : conversation.memberTwo;
    const otherMember = myMember.id === conversation.memberOneId
      ? conversation.memberTwo
      : conversation.memberOne;
    const lastMessage = conversation.directMessages[0];
    const lastReadAt = conversationReadMap.get(`${myMember.id}:${conversation.id}`) ?? new Date(0);
    const unreadCount = await db.directMessage.count({
      where: {
        conversationId: conversation.id,
        memberId: { not: myMember.id },
        deleted: false,
        createdAt: { gt: lastReadAt },
      },
    });

    return {
      id: conversation.id,
      kind: "conversation" as const,
      title: otherMember.profile.name,
      subtitle: `Личный диалог · ${myMember.server.name}`,
      preview: lastMessage
        ? `${lastMessage.member.profile.name}: ${safePreview(lastMessage.content, "Вложение")}`
        : "Диалог пока без сообщений",
      href: `/servers/${myMember.serverId}/conversations/${otherMember.id}`,
      unreadCount,
      lastActivityAt: toIso(lastMessage?.createdAt),
      imageUrl: otherMember.profile.imageUrl,
    };
  }));

  const channelItems: HomeInboxItem[] = [...latestMessageByChannel.values()].map((message) => ({
    id: message.channelId,
    kind: "channel",
    title: `# ${message.channel.name}`,
    subtitle: message.channel.server.name,
    preview: `${message.member.profile.name}: ${safePreview(message.content, message.fileUrl ? "Вложение" : "Сообщение")}`,
    href: `/servers/${message.channel.serverId}/channels/${message.channelId}`,
    unreadCount: channelUnreadMap.get(message.channelId) ?? 0,
    lastActivityAt: toIso(message.createdAt),
    imageUrl: message.channel.server.imageUrl,
  }));

  const items = [...conversationItems, ...channelItems]
    .sort((a, b) => {
      if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
      return Date.parse(b.lastActivityAt ?? "0") - Date.parse(a.lastActivityAt ?? "0");
    })
    .slice(0, MAX_INBOX_ITEMS);

  const serverUnreadMap = new Map<string, number>();
  for (const item of items) {
    const serverId = item.href.split("/")[2];
    if (!serverId) continue;
    serverUnreadMap.set(serverId, (serverUnreadMap.get(serverId) ?? 0) + item.unreadCount);
  }

  const serverCards = members
    .map((member) => ({
      id: member.server.id,
      name: member.server.name,
      imageUrl: member.server.imageUrl,
      href: `/servers/${member.server.id}`,
      membersCount: member.server._count.members,
      channelsCount: member.server._count.channels,
      unreadCount: serverUnreadMap.get(member.server.id) ?? 0,
    }))
    .sort((a, b) => {
      if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
      return a.name.localeCompare(b.name);
    })
    .slice(0, MAX_SERVERS);

  const notificationRows = notifications.map((notification) => {
    const actorName = notification.actor?.name ?? "Система";
    const channelHref = notification.channel
      ? `/servers/${notification.channel.serverId}/channels/${notification.channel.id}`
      : null;

    return {
      id: notification.id,
      type: notification.type,
      read: notification.read,
      title: notificationTitle(notification.type),
      subtitle: notification.server?.name
        ? `${actorName} · ${notification.server.name}`
        : actorName,
      href: channelHref,
      createdAt: notification.createdAt.toISOString(),
    };
  });

  return {
    profile: {
      id: profile.id,
      name: profile.name,
      imageUrl: profile.imageUrl,
    },
    totals: {
      unreadMessages: items.reduce((sum, item) => sum + item.unreadCount, 0),
      unreadNotifications,
      servers: members.length,
      conversations: conversations.length,
    },
    items,
    servers: serverCards,
    notifications: notificationRows,
  };
}
