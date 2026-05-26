-- Add opt-in public server discovery fields.
ALTER TABLE "Server" ADD COLUMN "description" VARCHAR(500);
ALTER TABLE "Server" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Server_isPublic_updatedAt_idx" ON "Server"("isPublic", "updatedAt");
