/*
  Warnings:

  - You are about to drop the column `consumedAt` on the `Reservation` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `Reservation` table. All the data in the column will be lost.
  - You are about to drop the column `releasedAt` on the `Reservation` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "ReservationStatus" ADD VALUE 'CANCELLED';

-- DropIndex
DROP INDEX "Reservation_companyId_idx";

-- DropIndex
DROP INDEX "Reservation_itemId_idx";

-- DropIndex
DROP INDEX "Reservation_locationId_idx";

-- DropIndex
DROP INDEX "Reservation_status_idx";

-- AlterTable
ALTER TABLE "Reservation" DROP COLUMN "consumedAt",
DROP COLUMN "note",
DROP COLUMN "releasedAt",
ADD COLUMN     "reference" VARCHAR(64),
ALTER COLUMN "status" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Reservation_companyId_itemId_locationId_idx" ON "Reservation"("companyId", "itemId", "locationId");

-- CreateIndex
CREATE INDEX "Reservation_companyId_reference_idx" ON "Reservation"("companyId", "reference");

-- CreateIndex
CREATE INDEX "Reservation_companyId_status_idx" ON "Reservation"("companyId", "status");
