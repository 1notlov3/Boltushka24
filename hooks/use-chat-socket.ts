import { useEffect } from "react";
import { InfiniteData, useQueryClient } from "@tanstack/react-query";

import { useSocket } from "@/components/providers/socket-provider";
import type { ChatMessagesPage } from "@/hooks/use-chat-query";
import { incrementUnreadInCache } from "@/hooks/use-unread";

type ChatSocketProps = {
  addKey: string;
  updateKey: string;
  queryKey: string;
  type: "channel" | "conversation";
  currentMemberId: string;
  serverId?: string;
}

type RealtimePayload = {
  id: string;
  action: "add" | "update" | "delete";
};

type CachedMessage = {
  id: string;
  memberId?: string;
  channelId?: string;
  conversationId?: string;
  deleted?: boolean;
  content?: string;
  fileUrl?: string | null;
  [key: string]: unknown;
};

const parsePayload = (payload: unknown): RealtimePayload | null => {
  if (!payload || typeof payload !== "object") return null;

  const value = payload as Record<string, unknown>;
  const action = value.action ?? value.type;

  if (typeof value.id !== "string") return null;
  if (typeof action !== "string") return null;

  return {
    id: value.id,
    action: action === "add" ? "add" : action === "delete" ? "delete" : "update",
  };
};

const isCachedMessage = (value: unknown): value is CachedMessage => (
  !!value && typeof value === "object" && typeof (value as { id?: unknown }).id === "string"
);

const messageUrl = (type: ChatSocketProps["type"], id: string) => (
  type === "channel" ? `/api/messages/${id}` : `/api/direct-messages/${id}`
);

export const useChatSocket = ({
  addKey,
  updateKey,
  queryKey,
  type,
  currentMemberId,
  serverId,
}: ChatSocketProps) => {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) {
      return;
    }

    const abortController = new AbortController();
    let isMounted = true;

    const writeMessage = (payload: RealtimePayload, message?: CachedMessage) => {
      queryClient.setQueryData<InfiniteData<ChatMessagesPage>>([queryKey], (old) => {
        if (!old?.pages?.length) return old;

        if (payload.action === "add" && message) {
          const exists = old.pages.some((page) =>
            page.items.some((item) => isCachedMessage(item) && item.id === message.id)
          );

          if (exists) return old;

          const [firstPage, ...restPages] = old.pages;
          return {
            ...old,
            pages: [
              {
                ...firstPage,
                items: [message, ...firstPage.items],
              },
              ...restPages,
            ],
          };
        }

        if (payload.action === "delete") {
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => (
                isCachedMessage(item) && item.id === payload.id
                  ? {
                      ...item,
                      deleted: true,
                      content: "Сообщение удалено",
                      fileUrl: null,
                    }
                  : item
              )),
            })),
          };
        }

        if (payload.action === "update" && message) {
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => (
                isCachedMessage(item) && item.id === message.id ? message : item
              )),
            })),
          };
        }

        return old;
      });
    };

    const handlePayload = (rawPayload: unknown) => {
      const payload = parsePayload(rawPayload);
      if (!payload) return;

      if (payload.action === "delete") {
        writeMessage(payload);
        return;
      }

      void fetch(messageUrl(type, payload.id), {
        signal: abortController.signal,
        cache: "no-store",
      })
        .then((response) => {
          if (!response.ok) throw new Error(`Message fetch failed: ${response.status}`);
          return response.json() as Promise<unknown>;
        })
        .then((message) => {
          if (!isMounted || !isCachedMessage(message)) return;
          writeMessage(payload, message);

          if (
            payload.action === "add" &&
            document.hidden &&
            message.memberId !== currentMemberId
          ) {
            const targetId = type === "channel" ? message.channelId : message.conversationId;
            if (!targetId) return;

            incrementUnreadInCache(
              queryClient,
              serverId,
              type,
              targetId,
            );
          }
        })
        .catch((error: unknown) => {
          if (abortController.signal.aborted) return;
          console.error("[CHAT_SOCKET_FETCH]", error);
        });
    };

    socket.on(addKey, handlePayload);
    socket.on(updateKey, handlePayload);

    return () => {
      isMounted = false;
      abortController.abort();
      socket.off(addKey, handlePayload);
      socket.off(updateKey, handlePayload);
    }
  }, [addKey, currentMemberId, queryClient, queryKey, serverId, socket, type, updateKey]);
}
