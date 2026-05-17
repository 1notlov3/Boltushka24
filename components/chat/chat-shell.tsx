"use client";

import { useEffect, useState } from "react";
import type { Member, Profile } from "@prisma/client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ThreadPanel } from "@/components/chat/thread-panel";
import { useTypingIndicator } from "@/hooks/use-typing-indicator";
import { useUnreadCache } from "@/hooks/use-unread";
import { http } from "@/lib/http";

export type ReplyTarget = {
  id: string;
  content: string;
  authorName: string;
};

interface ChatShellProps {
  member: Member & { profile: Profile };
  name: string;
  chatId: string;
  type: "channel" | "conversation";
  apiUrl: string;
  socketUrl: string;
  socketQuery: Record<string, string>;
  paramKey: "channelId" | "conversationId";
  paramValue: string;
}

export const ChatShell = ({
  member,
  name,
  chatId,
  type,
  apiUrl,
  socketUrl,
  socketQuery,
  paramKey,
  paramValue,
}: ChatShellProps) => {
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const { typing, sendTyping } = useTypingIndicator(chatId, member.id);
  const { markRead } = useUnreadCache();
  const serverId = socketQuery.serverId;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const threadId = type === "channel" ? searchParams.get("thread") : null;

  useEffect(() => {
    const readUrl = type === "channel"
      ? `/api/channels/${paramValue}/read`
      : `/api/conversations/${paramValue}/read`;

    void http.post(readUrl)
      .then(() => {
        markRead(serverId, type, paramValue);
      })
      .catch((error: unknown) => {
        console.error("[MARK_READ]", error);
      });
  }, [markRead, paramValue, serverId, type]);

  const openThread = (messageId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("thread", messageId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const closeThread = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("thread");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <>
      <ChatMessages
        member={member}
        name={name}
        chatId={chatId}
        type={type}
        apiUrl={apiUrl}
        socketUrl={socketUrl}
        socketQuery={socketQuery}
        paramKey={paramKey}
        paramValue={paramValue}
        onReply={setReplyTo}
        onOpenThread={openThread}
        typingUsers={typing.map((item) => item.name)}
      />
      <ChatInput
        name={name}
        type={type}
        apiUrl={socketUrl}
        query={socketQuery}
        queryKey={`chat:${chatId}`}
        currentMember={member}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
        onTyping={() => sendTyping({ memberId: member.id, name: member.profile.name })}
      />
      {threadId && type === "channel" && (
        <ThreadPanel
          messageId={threadId}
          currentMember={member}
          socketUrl={socketUrl}
          socketQuery={socketQuery}
          onClose={closeThread}
        />
      )}
    </>
  );
};
