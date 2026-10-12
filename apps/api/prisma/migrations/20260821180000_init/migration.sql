-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sid" TEXT NOT NULL,
    "page" TEXT NOT NULL DEFAULT '/',
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "referrer" TEXT,
    "ua" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "maxScroll" INTEGER NOT NULL DEFAULT 0,
    "dwellMs" INTEGER NOT NULL DEFAULT 0,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "elId" TEXT,
    "elText" TEXT,
    "scrollPct" INTEGER,
    "dwellMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");
CREATE UNIQUE INDEX "Session_sid_key" ON "Session"("sid");
CREATE INDEX "Session_lastSeen_idx" ON "Session"("lastSeen");
CREATE INDEX "Session_firstSeen_idx" ON "Session"("firstSeen");
CREATE INDEX "Session_converted_idx" ON "Session"("converted");
CREATE INDEX "Session_utmContent_idx" ON "Session"("utmContent");
CREATE INDEX "Session_utmSource_idx" ON "Session"("utmSource");
CREATE INDEX "Session_utmCampaign_idx" ON "Session"("utmCampaign");
CREATE INDEX "Event_sessionId_idx" ON "Event"("sessionId");
CREATE INDEX "Event_type_idx" ON "Event"("type");
CREATE INDEX "Event_createdAt_idx" ON "Event"("createdAt");

ALTER TABLE "Event" ADD CONSTRAINT "Event_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
