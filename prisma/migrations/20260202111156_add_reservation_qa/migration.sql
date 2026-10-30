/*
  Warnings:

  - The values [ADJUSTMENT] on the enum `MovementType` will be removed. If these variants are still used in the database, this will fail.
  - The primary key for the `CompanyUser` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `CompanyUser` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `CompanyUser` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `CompanyUser` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `OrderSequence` table. All the data in the column will be lost.
  - You are about to drop the column `lastNo` on the `OrderSequence` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `OrderSequence` table. All the data in the column will be lost.
  - You are about to drop the column `scannedQty` on the `ReservationQa` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `ReservationQa` table. All the data in the column will be lost.
  - You are about to drop the column `lastUsedAt` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `revokedAt` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `StockBalance` table. All the data in the column will be lost.
  - You are about to drop the column `fullName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `globalRole` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[companyId]` on the table `OrderSequence` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `barcode` to the `ReservationQa` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "CounterpartyType" ADD VALUE 'BORROWER';

-- AlterEnum
BEGIN;
CREATE TYPE "MovementType_new" AS ENUM ('PURCHASE_IN', 'TRANSFER', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'SALE_OUT');
ALTER TABLE "Movement" ALTER COLUMN "movementType" TYPE "MovementType_new" USING ("movementType"::text::"MovementType_new");
ALTER TYPE "MovementType" RENAME TO "MovementType_old";
ALTER TYPE "MovementType_new" RENAME TO "MovementType";
DROP TYPE "MovementType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Location" DROP CONSTRAINT "Location_parentId_fkey";

-- DropForeignKey
ALTER TABLE "Movement" DROP CONSTRAINT "Movement_fromLocationId_fkey";

-- DropForeignKey
ALTER TABLE "Movement" DROP CONSTRAINT "Movement_toLocationId_fkey";

-- DropIndex
DROP INDEX "Company_name_key";

-- DropIndex
DROP INDEX "CompanyUser_companyId_idx";

-- DropIndex
DROP INDEX "CompanyUser_companyId_userId_key";

-- DropIndex
DROP INDEX "CompanyUser_userId_idx";

-- DropIndex
DROP INDEX "Item_companyId_idx";

-- DropIndex
DROP INDEX "Location_companyId_idx";

-- DropIndex
DROP INDEX "Location_parentId_idx";

-- DropIndex
DROP INDEX "Location_type_idx";

-- DropIndex
DROP INDEX "Movement_companyId_idx";

-- DropIndex
DROP INDEX "Movement_fromLocationId_idx";

-- DropIndex
DROP INDEX "Movement_itemId_idx";

-- DropIndex
DROP INDEX "Movement_movementType_idx";

-- DropIndex
DROP INDEX "Movement_toLocationId_idx";

-- DropIndex
DROP INDEX "OrderSequence_companyId_idx";

-- DropIndex
DROP INDEX "OrderSequence_companyId_year_key";

-- DropIndex
DROP INDEX "OrderSequence_year_idx";

-- DropIndex
DROP INDEX "Reservation_companyId_idx";

-- DropIndex
DROP INDEX "Reservation_itemId_idx";

-- DropIndex
DROP INDEX "Reservation_locationId_idx";

-- DropIndex
DROP INDEX "Reservation_status_idx";

-- DropIndex
DROP INDEX "ReservationQa_reservationId_key";

-- DropIndex
DROP INDEX "Session_userId_idx";

-- DropIndex
DROP INDEX "StockBalance_companyId_idx";

-- DropIndex
DROP INDEX "StockBalance_itemId_idx";

-- DropIndex
DROP INDEX "StockBalance_locationId_idx";

-- DropIndex
DROP INDEX "StockThreshold_companyId_idx";

-- DropIndex
DROP INDEX "StockThreshold_itemId_idx";

-- DropIndex
DROP INDEX "StockThreshold_locationId_idx";

-- AlterTable
ALTER TABLE "CompanyUser" DROP CONSTRAINT "CompanyUser_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "id",
DROP COLUMN "updatedAt",
ALTER COLUMN "role" DROP DEFAULT,
ADD CONSTRAINT "CompanyUser_pkey" PRIMARY KEY ("companyId", "userId");

-- AlterTable
ALTER TABLE "Location" ALTER COLUMN "type" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OrderSequence" DROP COLUMN "createdAt",
DROP COLUMN "lastNo",
DROP COLUMN "year",
ADD COLUMN     "last" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ReservationQa" DROP COLUMN "scannedQty",
DROP COLUMN "updatedAt",
ADD COLUMN     "barcode" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "lastUsedAt",
DROP COLUMN "revokedAt",
DROP COLUMN "type";

-- AlterTable
ALTER TABLE "StockBalance" DROP COLUMN "createdAt";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "fullName",
DROP COLUMN "globalRole";

-- DropEnum
DROP TYPE "GlobalRole";

-- DropEnum
DROP TYPE "SessionType";

-- CreateIndex
CREATE UNIQUE INDEX "OrderSequence_companyId_key" ON "OrderSequence"("companyId");

-- CreateIndex
CREATE INDEX "ReservationQa_companyId_reservationId_idx" ON "ReservationQa"("companyId", "reservationId");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
