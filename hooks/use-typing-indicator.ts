"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getSupabaseBrowser } from "@/lib/supabase";

type TypingPayload = {
  memberId: string;
  name: string;
};

const TYPING_EVENT = "typing";
const TYPING_TTL = 3500;

export function useTypingIndicator(chatId: string, currentMemberId: string) {
  const topic = useMemo(() => `typing:${chatId}`, [chatId]);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabaseBrowser>["channel"]> | null>(null);
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

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [currentMemberId, topic]);

  const sendTyping = useCallback((payload: TypingPayload) => {
    channelRef.current?.send({
      type: "broadcast",
      event: TYPING_EVENT,
      payload,
    });
  }, []);

  return {
    typing,
    sendTyping,
  };
}
