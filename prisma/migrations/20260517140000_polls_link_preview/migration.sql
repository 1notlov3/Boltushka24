-- CreateTable
CREATE TABLE "Poll" (
    "id" TEXT NOT NULL,
    "messageId" TEXT,
    "directMessageId" TEXT,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "multiple" BOOLEAN NOT NULL DEFAULT false,
    "closesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollVote" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PollVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkPreview" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "image" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkPreview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Poll_messageId_key" ON "Poll"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "Poll_directMessageId_key" ON "Poll"("directMessageId");

-- CreateIndex
CREATE INDEX "Poll_messageId_idx" ON "Poll"("messageId");

-- CreateIndex
CREATE INDEX "Poll_directMessageId_idx" ON "Poll"("directMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "PollVote_pollId_memberId_optionId_key" ON "PollVote"("pollId", "memberId", "optionId");

-- CreateIndex
CREATE INDEX "PollVote_memberId_idx" ON "PollVote"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "LinkPreview_url_key" ON "LinkPreview"("url");

-- CreateIndex
CREATE INDEX "LinkPreview_fetchedAt_idx" ON "LinkPreview"("fetchedAt");

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_directMessageId_fkey" FOREIGN KEY ("directMessageId") REFERENCES "DirectMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
