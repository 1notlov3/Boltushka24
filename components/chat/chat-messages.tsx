"use client";

import { ElementRef, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Member, Message, Profile } from "@prisma/client";
import { Loader2, ServerCrash } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { useChatQuery } from "@/hooks/use-chat-query";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import type { ReplyTarget } from "@/components/chat/chat-shell";

import { ChatWelcome } from "./chat-welcome";
import { ChatItem } from "./chat-item";
import { extractMentionMemberIds } from "@/lib/message-formatting";

const DATE_FORMAT = "d MMM yyyy, HH:mm";

type MessageWithMemberWithProfile = Message & {
  member: Member & {
    profile: Profile
  };
  reactions?: { id: string; emoji: string; memberId: string }[];
  savedBy?: { id: string }[];
  parentMessage?: {
    id: string;
    content: string;
    deleted: boolean;
    member: Member & { profile: Profile };
  } | null;
  parentDirectMessage?: {
    id: string;
    content: string;
    deleted: boolean;
    member: Member & { profile: Profile };
  } | null;
  _count?: {
    replies?: number;
  };
}

interface ChatMessagesProps {
  name: string;
  member: Member;
  chatId: string;
  apiUrl: string;
  socketUrl: string;
  socketQuery: Record<string, string>;
  paramKey: "channelId" | "conversationId";
  paramValue: string;
  type: "channel" | "conversation";
  onReply: (target: ReplyTarget) => void;
  onOpenThread?: (messageId: string) => void;
  typingUsers: string[];
}

export const ChatMessages = ({
  name,
  member,
  chatId,
  apiUrl,
  socketUrl,
  socketQuery,
  paramKey,
  paramValue,
  type,
  onReply,
  onOpenThread,
  typingUsers,
}: ChatMessagesProps) => {
  const queryKey = `chat:${chatId}`;
  const addKey = `chat:${chatId}:messages`;
  const updateKey = `chat:${chatId}:messages:update` 

  const chatRef = useRef<ElementRef<"div">>(null);
  const topRef = useRef<ElementRef<"div">>(null);
  const bottomRef = useRef<ElementRef<"div">>(null);
  const [mentionNames, setMentionNames] = useState<Record<string, string>>({});

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useChatQuery({
    queryKey,
    apiUrl,
    paramKey,
    paramValue,
  });
  const messages = useMemo(() => {
    const items = data?.pages.flatMap((page) => page.items) ?? [];
    return items
      .filter((message): message is MessageWithMemberWithProfile => (
        !!message &&
        typeof message === "object" &&
        "id" in message &&
        "member" in message &&
        "createdAt" in message
      ))
      .reverse();
  }, [data]);

  const shouldVirtualize = messages.length > 200;
  const mentionIds = useMemo(() => (
    Array.from(new Set(messages.flatMap((message) => extractMentionMemberIds(message.content))))
  ), [messages]);

  useEffect(() => {
    const serverId = socketQuery.serverId;

    if (!serverId || !mentionIds.length) {
      setMentionNames({});
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({ ids: mentionIds.join(",") });

    void fetch(`/api/servers/${serverId}/members?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Mention names failed");
        return response.json() as Promise<{ items?: { id: string; name: string }[] }>;
      })
      .then((payload) => {
        setMentionNames(Object.fromEntries((payload.items ?? []).map((item) => [item.id.toLowerCase(), item.name])));
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error("[MENTION_NAMES]", error);
        }
      });

    return () => controller.abort();
  }, [mentionIds, socketQuery.serverId]);

  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => chatRef.current,
    estimateSize: () => 96,
    overscan: 8,
    getItemKey: (index) => messages[index]?.id ?? index,
    measureElement: (element) => element?.getBoundingClientRect().height ?? 96,
  });

  useChatSocket({
    queryKey,
    addKey,
    updateKey,
    type,
    currentMemberId: member.id,
    serverId: socketQuery.serverId,
  });
  useChatScroll({
    chatRef,
    topRef,
    bottomRef,
    loadMore: fetchNextPage,
    shouldLoadMore: !isFetchingNextPage && !!hasNextPage,
    count: messages.length,
  })

  const renderMessage = (message: MessageWithMemberWithProfile) => (
    <ChatItem
      key={message.id}
      id={message.id}
      currentMember={member}
      member={message.member}
      content={message.content}
      fileUrl={message.fileUrl}
      deleted={message.deleted}
      timestamp={format(new Date(message.createdAt), DATE_FORMAT)}
      isUpdated={message.updatedAt !== message.createdAt}
      socketUrl={socketUrl}
      socketQuery={socketQuery}
      queryKey={queryKey}
      chatType={type}
      reactions={message.reactions ?? []}
      savedByCurrentMember={!!message.savedBy?.length}
      pinned={message.pinned}
      parent={message.parentMessage ?? message.parentDirectMessage ?? null}
      repliesCount={message._count?.replies ?? 0}
      mentionNames={mentionNames}
      onReply={onReply}
      onOpenThread={type === "channel" ? onOpenThread : undefined}
    />
  );

  if (status === "pending") {
    return (
      <div className="flex flex-col flex-1 justify-center items-center">
        <Loader2 className="h-7 w-7 text-zinc-500 animate-spin my-4" />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Загрузка сообщений
        </p>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="flex flex-col flex-1 justify-center items-center">
        <ServerCrash className="h-7 w-7 text-zinc-500 my-4" />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Что-то пошло не так!
        </p>
      </div>
    )
  }

  return (
    <div ref={chatRef} className="flex-1 flex flex-col py-4 overflow-y-auto">
      {!hasNextPage && <div className="flex-1" />}
      {!hasNextPage && (
        <ChatWelcome
          type={type}
          name={name}
        />
      )}
      <div ref={topRef} className="h-px" />
      {hasNextPage && (
        <div className="flex justify-center">
          {isFetchingNextPage ? (
            <Loader2 className="h-6 w-6 text-zinc-500 animate-spin my-4" />
          ) : (
            <button
              onClick={() => fetchNextPage()}
              className="text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 text-xs my-4 dark:hover:text-zinc-300 transition"
            >
              Загрузить предыдущие сообщения
            </button>
          )}
        </div>
      )}
      {shouldVirtualize ? (
        <div
          className="relative w-full"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            const message = messages[virtualItem.index];
            if (!message) return null;

            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={rowVirtualizer.measureElement}
                className="absolute left-0 top-0 w-full"
                style={{ transform: `translateY(${virtualItem.start}px)` }}
              >
                {renderMessage(message)}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-auto flex flex-col">
          {messages.map((message) => renderMessage(message))}
        </div>
      )}
      {!!typingUsers.length && (
        <p className="px-4 pt-2 text-xs text-zinc-500 dark:text-zinc-400">
          {typingUsers.slice(0, 3).join(", ")} {typingUsers.length === 1 ? "печатает..." : "печатают..."}
        </p>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
