-- AlterTable
ALTER TABLE "Business" ADD COLUMN "primaryFont" TEXT NOT NULL DEFAULT 'INTER';
ALTER TABLE "Business" ADD COLUMN "secondaryFont" TEXT NOT NULL DEFAULT 'PLAYFAIR_DISPLAY';
ALTER TABLE "Business" ADD COLUMN "primaryColor" TEXT NOT NULL DEFAULT '#1b625a';
ALTER TABLE "Business" ADD COLUMN "secondaryColor" TEXT NOT NULL DEFAULT '#f2c7bb';
ALTER TABLE "Business" ADD COLUMN "backgroundColor" TEXT NOT NULL DEFAULT '#f4ece3';
ALTER TABLE "Business" ADD COLUMN "textColor" TEXT NOT NULL DEFAULT '#221d18';

-- CreateTable
CREATE TABLE "BrandAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "data" BLOB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BrandAsset_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandAsset_businessId_kind_key" ON "BrandAsset"("businessId", "kind");
