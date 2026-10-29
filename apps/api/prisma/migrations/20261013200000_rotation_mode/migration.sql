-- Rotatsiya rejimi: "visit" — har ochilishda keyingi variant, "sticky" — tashrifchiga bitta variant
ALTER TABLE "Rotation" ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'visit';
