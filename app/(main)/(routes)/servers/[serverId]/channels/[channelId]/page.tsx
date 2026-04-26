import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

import { currentProfile } from "@/lib/current-profile";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChannelType } from "@prisma/client";
import { db } from "@/lib/db";

// Lazy load MediaRoom to reduce initial JS bundle size for text channels
const MediaRoom = dynamic(() => import("@/components/media-room").then((mod) => mod.MediaRoom), {
  loading: () => (
    <div className="flex flex-col flex-1 justify-center items-center">
      <Loader2 className="h-7 w-7 text-zinc-500 animate-spin my-4" />
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Loading...
      </p>
    </div>
  ),
  ssr: false,
});

interface ChannelIdPageProps {
  params: {
    serverId: string;
    channelId: string;
  }
}

const ChannelIdPage = async ({
  params
}: ChannelIdPageProps) => {
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/sign-in");
  }

  // ⚡ Bolt Optimization: Parallelize independent queries to reduce waterfall
  const [channel, member] = await Promise.all([
    db.channel.findUnique({
      where: {
        id: params.channelId,
      },
    }),
    db.member.findFirst({
      where: {
        serverId: params.serverId,
        profileId: profile.id,
      }
    })
  ]);

  if (!channel || !member) {
    redirect("/");
  }

  return ( 
    <div className="bg-white dark:bg-[#313338] flex flex-col h-screen">
      <ChatHeader
        name={channel.name}
        serverId={channel.serverId}
        channelId={channel.id}
        type="channel"
      />
      {channel.type === ChannelType.TEXT && (
        <>
          <ChatMessages
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
          <ChatInput
            name={channel.name}
            type="channel"
            apiUrl="/api/socket/messages"
            query={{
              channelId: channel.id,
              serverId: channel.serverId,
            }}
            queryKey={`chat:${channel.id}`}
          />
        </>
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