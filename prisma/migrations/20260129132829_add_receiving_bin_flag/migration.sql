/*
  Warnings:

  - The values [CUSTOMER_ADMIN,EMPLOYEE] on the enum `CompanyRole` will be removed. If these variants are still used in the database, this will fail.
  - The values [USER] on the enum `GlobalRole` will be removed. If these variants are still used in the database, this will fail.
  - The values [RELEASED] on the enum `ReservationStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `description` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `movementType` on the `Movement` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `Movement` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `StockThreshold` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `StockThreshold` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,companyId]` on the table `CompanyUser` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,sku]` on the table `Item` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sku` to the `Item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Movement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Movement` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('WEB');

-- AlterEnum
BEGIN;
CREATE TYPE "CompanyRole_new" AS ENUM ('ADMIN', 'USER');
ALTER TABLE "CompanyUser" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "CompanyUser" ALTER COLUMN "role" TYPE "CompanyRole_new" USING ("role"::text::"CompanyRole_new");
ALTER TYPE "CompanyRole" RENAME TO "CompanyRole_old";
ALTER TYPE "CompanyRole_new" RENAME TO "CompanyRole";
DROP TYPE "CompanyRole_old";
ALTER TABLE "CompanyUser" ALTER COLUMN "role" SET DEFAULT 'USER';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "GlobalRole_new" AS ENUM ('SUPER_ADMIN');
ALTER TABLE "User" ALTER COLUMN "globalRole" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "globalRole" TYPE "GlobalRole_new" USING ("globalRole"::text::"GlobalRole_new");
ALTER TYPE "GlobalRole" RENAME TO "GlobalRole_old";
ALTER TYPE "GlobalRole_new" RENAME TO "GlobalRole";
DROP TYPE "GlobalRole_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ReservationStatus_new" AS ENUM ('ACTIVE', 'CONSUMED', 'CANCELLED');
ALTER TABLE "Reservation" ALTER COLUMN "status" TYPE "ReservationStatus_new" USING ("status"::text::"ReservationStatus_new");
ALTER TYPE "ReservationStatus" RENAME TO "ReservationStatus_old";
ALTER TYPE "ReservationStatus_new" RENAME TO "ReservationStatus";
DROP TYPE "ReservationStatus_old";
COMMIT;

-- DropIndex
DROP INDEX "CompanyUser_companyId_userId_key";

-- DropIndex
DROP INDEX "CompanyUser_role_idx";

-- DropIndex
DROP INDEX "Movement_createdAt_idx";

-- DropIndex
DROP INDEX "Movement_movementType_idx";

-- DropIndex
DROP INDEX "Reservation_companyId_itemId_locationId_idx";

-- DropIndex
DROP INDEX "Reservation_companyId_reference_idx";

-- DropIndex
DROP INDEX "Reservation_companyId_status_idx";

-- DropIndex
DROP INDEX "Session_refreshToken_key";

-- DropIndex
DROP INDEX "StockBalance_companyId_itemId_idx";

-- DropIndex
DROP INDEX "StockBalance_companyId_locationId_idx";

-- DropIndex
DROP INDEX "StockThreshold_companyId_itemId_locationId_key";

-- AlterTable
ALTER TABLE "CompanyUser" ALTER COLUMN "role" SET DEFAULT 'USER';

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "description",
DROP COLUMN "quantity",
ADD COLUMN     "oemNo" TEXT,
ADD COLUMN     "sku" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "isReceiving" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Movement" DROP COLUMN "movementType",
DROP COLUMN "note",
ADD COLUMN     "type" "MovementType" NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "counterpartyName" SET DATA TYPE TEXT,
ALTER COLUMN "referenceNo" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Reservation" ALTER COLUMN "status" SET DEFAULT 'ACTIVE',
ALTER COLUMN "reference" SET DATA TYPE TEXT,
ALTER COLUMN "customerName" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "type" "SessionType" NOT NULL DEFAULT 'WEB';

-- AlterTable
ALTER TABLE "StockThreshold" DROP COLUMN "isActive",
DROP COLUMN "note",
ALTER COLUMN "locationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "fullName" TEXT,
ALTER COLUMN "globalRole" DROP NOT NULL,
ALTER COLUMN "globalRole" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyUser_userId_companyId_key" ON "CompanyUser"("userId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Item_companyId_sku_key" ON "Item"("companyId", "sku");

-- CreateIndex
CREATE INDEX "Movement_type_idx" ON "Movement"("type");

-- CreateIndex
CREATE INDEX "Reservation_companyId_idx" ON "Reservation"("companyId");

-- CreateIndex
CREATE INDEX "Reservation_itemId_idx" ON "Reservation"("itemId");

-- CreateIndex
CREATE INDEX "Reservation_locationId_idx" ON "Reservation"("locationId");

-- CreateIndex
CREATE INDEX "Reservation_status_idx" ON "Reservation"("status");

-- CreateIndex
CREATE INDEX "Session_refreshToken_idx" ON "Session"("refreshToken");

-- CreateIndex
CREATE INDEX "StockBalance_companyId_idx" ON "StockBalance"("companyId");

-- CreateIndex
CREATE INDEX "StockBalance_itemId_idx" ON "StockBalance"("itemId");

-- CreateIndex
CREATE INDEX "StockBalance_locationId_idx" ON "StockBalance"("locationId");

-- CreateIndex
CREATE INDEX "StockThreshold_itemId_idx" ON "StockThreshold"("itemId");

-- CreateIndex
CREATE INDEX "StockThreshold_locationId_idx" ON "StockThreshold"("locationId");
