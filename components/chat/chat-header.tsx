import { Hash } from "lucide-react";

import { MobileToggle } from "@/components/mobile-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { SocketIndicator } from "@/components/socket-indicator";
import { ChatVideoButton } from "./chat-video-button";
import { WatchTogetherTrigger } from "./watch-together-trigger";
import { ChatHeaderActions } from "./chat-header-actions";

interface ChatHeaderProps {
  serverId: string;
  name: string;
  type: "channel" | "conversation";
  imageUrl?: string;
  channelId?: string;
  conversationId?: string;
}

export const ChatHeader = ({
  serverId,
  name,
  type,
  imageUrl,
  channelId,
  conversationId,
}: ChatHeaderProps) => {
  const chatId = type === "channel" ? channelId : conversationId;

  return (
    <div className="text-md sticky top-0 z-10 flex h-14 items-center gap-1 border-b-2 border-neutral-200 bg-white px-2 font-semibold dark:border-neutral-800 dark:bg-[#313338] sm:px-3 md:h-12">
      <MobileToggle serverId={serverId} />

      <div className="flex min-w-0 flex-1 items-center">
        {type === "channel" && (
          <Hash className="ml-1 mr-2 h-5 w-5 shrink-0 text-zinc-500 dark:text-zinc-400" />
        )}

        {type === "conversation" && (
          <UserAvatar src={imageUrl} className="mr-2 h-9 w-9 shrink-0 md:h-8 md:w-8" />
        )}

        <p className="truncate text-base font-semibold text-black dark:text-white md:text-md">{name}</p>
      </div>

      <div className="ml-1 flex shrink-0 items-center gap-0.5 sm:gap-1">
        {chatId && (
          <ChatHeaderActions
            serverId={serverId}
            type={type}
            chatId={chatId}
            channelId={channelId}
            conversationId={conversationId}
          />
        )}
        {type === "channel" && channelId && (
          <WatchTogetherTrigger serverId={serverId} channelId={channelId} />
        )}

        {type === "conversation" && <ChatVideoButton />}

        <SocketIndicator />
      </div>
    </div>
  );
};
