-- AlterTable
ALTER TABLE "Channel" ADD COLUMN "slowModeSeconds" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ServerRole" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "MemberServerRole" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberServerRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberServerRole_memberId_roleId_key" ON "MemberServerRole"("memberId", "roleId");

-- CreateIndex
CREATE INDEX "MemberServerRole_memberId_idx" ON "MemberServerRole"("memberId");

-- CreateIndex
CREATE INDEX "MemberServerRole_roleId_idx" ON "MemberServerRole"("roleId");

-- DropIndex
DROP INDEX IF EXISTS "ServerRole_serverId_idx";

-- CreateIndex
CREATE INDEX "ServerRole_serverId_position_idx" ON "ServerRole"("serverId", "position");

-- AddForeignKey
ALTER TABLE "MemberServerRole" ADD CONSTRAINT "MemberServerRole_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberServerRole" ADD CONSTRAINT "MemberServerRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "ServerRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
