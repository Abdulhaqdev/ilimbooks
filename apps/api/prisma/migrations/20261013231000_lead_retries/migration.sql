-- Uzatilmagan buyurtmalarni avtomatik qayta yuborish
ALTER TABLE "Lead" ADD COLUMN "tries" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Lead" ADD COLUMN "lastTryAt" TIMESTAMP(3);
