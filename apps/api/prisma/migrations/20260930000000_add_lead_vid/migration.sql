-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "vid" TEXT;

-- CreateIndex
CREATE INDEX "Lead_vid_idx" ON "Lead"("vid");
