-- Add per-account dimension to Session (default existing rows to "nazir")
ALTER TABLE "Session" ADD COLUMN "account" TEXT NOT NULL DEFAULT 'nazir';

-- CreateIndex
CREATE INDEX "Session_account_idx" ON "Session"("account");
