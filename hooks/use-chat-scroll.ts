import { useEffect, useRef, useState } from "react";

type ChatScrollProps = {
  chatRef: React.RefObject<HTMLDivElement | null>;
  topRef: React.RefObject<HTMLDivElement | null>;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  shouldLoadMore: boolean;
  loadMore: () => void | Promise<unknown>;
  count: number;
};

export const useChatScroll = ({
  chatRef,
  topRef,
  bottomRef,
  shouldLoadMore,
  loadMore,
  count,
}: ChatScrollProps) => {
  const [hasInitialized, setHasInitialized] = useState(false);
  const isAtBottomRef = useRef(true);
  const preservedMessageIdRef = useRef<string | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    const root = chatRef.current;
    const top = topRef.current;

    if (!root || !top) return;

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;

      if (!entry?.isIntersecting || !shouldLoadMore || loadingRef.current) {
        return;
      }

      const firstVisible = Array.from(root.querySelectorAll<HTMLElement>("[data-message-id]"))
        .find((element) => {
          const elementRect = element.getBoundingClientRect();
          const rootRect = root.getBoundingClientRect();
          return elementRect.bottom > rootRect.top && elementRect.top < rootRect.bottom;
        });

      preservedMessageIdRef.current = firstVisible?.dataset.messageId ?? null;
      loadingRef.current = true;

      void Promise.resolve(loadMore()).finally(() => {
        loadingRef.current = false;
      });
    }, {
      root,
      rootMargin: "160px 0px 0px 0px",
      threshold: 0,
    });

    observer.observe(top);

    return () => {
      observer.disconnect();
    }
  }, [shouldLoadMore, loadMore, chatRef, topRef]);

  useEffect(() => {
    const root = chatRef.current;
    const bottom = bottomRef.current;

    if (!root || !bottom) return;

    const observer = new IntersectionObserver((entries) => {
      isAtBottomRef.current = !!entries[0]?.isIntersecting;
    }, {
      root,
      rootMargin: "0px 0px 120px 0px",
      threshold: 0,
    });

    observer.observe(bottom);

    return () => {
      observer.disconnect();
    };
  }, [bottomRef, chatRef]);

  useEffect(() => {
    const preservedMessageId = preservedMessageIdRef.current;

    if (preservedMessageId) {
      preservedMessageIdRef.current = null;
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>(`[data-message-id="${preservedMessageId}"]`)
          ?.scrollIntoView({ block: "start" });
      });
      return;
    }

    if (!hasInitialized) {
      setHasInitialized(true);
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView();
      });
      return;
    }

    if (isAtBottomRef.current) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({
          behavior: "smooth",
        });
      });
    }
  }, [bottomRef, chatRef, count, hasInitialized]);
}
