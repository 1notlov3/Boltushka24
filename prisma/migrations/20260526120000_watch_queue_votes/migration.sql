-- Add queue voting for Watch Together.
CREATE TABLE "WatchQueueVote" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchQueueVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WatchQueueVote_itemId_memberId_key" ON "WatchQueueVote"("itemId", "memberId");
CREATE INDEX "WatchQueueVote_memberId_idx" ON "WatchQueueVote"("memberId");
CREATE INDEX "WatchQueueVote_itemId_createdAt_idx" ON "WatchQueueVote"("itemId", "createdAt");

ALTER TABLE "WatchQueueVote" ADD CONSTRAINT "WatchQueueVote_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "WatchQueueItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WatchQueueVote" ADD CONSTRAINT "WatchQueueVote_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
