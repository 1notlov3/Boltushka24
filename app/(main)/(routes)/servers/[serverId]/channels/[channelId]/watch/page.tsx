import { redirect } from "next/navigation";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { YouTubeWatchRoom } from "@/components/watch/youtube-watch-room";

interface WatchPageProps {
  params: Promise<{
    serverId: string;
    channelId: string;
  }>;
  searchParams: Promise<{
    v?: string;
  }>;
}

const WatchPage = async ({ params, searchParams }: WatchPageProps) => {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/sign-in");
  }

  const [channel, member] = await Promise.all([
    db.channel.findFirst({
      where: {
        id: resolvedParams.channelId,
        serverId: resolvedParams.serverId,
      },
      select: {
        id: true,
        name: true,
        serverId: true,
      },
    }),
    db.member.findFirst({
      where: {
        serverId: resolvedParams.serverId,
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
      initialVideoId={resolvedSearchParams.v}
    />
  );
};

export default WatchPage;
