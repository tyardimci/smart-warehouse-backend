/*
  Warnings:

  - You are about to drop the column `orderRef` on the `Reservation` table. All the data in the column will be lost.
  - The primary key for the `StockBalance` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[replacedById]` on the table `RefreshToken` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Location" ALTER COLUMN "type" SET DEFAULT 'WAREHOUSE';

-- AlterTable
ALTER TABLE "RefreshToken" ADD COLUMN     "replacedById" TEXT;

-- AlterTable
ALTER TABLE "Reservation" DROP COLUMN "orderRef",
ADD COLUMN     "consumedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StockBalance" DROP CONSTRAINT "StockBalance_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "StockBalance_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "StockBalance_id_seq";

-- AlterTable
ALTER TABLE "StockThreshold" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "note" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_replacedById_key" ON "RefreshToken"("replacedById");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_replacedById_fkey" FOREIGN KEY ("replacedById") REFERENCES "RefreshToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;
