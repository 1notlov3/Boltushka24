import { redirect } from "next/navigation";

import { currentProfile } from "@/lib/current-profile";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatShell } from "@/components/chat/chat-shell";
import { ChannelType } from "@prisma/client";
import { db } from "@/lib/db";
import { MediaRoom } from "@/components/media-room";

interface ChannelIdPageProps {
  params: Promise<{
    serverId: string;
    channelId: string;
  }>
}

const ChannelIdPage = async ({
  params
}: ChannelIdPageProps) => {
  const resolvedParams = await params;
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/sign-in");
  }

  // ⚡ Bolt Optimization: Parallelize independent queries to reduce waterfall
  const [channel, member] = await Promise.all([
    db.channel.findUnique({
      where: {
        id: resolvedParams.channelId,
      },
    }),
    db.member.findFirst({
      where: {
        serverId: resolvedParams.serverId,
        profileId: profile.id,
      },
      include: {
        profile: true,
      },
    })
  ]);

  if (!channel || !member) {
    redirect("/");
  }

  return ( 
    <div className="bg-white dark:bg-[#313338] flex flex-col h-[100dvh] overflow-hidden">
      <ChatHeader
        name={channel.name}
        serverId={channel.serverId}
        channelId={channel.id}
        type="channel"
      />
      {channel.type === ChannelType.TEXT && (
        <ChatShell
            member={member}
            name={channel.name}
            chatId={channel.id}
            type="channel"
            apiUrl="/api/messages"
            socketUrl="/api/socket/messages"
            socketQuery={{
              channelId: channel.id,
              serverId: channel.serverId,
            }}
            paramKey="channelId"
            paramValue={channel.id}
          />
      )}
      {channel.type === ChannelType.AUDIO && (
        <MediaRoom
          chatId={channel.id}
          video={false}
          audio={true}
        />
      )}
      {channel.type === ChannelType.VIDEO && (
        <MediaRoom
          chatId={channel.id}
          video={true}
          audio={true}
        />
      )}
    </div>
   );
}
 
export default ChannelIdPage;
