-- Ko'p akkaunt + ko'p market (CPA tizimi) uchun
-- 1) Akkauntlar
CREATE TABLE "Account" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("code")
);

INSERT INTO "Account" ("code", "name", "sortOrder") VALUES ('nazir', 'Ilimbooks', 0);

-- 2) Marketlar
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL DEFAULT '',
    "apiKey" TEXT NOT NULL DEFAULT '',
    "defaultStream" TEXT NOT NULL DEFAULT '',
    "defaultOfferId" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Market_account_code_key" ON "Market"("account", "code");
CREATE INDEX "Market_account_idx" ON "Market"("account");

-- 3) Landing: akkaunt, market, umumlashtirilgan stream/offerId
ALTER TABLE "Landing" RENAME COLUMN "shoxStream" TO "stream";
ALTER TABLE "Landing" RENAME COLUMN "shoxOfferId" TO "offerId";
ALTER TABLE "Landing" ADD COLUMN "account" TEXT NOT NULL DEFAULT 'nazir';
ALTER TABLE "Landing" ADD COLUMN "marketId" TEXT;
CREATE INDEX "Landing_account_idx" ON "Landing"("account");

-- 4) Lead: akkaunt va market izi
ALTER TABLE "Lead" ADD COLUMN "account" TEXT NOT NULL DEFAULT 'nazir';
ALTER TABLE "Lead" ADD COLUMN "marketId" TEXT;
ALTER TABLE "Lead" ADD COLUMN "marketName" TEXT;
CREATE INDEX "Lead_account_idx" ON "Lead"("account");

-- 5) Mavjud ShoxMarket sozlamalarini Market yozuviga ko'chiramiz
INSERT INTO "Market" ("id", "account", "code", "name", "endpoint", "apiKey", "defaultStream", "defaultOfferId", "sortOrder", "createdAt", "updatedAt")
SELECT
    'mkt_shox_nazir',
    'nazir',
    'shoxmarket',
    'ShoxMarket',
    COALESCE(NULLIF((SELECT "value" FROM "Setting" WHERE "key" = 'shox_endpoint'), ''), 'https://api.shoxmarket.uz/create'),
    COALESCE((SELECT "value" FROM "Setting" WHERE "key" = 'shox_api_key'), ''),
    COALESCE((SELECT "value" FROM "Setting" WHERE "key" = 'shox_stream'), ''),
    COALESCE((SELECT "value" FROM "Setting" WHERE "key" = 'shox_offer_id'), ''),
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP;

UPDATE "Landing" SET "marketId" = 'mkt_shox_nazir' WHERE "marketId" IS NULL;
UPDATE "Lead" SET "marketId" = 'mkt_shox_nazir', "marketName" = 'ShoxMarket' WHERE "marketId" IS NULL;

-- 6) Sozlama kalitlari akkaunt bo'yicha prefikslanadi (nazir:meta_pixel)
UPDATE "Setting" SET "key" = 'nazir:' || "key" WHERE "key" IN ('meta_pixel', 'meta_capi_token');
DELETE FROM "Setting" WHERE "key" IN ('shox_endpoint', 'shox_api_key', 'shox_stream', 'shox_offer_id');
