import { useEffect, useState } from "react";
import { throttle } from "@/lib/utils";

type ChatScrollProps = {
  chatRef: React.RefObject<HTMLDivElement>;
  bottomRef: React.RefObject<HTMLDivElement>;
  shouldLoadMore: boolean;
  loadMore: () => void;
  count: number;
};

export const useChatScroll = ({
  chatRef,
  bottomRef,
  shouldLoadMore,
  loadMore,
  count,
}: ChatScrollProps) => {
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    const topDiv = chatRef?.current;

    // ⚡ Bolt Optimization: Throttle scroll event listener
    // This prevents the scroll handler from firing on every pixel scroll (high frequency),
    // reducing Main Thread overhead especially on mobile devices.
    const handleScroll = throttle(() => {
      const scrollTop = topDiv?.scrollTop;

      if (scrollTop === 0 && shouldLoadMore) {
        loadMore()
      }
    }, 100);

    topDiv?.addEventListener("scroll", handleScroll);

    return () => {
      topDiv?.removeEventListener("scroll", handleScroll);
      handleScroll.cancel();
    }
  }, [shouldLoadMore, loadMore, chatRef]);

  useEffect(() => {
    const bottomDiv = bottomRef?.current;
    const topDiv = chatRef.current;
    const shouldAutoScroll = () => {
      if (!hasInitialized && bottomDiv) {
        setHasInitialized(true);
        return true;
      }

      if (!topDiv) {
        return false;
      }

      const distanceFromBottom = topDiv.scrollHeight - topDiv.scrollTop - topDiv.clientHeight;
      return distanceFromBottom <= 100;
    }

    if (shouldAutoScroll()) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({
          behavior: "smooth",
        });
      }, 100);
    }
  }, [bottomRef, chatRef, count, hasInitialized]);
}
