"use client";

import { useCallback } from "react";
import { QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";

export type UnreadData = {
  channels: Record<string, number>;
  conversations: Record<string, number>;
  total: number;
};

export type GlobalUnreadData = {
  total: number;
};

export const serverUnreadQueryKey = (serverId: string) => ["server-unread", serverId] as const;
export const globalUnreadQueryKey = ["global-unread"] as const;

const emptyUnread: UnreadData = {
  channels: {},
  conversations: {},
  total: 0,
};

export function useServerUnread(serverId?: string) {
  return useQuery({
    queryKey: serverUnreadQueryKey(serverId ?? ""),
    enabled: !!serverId,
    staleTime: 60_000,
    queryFn: async (): Promise<UnreadData> => {
      const response = await fetch(`/api/servers/${serverId}/unread`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch unread");
      return response.json() as Promise<UnreadData>;
    },
  });
}

export function useGlobalUnread() {
  return useQuery({
    queryKey: globalUnreadQueryKey,
    staleTime: 60_000,
    queryFn: async (): Promise<GlobalUnreadData> => {
      const response = await fetch("/api/unread/global", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch global unread");
      return response.json() as Promise<GlobalUnreadData>;
    },
  });
}

const recalculateTotal = (data: UnreadData) => (
  [...Object.values(data.channels), ...Object.values(data.conversations)]
    .reduce((sum, count) => sum + count, 0)
);

export function markReadInCache(
  queryClient: QueryClient,
  serverId: string | undefined,
  type: "channel" | "conversation",
  id: string,
) {
  if (!serverId) return;

  queryClient.setQueryData<UnreadData>(serverUnreadQueryKey(serverId), (old = emptyUnread) => {
    const next = {
      ...old,
      channels: { ...old.channels },
      conversations: { ...old.conversations },
    };

    if (type === "channel") {
      next.channels[id] = 0;
    } else {
      next.conversations[id] = 0;
    }

    next.total = recalculateTotal(next);
    return next;
  });

  void queryClient.invalidateQueries({ queryKey: globalUnreadQueryKey });
}

export function incrementUnreadInCache(
  queryClient: QueryClient,
  serverId: string | undefined,
  type: "channel" | "conversation",
  id: string,
) {
  if (!serverId) return;

  queryClient.setQueryData<UnreadData>(serverUnreadQueryKey(serverId), (old = emptyUnread) => {
    const next = {
      ...old,
      channels: { ...old.channels },
      conversations: { ...old.conversations },
    };

    if (type === "channel") {
      next.channels[id] = (next.channels[id] ?? 0) + 1;
    } else {
      next.conversations[id] = (next.conversations[id] ?? 0) + 1;
    }

    next.total = recalculateTotal(next);
    return next;
  });

  queryClient.setQueryData<GlobalUnreadData>(globalUnreadQueryKey, (old) => ({
    total: (old?.total ?? 0) + 1,
  }));
}

export function useUnreadCache() {
  const queryClient = useQueryClient();
  const markRead = useCallback((serverId: string | undefined, type: "channel" | "conversation", id: string) => {
    markReadInCache(queryClient, serverId, type, id);
  }, [queryClient]);

  const increment = useCallback((serverId: string | undefined, type: "channel" | "conversation", id: string) => {
    incrementUnreadInCache(queryClient, serverId, type, id);
  }, [queryClient]);

  return {
    markRead,
    increment,
  };
}
