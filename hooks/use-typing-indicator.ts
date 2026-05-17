"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getSupabaseBrowser } from "@/lib/supabase";

type TypingPayload = {
  chatId?: string;
  memberId: string;
  name: string;
  imageUrl?: string | null;
};

const TYPING_EVENT = "typing";
const TYPING_TTL = 3500;

export function useTypingIndicator(chatId: string, currentMemberId: string, serverId?: string) {
  const topic = useMemo(() => `typing:${chatId}`, [chatId]);
  const serverTopic = useMemo(() => serverId ? `typing:server:${serverId}` : null, [serverId]);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabaseBrowser>["channel"]> | null>(null);
  const serverChannelRef = useRef<ReturnType<ReturnType<typeof getSupabaseBrowser>["channel"]> | null>(null);
  const [typing, setTyping] = useState<TypingPayload[]>([]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase.channel(topic, { config: { broadcast: { self: false } } });
    channelRef.current = channel;

    channel.on("broadcast", { event: TYPING_EVENT }, (event: { payload: TypingPayload }) => {
      const payload = event.payload;
      if (!payload?.memberId || payload.memberId === currentMemberId) return;

      setTyping((current) => [
        ...current.filter((item) => item.memberId !== payload.memberId),
        payload,
      ]);

      window.setTimeout(() => {
        setTyping((current) => current.filter((item) => item.memberId !== payload.memberId));
      }, TYPING_TTL);
    });

    channel.subscribe();

    const serverChannel = serverTopic
      ? supabase.channel(serverTopic, { config: { broadcast: { self: false } } })
      : null;
    serverChannelRef.current = serverChannel;
    serverChannel?.subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (serverChannel) {
        supabase.removeChannel(serverChannel);
      }
      channelRef.current = null;
      serverChannelRef.current = null;
    };
  }, [currentMemberId, serverTopic, topic]);

  const sendTyping = useCallback((payload: TypingPayload) => {
    const normalizedPayload = {
      ...payload,
      chatId,
    };

    channelRef.current?.send({
      type: "broadcast",
      event: TYPING_EVENT,
      payload: normalizedPayload,
    });
    serverChannelRef.current?.send({
      type: "broadcast",
      event: TYPING_EVENT,
      payload: normalizedPayload,
    });
  }, [chatId]);

  return {
    typing,
    sendTyping,
  };
}
