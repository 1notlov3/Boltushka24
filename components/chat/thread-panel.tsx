"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { Member, Message, Profile } from "@prisma/client";
import { Loader2, X } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatItem } from "@/components/chat/chat-item";
import { useChatSocket } from "@/hooks/use-chat-socket";
import type { ReplyTarget } from "@/components/chat/chat-shell";
import type { PollData } from "@/components/chat/poll-block";

const DATE_FORMAT = "d MMM yyyy, HH:mm";

type ThreadMessage = Message & {
  member: Member & { profile: Profile };
  reactions?: { id: string; emoji: string; memberId: string }[];
  savedBy?: { id: string }[];
  parentMessage?: {
    id: string;
    content: string;
    deleted: boolean;
    member: Member & { profile: Profile };
  } | null;
  _count?: {
    replies?: number;
  };
  poll?: PollData | null;
};

type ThreadPage = {
  parent: ThreadMessage;
  items: ThreadMessage[];
  nextCursor: string | null;
};

interface ThreadPanelProps {
  messageId: string;
  currentMember: Member & { profile: Profile };
  socketUrl: string;
  socketQuery: Record<string, string>;
  onClose: () => void;
}

export const ThreadPanel = ({
  messageId,
  currentMember,
  socketUrl,
  socketQuery,
  onClose,
}: ThreadPanelProps) => {
  const queryKey = `thread:${messageId}`;
  const addKey = `thread:${messageId}:messages`;
  const updateKey = `chat:${socketQuery.channelId}:messages:update`;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useInfiniteQuery({
    queryKey: [queryKey],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set("cursor", pageParam);

      const response = await fetch(`/api/messages/${messageId}/thread?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) throw new Error("Failed to fetch thread");
      return response.json() as Promise<ThreadPage>;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
    gcTime: 300_000,
  });

  const parent = data?.pages[0]?.parent;
  const replies = useMemo(() => (
    (data?.pages.flatMap((page) => page.items) ?? [])
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  ), [data]);

  useChatSocket({
    queryKey,
    addKey,
    updateKey,
    type: "channel",
    currentMemberId: currentMember.id,
    serverId: socketQuery.serverId,
  });

  const parentReply: ReplyTarget | null = parent
    ? {
        id: parent.id,
        content: parent.content,
        authorName: parent.member.profile.name,
      }
    : null;

  const renderMessage = (message: ThreadMessage, repliesCount = 0) => (
    <ChatItem
      key={message.id}
      id={message.id}
      currentMember={currentMember}
      member={message.member}
      content={message.content}
      fileUrl={message.fileUrl}
      deleted={message.deleted}
      timestamp={format(new Date(message.createdAt), DATE_FORMAT)}
      isUpdated={message.updatedAt !== message.createdAt}
      socketUrl={socketUrl}
      socketQuery={socketQuery}
      queryKey={queryKey}
      chatType="channel"
      reactions={message.reactions ?? []}
      savedByCurrentMember={!!message.savedBy?.length}
      pinned={message.pinned}
      parent={message.parentMessage ?? null}
      poll={message.poll ?? null}
      repliesCount={repliesCount}
      onReply={() => undefined}
    />
  );

  return (
    <aside className="fixed inset-0 z-40 flex flex-col border-l border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-[#313338] md:left-auto md:w-[420px]">
      <header className="flex h-14 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Тред: {parent?.content ? parent.content.slice(0, 80) : "сообщение"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Закрыть тред"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto py-3">
        {status === "pending" && (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          </div>
        )}
        {status === "error" && (
          <p className="px-4 text-sm text-zinc-500">Не удалось загрузить тред.</p>
        )}
        {parent && (
          <>
            {renderMessage(parent, parent._count?.replies ?? 0)}
            <div className="mx-4 my-3 h-px bg-zinc-200 dark:bg-zinc-800" />
          </>
        )}
        {replies.map((reply) => renderMessage(reply))}
        {hasNextPage && (
          <div className="flex justify-center py-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isFetchingNextPage}
              onClick={() => fetchNextPage()}
            >
              {isFetchingNextPage ? "Загрузка..." : "Загрузить ещё"}
            </Button>
          </div>
        )}
      </div>

      {parentReply && (
        <ChatInput
          name="тред"
          type="channel"
          apiUrl={socketUrl}
          query={socketQuery}
          queryKey={queryKey}
          currentMember={currentMember}
          replyTo={parentReply}
          onClearReply={() => undefined}
        />
      )}
    </aside>
  );
};
