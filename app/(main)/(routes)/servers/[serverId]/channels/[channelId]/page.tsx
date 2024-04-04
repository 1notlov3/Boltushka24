import { ChatHeader } from "@/components/chat/chat-header";
import { redirectToSignIn, RedirectToSignIn } from "@clerk/nextjs";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
interface ChannelIdPageProps{
  params: {
    serverId: string;
    channelId: string;
  }
}
const ChannelIdPage = async ({
  params
}:ChannelIdPageProps) => {
  const profile = await currentProfile();
  if (!profile){
    return redirectToSignIn();
  }
  const channel = await db.channel.findUnique({
    where:{
      id: params.channelId,
    },
  });
  const member = await db.channel.findFirst({
    where:{
      serverId:params.serverId,
      profileId:profile.id
    }
  });
  if (!channel || !member){
    redirect('/');
  }
  return(
    <div>
      <ChatHeader
      name={channel.name}
      serverId={channel.serverId}
      type = 'channel'
      />
    </div>
  );
}

export default ChannelIdPage;