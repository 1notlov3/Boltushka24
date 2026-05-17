import qs from "query-string";
import { useCallback, useEffect } from "react";
import { InfiniteData, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";

interface ChatQueryProps {
  queryKey: string;
  apiUrl: string;
  paramKey: "channelId" | "conversationId";
  paramValue: string;
};

export type ChatMessagesPage = {
  items: unknown[];
  nextCursor: string | null;
};

export const useChatQuery = ({
  queryKey,
  apiUrl,
  paramKey,
  paramValue
}: ChatQueryProps) => {
  const queryClient = useQueryClient();

  const buildUrl = useCallback((cursor?: string) => qs.stringifyUrl({
    url: apiUrl,
    query: {
      cursor,
      [paramKey]: paramValue,
    }
  }, { skipNull: true }), [apiUrl, paramKey, paramValue]);

  const fetchPage = useCallback(async (cursor?: string): Promise<ChatMessagesPage> => {
    const res = await fetch(buildUrl(cursor), {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error("Failed to fetch messages");
    }

    return res.json() as Promise<ChatMessagesPage>;
  }, [buildUrl]);

  const fetchMessages = async ({ pageParam = undefined }: { pageParam?: string }) => {
    const url = qs.stringifyUrl({
      url: apiUrl,
      query: {
        cursor: pageParam,
        [paramKey]: paramValue,
      }
    }, { skipNull: true });

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("Failed to fetch messages");
    }

    return res.json() as Promise<ChatMessagesPage>;
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: [queryKey],
    queryFn: fetchMessages,
    getNextPageParam: (lastPage) => lastPage?.nextCursor,
    initialPageParam: undefined,
    staleTime: 30_000,
    gcTime: 300_000,
  });

  useEffect(() => {
    const handleReconnect = () => {
      void fetchPage().then((freshPage) => {
        queryClient.setQueryData<InfiniteData<ChatMessagesPage>>([queryKey], (old) => {
          if (!old) {
            return {
              pages: [freshPage],
              pageParams: [undefined],
            };
          }

          return {
            ...old,
            pages: [freshPage, ...old.pages.slice(1)],
          };
        });
      }).catch((error: unknown) => {
        console.error("[CHAT_RECONNECT_REFETCH]", error);
      });
    };

    window.addEventListener("rt:reconnect", handleReconnect);
    return () => window.removeEventListener("rt:reconnect", handleReconnect);
  }, [fetchPage, queryClient, queryKey]);

  return {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  };
}
