-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('DIRECT', 'GROUP');

-- CreateEnum
CREATE TYPE "ConversationParticipantRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "type" "ConversationType" NOT NULL DEFAULT 'DIRECT';
ALTER TABLE "Conversation" ADD COLUMN "name" VARCHAR(120);
ALTER TABLE "Conversation" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "serverId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Conversation" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill server scope for existing direct conversations.
UPDATE "Conversation" c
SET "serverId" = m."serverId"
FROM "Member" m
WHERE c."memberOneId" = m."id" AND c."serverId" IS NULL;

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" "ConversationParticipantRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "mutedUntil" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- Backfill direct conversation participants.
INSERT INTO "ConversationParticipant" (
    "id",
    "conversationId",
    "memberId",
    "role",
    "joinedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    c."id",
    c."memberOneId",
    'MEMBER',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Conversation" c
ON CONFLICT DO NOTHING;

INSERT INTO "ConversationParticipant" (
    "id",
    "conversationId",
    "memberId",
    "role",
    "joinedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    c."id",
    c."memberTwoId",
    'MEMBER',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Conversation" c
ON CONFLICT DO NOTHING;

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_memberId_key" ON "ConversationParticipant"("conversationId", "memberId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_memberId_idx" ON "ConversationParticipant"("memberId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_conversationId_idx" ON "ConversationParticipant"("conversationId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_memberId_leftAt_idx" ON "ConversationParticipant"("memberId", "leftAt");

-- CreateIndex
CREATE INDEX "Conversation_type_idx" ON "Conversation"("type");

-- CreateIndex
CREATE INDEX "Conversation_serverId_idx" ON "Conversation"("serverId");

-- CreateIndex
CREATE INDEX "Conversation_ownerId_idx" ON "Conversation"("ownerId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
