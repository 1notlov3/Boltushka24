"use client";

import { Pin, Search, Users } from "lucide-react";

import { ActionTooltip } from "@/components/action-tooltip";
import { useModal } from "@/hooks/use-modal-store";

interface ChatHeaderActionsProps {
  serverId: string;
  type: "channel" | "conversation";
  chatId: string;
  channelId?: string;
  conversationId?: string;
  isGroupConversation?: boolean;
}

export const ChatHeaderActions = ({
  serverId,
  type,
  chatId,
  channelId,
  conversationId,
  isGroupConversation = false,
}: ChatHeaderActionsProps) => {
  const { onOpen } = useModal();

  return (
    <>
      <ActionTooltip label="Поиск" side="bottom">
        <button
          type="button"
          onClick={() => onOpen("messageSearch", {
            chatId,
            chatType: type,
            serverId,
            channelId,
            conversationId,
          })}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label="Поиск сообщений"
        >
          <Search className="h-4 w-4" />
        </button>
      </ActionTooltip>
      <ActionTooltip label="Закреплённые" side="bottom">
        <button
          type="button"
          onClick={() => onOpen("pinnedMessages", {
            chatId,
            chatType: type,
            serverId,
            channelId,
            conversationId,
          })}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label="Закреплённые сообщения"
        >
          <Pin className="h-4 w-4" />
        </button>
      </ActionTooltip>
      {type === "conversation" && isGroupConversation && conversationId && (
        <ActionTooltip label="Участники" side="bottom">
          <button
            type="button"
            onClick={() => onOpen("groupConversationSettings", {
              chatId,
              chatType: type,
              serverId,
              conversationId,
            })}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="Управление группой"
          >
            <Users className="h-4 w-4" />
          </button>
        </ActionTooltip>
      )}
    </>
  );
};
