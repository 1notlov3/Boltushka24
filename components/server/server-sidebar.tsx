import { ChannelType, MemberRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { Hash, Mic, ShieldAlert, ShieldCheck, Video } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { currentProfile } from "@/lib/current-profile";
import { getServerDetails } from "@/lib/data-service";

import { ServerHeader } from "./server-header";
import { ServerSearch } from "./server-search";
import { ServerSection } from "./server-section";
import { ServerChannel } from "./server-channel";
import { ServerMembersList } from "./server-members-list";

interface ServerSidebarProps {
  serverId: string;
}

const iconMap = {
  [ChannelType.TEXT]: <Hash className="mr-2 h-4 w-4" />,
  [ChannelType.AUDIO]: <Mic className="mr-2 h-4 w-4" />,
  [ChannelType.VIDEO]: <Video className="mr-2 h-4 w-4" />
};

const roleIconMap = {
  [MemberRole.GUEST]: null,
  [MemberRole.MODERATOR]: <ShieldCheck className="h-4 w-4 mr-2 text-indigo-500" />,
  [MemberRole.ADMIN]: <ShieldAlert className="h-4 w-4 mr-2 text-rose-500" />
}

export const ServerSidebar = async ({
  serverId
}: ServerSidebarProps) => {
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/");
  }

  const server = await getServerDetails(serverId);

  if (!server) {
    return redirect("/");
  }

  const categories = server.channelCategories ?? [];
  const categorizedChannels = categories
    .map((category) => ({
      ...category,
      channels: server.channels.filter((channel) => channel.categoryId === category.id),
    }))
    .filter((category) => category.channels.length > 0);
  const uncategorizedChannels = server.channels.filter((channel) => !channel.categoryId);
  const textChannels = uncategorizedChannels.filter((channel) => channel.type === ChannelType.TEXT)
  const audioChannels = uncategorizedChannels.filter((channel) => channel.type === ChannelType.AUDIO)
  const videoChannels = uncategorizedChannels.filter((channel) => channel.type === ChannelType.VIDEO)
  const members = server?.members.filter((member) => member.profileId !== profile.id)
  const membersCount = Math.max((server._count?.members ?? server.members.length) - 1, members.length);

  const role = server.members.find((member) => member.profileId === profile.id)?.role;

  return (
    <div className="flex flex-col h-full text-primary w-full dark:bg-[#2B2D31] bg-[#F2F3F5]">
      <ServerHeader
        server={server}
        role={role}
      />
      <ScrollArea className="flex-1 px-3">
        <div className="mt-2">
          <ServerSearch
            data={[
              {
                label: "Текстовые каналы",
                type: "channel",
                data: textChannels?.map((channel) => ({
                  id: channel.id,
                  name: channel.name,
                  icon: iconMap[channel.type],
                }))
              },
              {
                label: "Аудио каналы",
                type: "channel",
                data: audioChannels?.map((channel) => ({
                  id: channel.id,
                  name: channel.name,
                  icon: iconMap[channel.type],
                }))
              },
              {
                label: "Видео каналы",
                type: "channel",
                data: videoChannels?.map((channel) => ({
                  id: channel.id,
                  name: channel.name,
                  icon: iconMap[channel.type],
                }))
              },
              ...categorizedChannels.map((category) => ({
                label: category.name,
                type: "channel" as const,
                data: category.channels.map((channel) => ({
                  id: channel.id,
                  name: channel.name,
                  icon: iconMap[channel.type],
                })),
              })),
              {
                label: "Участники",
                type: "member",
                data: members?.map((member) => ({
                  id: member.id,
                  name: member.profile.name,
                  icon: roleIconMap[member.role],
                }))
              },
            ]}
          />
        </div>
        <Separator className="bg-zinc-200 dark:bg-zinc-700 rounded-md my-2" />
        {!!categorizedChannels.length && (
          <div className="mb-2">
            {categorizedChannels.map((category) => (
              <div key={category.id} className="mb-2">
                <ServerSection
                  sectionType="channels"
                  role={role}
                  label={category.name}
                  categoryId={category.id}
                />
                <div className="space-y-[2px]">
                  {category.channels.map((channel) => (
                    <ServerChannel
                      key={channel.id}
                      channel={channel}
                      role={role}
                      server={server}
                    />
                  ))}
                </div>
              </div>
            ))}
            <Separator className="bg-zinc-200 dark:bg-zinc-700 rounded-md my-2" />
          </div>
        )}

        {!!textChannels?.length && (
          <div className="mb-2">
            <ServerSection
              sectionType="channels"
              channelType={ChannelType.TEXT}
              role={role}
              label="Текстовые каналы"
            />
            <div className="space-y-[2px]">
              {textChannels.map((channel) => (
                <ServerChannel
                  key={channel.id}
                  channel={channel}
                  role={role}
                  server={server}
                />
              ))}
            </div>
          </div>
        )}
        {!!audioChannels?.length && (
          <div className="mb-2">
            <ServerSection
              sectionType="channels"
              channelType={ChannelType.AUDIO}
              role={role}
              label="Аудио каналы"
            />
            <div className="space-y-[2px]">
              {audioChannels.map((channel) => (
                <ServerChannel
                  key={channel.id}
                  channel={channel}
                  role={role}
                  server={server}
                />
              ))}
            </div>
          </div>
        )}
        {!!videoChannels?.length && (
          <div className="mb-2">
            <ServerSection
              sectionType="channels"
              channelType={ChannelType.VIDEO}
              role={role}
              label="Видео каналы"
            />
            <div className="space-y-[2px]">
              {videoChannels.map((channel) => (
                <ServerChannel
                  key={channel.id}
                  channel={channel}
                  role={role}
                  server={server}
                />
              ))}
            </div>
          </div>
        )}
        {!!members?.length && (
          <div className="mb-2">
            <ServerSection
              sectionType="members"
              role={role}
              label="Участники"
              server={server}
            />
            <div className="space-y-[2px]">
              <ServerMembersList
                serverId={server.id}
                initialMembers={members}
                totalMembers={membersCount}
              />
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
