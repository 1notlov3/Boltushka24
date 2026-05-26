"use client";

import { ElementRef, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Member, Message, Profile } from "@prisma/client";
import { ArrowDown, Loader2, Search, ServerCrash, X } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { useChatQuery } from "@/hooks/use-chat-query";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import type { ReplyTarget } from "@/components/chat/chat-shell";

import { ChatWelcome } from "./chat-welcome";
import { ChatItem } from "./chat-item";
import { extractMentionMemberIds } from "@/lib/message-formatting";
import type { PollData } from "@/components/chat/poll-block";
import { ImageLightbox } from "@/components/chat/image-lightbox";
import { isImageUrl } from "@/lib/upload";
import { UserAvatar } from "@/components/user-avatar";
import type { TypingUser } from "@/components/providers/server-activity-provider";
import { ChatSystemEvent } from "@/components/chat/chat-system-event";
import { formatGroupSystemEvent, parseGroupSystemEvent } from "@/lib/group-system-events";

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
  poll?: PollData | null;
  outbox?: boolean;
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
  typingUsers: TypingUser[];
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
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [hashTargetVersion, setHashTargetVersion] = useState(0);

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

  const normalizedLocalSearch = localSearch.trim().toLowerCase();
  const visibleMessages = useMemo(() => {
    if (!normalizedLocalSearch) return messages;

    return messages.filter((message) => {
      const systemEvent = parseGroupSystemEvent(message.content);
      const haystack = [
        systemEvent ? formatGroupSystemEvent(systemEvent) : message.content,
        message.fileUrl ?? "",
        message.member.profile.name,
      ].join(" ").toLowerCase();

      return haystack.includes(normalizedLocalSearch);
    });
  }, [messages, normalizedLocalSearch]);

  const shouldVirtualize = visibleMessages.length > 200;
  const imageUrls = useMemo(() => (
    Array.from(new Set(messages.flatMap((message) => (
      message.fileUrl && isImageUrl(message.fileUrl) ? [message.fileUrl] : []
    ))))
  ), [messages]);
  const mentionIds = useMemo(() => (
    Array.from(new Set(messages.flatMap((message) => (
      parseGroupSystemEvent(message.content) ? [] : extractMentionMemberIds(message.content)
    ))))
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
    count: visibleMessages.length,
    getScrollElement: () => chatRef.current,
    estimateSize: () => 96,
    overscan: 8,
    getItemKey: (index) => visibleMessages[index]?.id ?? index,
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
    shouldLoadMore: !isFetchingNextPage && !!hasNextPage && !normalizedLocalSearch,
    count: messages.length,
  })

  useEffect(() => {
    const root = chatRef.current;
    if (!root) return;

    const updateJumpButton = () => {
      const distanceFromBottom = root.scrollHeight - root.scrollTop - root.clientHeight;
      setShowJumpToBottom(distanceFromBottom > 280);
    };

    updateJumpButton();
    root.addEventListener("scroll", updateJumpButton, { passive: true });
    return () => root.removeEventListener("scroll", updateJumpButton);
  }, [messages.length]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onHashChange = () => setHashTargetVersion((version) => version + 1);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const targetId = window.location.hash.match(/^#message-(.+)$/)?.[1];
    if (!targetId) return;

    const decodedTargetId = decodeURIComponent(targetId);
    const element = document.getElementById(`message-${decodedTargetId}`);

    if (!element) {
      if (hasNextPage && !isFetchingNextPage && !normalizedLocalSearch) {
        void fetchNextPage();
      }
      return;
    }

    element.scrollIntoView({ block: "center", behavior: "smooth" });
    setHighlightedMessageId(decodedTargetId);
    const timer = window.setTimeout(() => setHighlightedMessageId(null), 3500);
    return () => window.clearTimeout(timer);
  }, [fetchNextPage, hasNextPage, hashTargetVersion, isFetchingNextPage, normalizedLocalSearch, visibleMessages.length]);

  const scrollToLatest = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const renderMessage = (message: MessageWithMemberWithProfile) => {
    const systemEvent = parseGroupSystemEvent(message.content);
    const timestamp = format(new Date(message.createdAt), DATE_FORMAT);

    if (systemEvent) {
      return (
        <ChatSystemEvent
          key={message.id}
          id={message.id}
          event={systemEvent}
          timestamp={timestamp}
          highlighted={highlightedMessageId === message.id}
        />
      );
    }

    return (
      <ChatItem
        key={message.id}
        id={message.id}
        currentMember={member}
        member={message.member}
        content={message.content}
        fileUrl={message.fileUrl}
        deleted={message.deleted}
        timestamp={timestamp}
        isUpdated={new Date(message.updatedAt).getTime() !== new Date(message.createdAt).getTime()}
        socketUrl={socketUrl}
        socketQuery={socketQuery}
        queryKey={queryKey}
        chatType={type}
        reactions={message.reactions ?? []}
        savedByCurrentMember={!!message.savedBy?.length}
        pinned={message.pinned}
        parent={message.parentMessage ?? message.parentDirectMessage ?? null}
        poll={message.poll ?? null}
        outbox={!!message.outbox}
        repliesCount={message._count?.replies ?? 0}
        mentionNames={mentionNames}
        highlighted={highlightedMessageId === message.id}
        onReply={onReply}
        onOpenThread={type === "channel" ? onOpenThread : undefined}
        onOpenImage={setActiveImageUrl}
      />
    );
  };

  if (status === "pending") {
    return (
      <div className="flex flex-col flex-1 min-h-0 justify-center items-center">
        <Loader2 className="h-7 w-7 text-zinc-500 animate-spin my-4" />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Загрузка сообщений
        </p>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="flex flex-col flex-1 min-h-0 justify-center items-center">
        <ServerCrash className="h-7 w-7 text-zinc-500 my-4" />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Что-то пошло не так!
        </p>
      </div>
    )
  }

  return (
    <div className="relative flex-1 min-h-0">
      <div ref={chatRef} className="flex h-full flex-col overflow-y-auto py-4">
        <div className="sticky top-0 z-10 mx-3 mb-2 flex justify-end gap-2 sm:mx-4">
          {searchOpen && (
            <div className="flex min-w-0 flex-1 items-center rounded-full border border-zinc-200 bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
              <Search className="mr-2 h-4 w-4 shrink-0 text-zinc-400" />
              <input
                value={localSearch}
                onChange={(event) => setLocalSearch(event.target.value)}
                placeholder="Фильтр по загруженным сообщениям"
                className="min-w-0 flex-1 bg-transparent text-sm text-zinc-700 outline-none placeholder:text-zinc-400 dark:text-zinc-200"
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  setLocalSearch("");
                  setSearchOpen(false);
                }}
                className="ml-2 rounded-full p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                aria-label="Закрыть фильтр"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {!searchOpen && (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-zinc-500 shadow-sm backdrop-blur transition hover:bg-zinc-100 hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Search className="h-4 w-4" />
              Фильтр
            </button>
          )}
        </div>
        {!hasNextPage && <div className="flex-1" />}
        {!hasNextPage && !normalizedLocalSearch && (
          <ChatWelcome
            type={type}
            name={name}
          />
        )}
        <div ref={topRef} className="h-px" />
        {hasNextPage && !normalizedLocalSearch && (
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
        {normalizedLocalSearch && (
          <div className="px-4 pb-2 text-xs text-zinc-500 dark:text-zinc-400">
            Найдено в загруженных сообщениях: {visibleMessages.length}
          </div>
        )}
        {shouldVirtualize ? (
          <div
            className="relative w-full"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const message = visibleMessages[virtualItem.index];
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
            {visibleMessages.map((message) => renderMessage(message))}
          </div>
        )}
        {normalizedLocalSearch && visibleMessages.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            <Search className="mb-3 h-8 w-8" />
            Ничего не найдено среди уже загруженных сообщений.
          </div>
        )}
        {!!typingUsers.length && !normalizedLocalSearch && (
          <div className="flex items-center gap-2 px-4 pt-2 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex -space-x-2">
              {typingUsers.slice(0, 3).map((user) => (
                <UserAvatar
                  key={user.memberId}
                  src={user.imageUrl ?? undefined}
                  className="h-6 w-6 border-2 border-white dark:border-[#313338]"
                />
              ))}
            </div>
            <p>
              {typingUsers.slice(0, 3).map((user) => user.name).join(", ")} {typingUsers.length === 1 ? "печатает..." : "печатают..."}
            </p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {showJumpToBottom && !normalizedLocalSearch && (
        <button
          type="button"
          onClick={scrollToLatest}
          className="absolute bottom-4 right-4 z-20 inline-flex items-center gap-2 rounded-full bg-indigo-500 px-3 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-indigo-600"
        >
          <ArrowDown className="h-4 w-4" />
          К последним
        </button>
      )}
      <ImageLightbox
        images={imageUrls}
        activeUrl={activeImageUrl}
        onClose={() => setActiveImageUrl(null)}
        onChange={setActiveImageUrl}
      />
    </div>
  )
}
