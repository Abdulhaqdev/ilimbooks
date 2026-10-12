-- CreateTable: Lead (landing buyurtmalari — ism + telefon, ShoxMarket API)
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "offerId" TEXT,
    "stream" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "shoxOk" BOOLEAN NOT NULL DEFAULT false,
    "shoxId" TEXT,
    "shoxMessage" TEXT,
    "sid" TEXT,
    "page" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "referrer" TEXT,
    "ua" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");
