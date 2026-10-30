/*
  Warnings:

  - The primary key for the `StockBalance` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `StockBalance` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `updatedAt` to the `Company` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Company"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;


-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "parentId" INTEGER;

-- AlterTable
-- StockBalance: id'ye dokunma (data kaybı olmasın)
ALTER TABLE "StockBalance"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Eğer zaten unique yoksa: tek satır garantisi
-- (Company+Item+Location)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'StockBalance_companyId_itemId_locationId_key'
  ) THEN
    CREATE UNIQUE INDEX "StockBalance_companyId_itemId_locationId_key"
      ON "StockBalance" ("companyId","itemId","locationId");
  END IF;
END$$;


-- CreateIndex
CREATE INDEX "Location_parentId_idx" ON "Location"("parentId");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
