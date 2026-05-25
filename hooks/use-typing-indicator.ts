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
export const TYPING_TTL = 3500;

export function upsertTypingUser(current: TypingPayload[], payload: TypingPayload) {
  return [
    ...current.filter((item) => item.memberId !== payload.memberId),
    payload,
  ];
}

export function removeTypingUser(current: TypingPayload[], memberId: string) {
  return current.filter((item) => item.memberId !== memberId);
}

export function useTypingIndicator(chatId: string, currentMemberId: string, serverId?: string) {
  const topic = useMemo(() => `typing:${chatId}`, [chatId]);
  const serverTopic = useMemo(() => serverId ? `typing:server:${serverId}` : null, [serverId]);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabaseBrowser>["channel"]> | null>(null);
  const serverChannelRef = useRef<ReturnType<ReturnType<typeof getSupabaseBrowser>["channel"]> | null>(null);
  const expiryTimersRef = useRef<Map<string, number>>(new Map());
  const [typing, setTyping] = useState<TypingPayload[]>([]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase.channel(topic, { config: { broadcast: { self: false } } });
    channelRef.current = channel;

    channel.on("broadcast", { event: TYPING_EVENT }, (event: { payload: TypingPayload }) => {
      const payload = event.payload;
      if (!payload?.memberId || payload.memberId === currentMemberId) return;

      setTyping((current) => upsertTypingUser(current, payload));

      const existingTimer = expiryTimersRef.current.get(payload.memberId);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }

      const nextTimer = window.setTimeout(() => {
        expiryTimersRef.current.delete(payload.memberId);
        setTyping((current) => removeTypingUser(current, payload.memberId));
      }, TYPING_TTL);
      expiryTimersRef.current.set(payload.memberId, nextTimer);
    });

    channel.subscribe();

    const serverChannel = serverTopic
      ? supabase.channel(serverTopic, { config: { broadcast: { self: false } } })
      : null;
    serverChannelRef.current = serverChannel;
    serverChannel?.subscribe();

    const expiryTimers = expiryTimersRef.current;

    return () => {
      expiryTimers.forEach((timer) => window.clearTimeout(timer));
      expiryTimers.clear();
      setTyping([]);
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
