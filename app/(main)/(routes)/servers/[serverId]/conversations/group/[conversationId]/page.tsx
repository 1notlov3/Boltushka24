import { ConversationType } from "@prisma/client";
import { redirect } from "next/navigation";

import { ChatHeader } from "@/components/chat/chat-header";
import { ChatShell } from "@/components/chat/chat-shell";
import { MediaRoom } from "@/components/media-room";
import { currentProfile } from "@/lib/current-profile";
import { getConversationAccess } from "@/lib/conversation";

interface GroupConversationPageProps {
  params: Promise<{
    serverId: string;
    conversationId: string;
  }>;
  searchParams: Promise<{
    video?: string;
  }>;
}

const groupConversationName = (access: NonNullable<Awaited<ReturnType<typeof getConversationAccess>>>) => {
  if (access.conversation.name) return access.conversation.name;

  const names = access.participants
    .filter((participant) => participant.memberId !== access.currentMember.id)
    .map((participant) => participant.member.profile.name)
    .slice(0, 3);

  return names.length > 0 ? names.join(", ") : "Групповой чат";
};

const GroupConversationPage = async ({ params, searchParams }: GroupConversationPageProps) => {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/sign-in");
  }

  const access = await getConversationAccess({
    conversationId: resolvedParams.conversationId,
    profileId: profile.id,
  });

  if (
    !access ||
    !access.isGroup ||
    access.conversation.type !== ConversationType.GROUP ||
    access.conversation.serverId !== resolvedParams.serverId
  ) {
    return redirect(`/servers/${resolvedParams.serverId}`);
  }

  const name = groupConversationName(access);

  return (
    <div className="bg-white dark:bg-[#313338] flex flex-col h-[100dvh] overflow-hidden">
      <ChatHeader
        imageUrl={access.conversation.imageUrl ?? undefined}
        name={name}
        serverId={resolvedParams.serverId}
        type="conversation"
        conversationId={access.conversation.id}
      />
      {resolvedSearchParams.video && (
        <MediaRoom
          chatId={access.conversation.id}
          video={true}
          audio={true}
        />
      )}
      {!resolvedSearchParams.video && (
        <ChatShell
          member={access.currentMember}
          name={name}
          chatId={access.conversation.id}
          type="conversation"
          apiUrl="/api/direct-messages"
          paramKey="conversationId"
          paramValue={access.conversation.id}
          socketUrl="/api/direct-messages"
          socketQuery={{
            conversationId: access.conversation.id,
            serverId: resolvedParams.serverId,
          }}
        />
      )}
    </div>
  );
};

export default GroupConversationPage;
