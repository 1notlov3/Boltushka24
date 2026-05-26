import { NotificationType, type Prisma } from "@prisma/client";

import { directMessageInclude } from "@/lib/chat-includes";
import { db } from "@/lib/db";
import { buildGroupSystemEventContent, formatGroupSystemEvent, type GroupSystemEvent } from "@/lib/group-system-events";
import { broadcast } from "@/lib/realtime";
import { notificationPushPayload, sendPushNotification } from "@/lib/web-push";

type ParticipantForSystemEvent = {
  memberId: string;
  member: {
    profileId: string;
    profile: {
      name: string;
    };
  };
};

export async function createGroupSystemEvent({
  conversationId,
  actorProfileId,
  actorMemberId,
  serverId,
  event,
  participants,
  notify = true,
}: {
  conversationId: string;
  actorProfileId: string;
  actorMemberId: string;
  serverId: string;
  event: GroupSystemEvent;
  participants: ParticipantForSystemEvent[];
  notify?: boolean;
}) {
  const message = await db.directMessage.create({
    data: {
      content: buildGroupSystemEventContent(event),
      conversationId,
      memberId: actorMemberId,
    },
    include: directMessageInclude(actorMemberId),
  });

  if (notify) {
    const targets = Array.from(new Set(
      participants
        .map((participant) => participant.member.profileId)
        .filter((profileId) => profileId !== actorProfileId),
    ));

    const notificationData = targets.map((targetId) => ({
      type: NotificationType.SYSTEM,
      actorId: actorProfileId,
      targetId,
      conversationId,
      directMessageId: message.id,
      metadata: {
        preview: formatGroupSystemEvent(event),
        event,
      } as Prisma.InputJsonValue,
    }));

    if (notificationData.length > 0) {
      await db.notification.createMany({ data: notificationData });
      await Promise.all(targets.map((targetId) => sendPushNotification(targetId, notificationPushPayload({
        title: "Обновление группы",
        preview: formatGroupSystemEvent(event),
        url: `/servers/${serverId}/conversations/group/${conversationId}`,
      }))));
    }
  }

  await broadcast(`chat:${conversationId}:messages`, { id: message.id, action: "add" });

  return message;
}
