import type { WatchQueueItem } from "@prisma/client";

type WatchQueueItemWithVotes = WatchQueueItem & {
  _count?: {
    votes?: number;
  };
  votes?: Array<{ id: string }>;
};

export type WatchQueueViewItem = Omit<WatchQueueItem, never> & {
  voteCount: number;
  votedByMe: boolean;
};

export function normalizeWatchQueueItem(item: WatchQueueItemWithVotes): WatchQueueViewItem {
  return {
    ...item,
    voteCount: item._count?.votes ?? 0,
    votedByMe: (item.votes?.length ?? 0) > 0,
  };
}

export function sortWatchQueueItems<T extends { position: number; createdAt?: Date | string; voteCount?: number }>(items: T[]) {
  return [...items].sort((a, b) => {
    const voteDiff = (b.voteCount ?? 0) - (a.voteCount ?? 0);
    if (voteDiff !== 0) return voteDiff;

    const positionDiff = a.position - b.position;
    if (positionDiff !== 0) return positionDiff;

    const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return aCreated - bCreated;
  });
}
