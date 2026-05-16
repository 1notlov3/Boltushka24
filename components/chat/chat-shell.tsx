"use client";

import { useState } from "react";
import type { Member, Profile } from "@prisma/client";

import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessages } from "@/components/chat/chat-messages";
import { useTypingIndicator } from "@/hooks/use-typing-indicator";

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
    </>
  );
};
