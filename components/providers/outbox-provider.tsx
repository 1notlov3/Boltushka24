"use client";

import qs from "query-string";
import { useCallback, useEffect, useRef } from "react";
import { InfiniteData, useQueryClient } from "@tanstack/react-query";

import { http } from "@/lib/http";
import { listOutboxMessages, removeOutboxMessage, type OutboxMessage } from "@/lib/outbox";
import type { ChatMessagesPage } from "@/hooks/use-chat-query";

type CachedMessage = {
  id: string;
  outbox?: boolean;
  [key: string]: unknown;
};

function isCachedMessage(value: unknown): value is CachedMessage {
  return !!value && typeof value === "object" && typeof (value as { id?: unknown }).id === "string";
}

export function OutboxProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const flushingRef = useRef(false);

  const replaceQueuedMessage = useCallback((queued: OutboxMessage, message: CachedMessage) => {
    queryClient.setQueryData<InfiniteData<ChatMessagesPage>>([queued.queryKey], (old) => {
      if (!old?.pages?.length) return old;

      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: page.items.map((item) => (
            isCachedMessage(item) && item.id === queued.id ? message : item
          )),
        })),
      };
    });
  }, [queryClient]);

  const flush = useCallback(async () => {
    if (flushingRef.current || typeof navigator !== "undefined" && !navigator.onLine) return;
    flushingRef.current = true;

    try {
      const queuedMessages = await listOutboxMessages();

      for (const queued of queuedMessages.sort((a, b) => a.createdAt - b.createdAt)) {
        try {
          const { data } = await http.post<CachedMessage>(
            qs.stringifyUrl({ url: queued.apiUrl, query: queued.query }),
            queued.payload,
          );
          await removeOutboxMessage(queued.id);
          if (data?.id) {
            replaceQueuedMessage(queued, data);
          }
        } catch (error) {
          console.error("[OUTBOX_FLUSH]", error);
          break;
        }
      }
    } finally {
      flushingRef.current = false;
    }
  }, [replaceQueuedMessage]);

  useEffect(() => {
    void flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [flush]);

  return children;
}
