import { redirect } from "next/navigation";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { YouTubeWatchRoom } from "@/components/watch/youtube-watch-room";

interface WatchPageProps {
  params: {
    serverId: string;
    channelId: string;
  };
  searchParams: {
    v?: string;
  };
}

const WatchPage = async ({ params, searchParams }: WatchPageProps) => {
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/sign-in");
  }

  const [channel, member] = await Promise.all([
    db.channel.findFirst({
      where: {
        id: params.channelId,
        serverId: params.serverId,
      },
      select: {
        id: true,
        name: true,
        serverId: true,
      },
    }),
    db.member.findFirst({
      where: {
        serverId: params.serverId,
        profileId: profile.id,
      },
      select: { id: true },
    }),
  ]);

  if (!channel || !member) {
    return redirect("/");
  }

  return (
    <YouTubeWatchRoom
      serverId={channel.serverId}
      channelId={channel.id}
      channelName={channel.name}
      initialVideoId={searchParams.v}
    />
  );
};

export default WatchPage;
