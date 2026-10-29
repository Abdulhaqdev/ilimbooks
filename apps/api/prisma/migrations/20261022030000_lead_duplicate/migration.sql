-- AlterTable
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "duplicateOf" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_offerId_idx" ON "Lead"("offerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_clientIp_idx" ON "Lead"("clientIp");
