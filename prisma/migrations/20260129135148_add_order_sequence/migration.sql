/*
  Warnings:

  - You are about to drop the column `type` on the `Movement` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[companyId,userId]` on the table `CompanyUser` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[refreshToken]` on the table `Session` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,itemId,locationId]` on the table `StockThreshold` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `movementType` to the `Movement` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CompanyRole" ADD VALUE 'CUSTOMER_ADMIN';
ALTER TYPE "CompanyRole" ADD VALUE 'EMPLOYEE';

-- AlterEnum
ALTER TYPE "ReservationStatus" ADD VALUE 'RELEASED';

-- DropIndex
DROP INDEX "CompanyUser_userId_companyId_key";

-- DropIndex
DROP INDEX "Movement_type_idx";

-- DropIndex
DROP INDEX "Session_refreshToken_idx";

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "description" TEXT,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Movement" DROP COLUMN "type",
ADD COLUMN     "movementType" "MovementType" NOT NULL,
ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "StockThreshold" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "note" TEXT;

-- CreateTable
CREATE TABLE "OrderSequence" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNo" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderSequence_companyId_idx" ON "OrderSequence"("companyId");

-- CreateIndex
CREATE INDEX "OrderSequence_year_idx" ON "OrderSequence"("year");

-- CreateIndex
CREATE UNIQUE INDEX "OrderSequence_companyId_year_key" ON "OrderSequence"("companyId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyUser_companyId_userId_key" ON "CompanyUser"("companyId", "userId");

-- CreateIndex
CREATE INDEX "Movement_movementType_idx" ON "Movement"("movementType");

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshToken_key" ON "Session"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "StockThreshold_companyId_itemId_locationId_key" ON "StockThreshold"("companyId", "itemId", "locationId");

-- AddForeignKey
ALTER TABLE "OrderSequence" ADD CONSTRAINT "OrderSequence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
