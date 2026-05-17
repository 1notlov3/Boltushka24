-- CreateTable
CREATE TABLE "WatchSession" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "currentVideoId" TEXT,
    "currentTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isPlaying" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "updatedByName" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchQueueItem" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "title" TEXT,
    "thumbnail" TEXT,
    "addedById" TEXT NOT NULL,
    "addedByName" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchQueueItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WatchSession_channelId_key" ON "WatchSession"("channelId");

-- CreateIndex
CREATE INDEX "WatchSession_channelId_idx" ON "WatchSession"("channelId");

-- CreateIndex
CREATE INDEX "WatchQueueItem_sessionId_position_idx" ON "WatchQueueItem"("sessionId", "position");

-- AddForeignKey
ALTER TABLE "WatchSession" ADD CONSTRAINT "WatchSession_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchQueueItem" ADD CONSTRAINT "WatchQueueItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WatchSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
