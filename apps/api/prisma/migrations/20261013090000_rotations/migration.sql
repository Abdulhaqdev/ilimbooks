-- Rotatsiya: bitta havola ichida bir nechta landing navbat bilan ko'rsatiladi (A/B test)
CREATE TABLE "Rotation" (
    "id" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "cursor" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Rotation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Rotation_slug_key" ON "Rotation"("slug");
CREATE INDEX "Rotation_account_idx" ON "Rotation"("account");

CREATE TABLE "RotationVariant" (
    "id" TEXT NOT NULL,
    "rotationId" TEXT NOT NULL,
    "landingId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RotationVariant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RotationVariant_rotationId_landingId_key" ON "RotationVariant"("rotationId", "landingId");
CREATE INDEX "RotationVariant_rotationId_idx" ON "RotationVariant"("rotationId");
CREATE INDEX "RotationVariant_landingId_idx" ON "RotationVariant"("landingId");

ALTER TABLE "RotationVariant" ADD CONSTRAINT "RotationVariant_rotationId_fkey"
    FOREIGN KEY ("rotationId") REFERENCES "Rotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RotationVariant" ADD CONSTRAINT "RotationVariant_landingId_fkey"
    FOREIGN KEY ("landingId") REFERENCES "Landing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Qaysi variant ko'rsatilgani — statistika uchun
ALTER TABLE "Session" ADD COLUMN "variant" TEXT;
CREATE INDEX "Session_variant_idx" ON "Session"("variant");
ALTER TABLE "Lead" ADD COLUMN "variant" TEXT;
