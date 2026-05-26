-- CreateEnum
CREATE TYPE "ModerationReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ModerationReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'HATE', 'NSFW', 'VIOLENCE', 'SCAM', 'OTHER');

-- CreateTable
CREATE TABLE "ModerationReport" (
  "id" TEXT NOT NULL,
  "serverId" TEXT NOT NULL,
  "reporterMemberId" TEXT NOT NULL,
  "targetMemberId" TEXT,
  "messageId" TEXT,
  "reason" "ModerationReportReason" NOT NULL,
  "comment" VARCHAR(1000),
  "status" "ModerationReportStatus" NOT NULL DEFAULT 'OPEN',
  "resolvedById" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ModerationReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerBan" (
  "id" TEXT NOT NULL,
  "serverId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "moderatorId" TEXT,
  "moderatorProfileId" TEXT,
  "reason" VARCHAR(1000),
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServerBan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberTimeout" (
  "id" TEXT NOT NULL,
  "serverId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "moderatorId" TEXT,
  "moderatorProfileId" TEXT,
  "reason" VARCHAR(1000),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MemberTimeout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModerationReport_serverId_status_createdAt_idx" ON "ModerationReport"("serverId", "status", "createdAt");
CREATE INDEX "ModerationReport_reporterMemberId_idx" ON "ModerationReport"("reporterMemberId");
CREATE INDEX "ModerationReport_targetMemberId_idx" ON "ModerationReport"("targetMemberId");
CREATE INDEX "ModerationReport_messageId_idx" ON "ModerationReport"("messageId");
CREATE UNIQUE INDEX "ServerBan_serverId_profileId_key" ON "ServerBan"("serverId", "profileId");
CREATE INDEX "ServerBan_serverId_revokedAt_expiresAt_idx" ON "ServerBan"("serverId", "revokedAt", "expiresAt");
CREATE INDEX "ServerBan_profileId_idx" ON "ServerBan"("profileId");
CREATE INDEX "MemberTimeout_serverId_memberId_expiresAt_idx" ON "MemberTimeout"("serverId", "memberId", "expiresAt");
CREATE INDEX "MemberTimeout_serverId_revokedAt_expiresAt_idx" ON "MemberTimeout"("serverId", "revokedAt", "expiresAt");

-- AddForeignKey
ALTER TABLE "ModerationReport" ADD CONSTRAINT "ModerationReport_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModerationReport" ADD CONSTRAINT "ModerationReport_reporterMemberId_fkey" FOREIGN KEY ("reporterMemberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModerationReport" ADD CONSTRAINT "ModerationReport_targetMemberId_fkey" FOREIGN KEY ("targetMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ModerationReport" ADD CONSTRAINT "ModerationReport_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ModerationReport" ADD CONSTRAINT "ModerationReport_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServerBan" ADD CONSTRAINT "ServerBan_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServerBan" ADD CONSTRAINT "ServerBan_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServerBan" ADD CONSTRAINT "ServerBan_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServerBan" ADD CONSTRAINT "ServerBan_moderatorProfileId_fkey" FOREIGN KEY ("moderatorProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MemberTimeout" ADD CONSTRAINT "MemberTimeout_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberTimeout" ADD CONSTRAINT "MemberTimeout_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberTimeout" ADD CONSTRAINT "MemberTimeout_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MemberTimeout" ADD CONSTRAINT "MemberTimeout_moderatorProfileId_fkey" FOREIGN KEY ("moderatorProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
