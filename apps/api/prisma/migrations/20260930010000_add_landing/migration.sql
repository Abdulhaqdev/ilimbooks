-- CreateTable
CREATE TABLE "Landing" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "template" TEXT NOT NULL DEFAULT 'full',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "content" JSONB NOT NULL,
    "pixelId" TEXT NOT NULL DEFAULT '',
    "shoxStream" TEXT NOT NULL DEFAULT '',
    "shoxOfferId" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Landing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Landing_slug_key" ON "Landing"("slug");
