"use client";

import { 
  Channel, 
  ChannelType, 
  MemberRole,
  Server
} from "@prisma/client";
import { Edit, Hash, Lock, Mic, Trash, Video } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { ActionTooltip } from "@/components/action-tooltip";
import { ModalType, useModal } from "@/hooks/use-modal-store";
import React from "react";

interface ServerChannelProps {
  channel: Channel;
  server: Server;
  role?: MemberRole;
}

const iconMap = {
  [ChannelType.TEXT]: Hash,
  [ChannelType.AUDIO]: Mic,
  [ChannelType.VIDEO]: Video,
}

export const ServerChannel = ({
  channel,
  server,
  role
}: ServerChannelProps) => {
  const { onOpen } = useModal();
  const params = useParams();
  const router = useRouter();

  const Icon = iconMap[channel.type];

  const onClick = () => {
    router.push(`/servers/${params?.serverId}/channels/${channel.id}`)
  }

  const onAction = (e: React.MouseEvent, action: ModalType) => {
    e.stopPropagation();
    onOpen(action, { channel, server })
  }

  return (
    <div
      className={cn(
        "group rounded-md flex items-center w-full hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 transition mb-1",
        params?.channelId === channel.id && "bg-zinc-700/20 dark:bg-zinc-700"
      )}
    >
      <button
        onClick={onClick}
        className={cn(
          "flex-1 text-left flex items-center gap-x-2 px-2 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:focus-visible:ring-zinc-400 focus-visible:ring-offset-2 rounded-md transition",
          params?.channelId === channel.id && "text-primary dark:text-zinc-200 dark:group-hover:text-white"
        )}
        aria-label={`Открыть канал ${channel.name}`}
      >
        <Icon className="flex-shrink-0 w-5 h-5 text-zinc-500 dark:text-zinc-400" />
        <p className={cn(
          "line-clamp-1 font-semibold text-sm text-zinc-500 group-hover:text-zinc-600 dark:text-zinc-400 dark:group-hover:text-zinc-300 transition",
          params?.channelId === channel.id && "text-primary dark:text-zinc-200 dark:group-hover:text-white"
        )}>
          {channel.name}
        </p>
      </button>

      {channel.name !== "основной" && role !== MemberRole.GUEST && (
        <div className="ml-auto flex items-center gap-x-2 pr-2">
          <ActionTooltip label="Редактировать">
            <button
              onClick={(e) => onAction(e, 'editChannel')}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition w-4 h-4 text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300"
              aria-label="Редактировать"
              type="button"
            >
              <Edit className="w-4 h-4" />
            </button>
          </ActionTooltip>
          <ActionTooltip label="Удалить">
            <button
              onClick={(e) => onAction(e, 'deleteChannel')}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition w-4 h-4 text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300"
              aria-label="Удалить"
              type="button"
            >
              <Trash className="w-4 h-4" />
            </button>
          </ActionTooltip>
        </div>
      )}
      {channel.name === "основной" && (
        <Lock
          className="ml-auto w-4 h-4 text-zinc-500 dark:text-zinc-400 mr-2"
        />
      )}
    </div>
  )
}
