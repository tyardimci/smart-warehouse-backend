/*
  Warnings:

  - You are about to drop the column `barcode` on the `ReservationQa` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[reservationId]` on the table `ReservationQa` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `ReservationQa` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ReservationQa_companyId_reservationId_idx";

-- AlterTable
ALTER TABLE "ReservationQa" DROP COLUMN "barcode",
ADD COLUMN     "note" TEXT,
ADD COLUMN     "scannedQty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ReservationQa_reservationId_key" ON "ReservationQa"("reservationId");

-- CreateIndex
CREATE INDEX "ReservationQa_companyId_idx" ON "ReservationQa"("companyId");

-- CreateIndex
CREATE INDEX "ReservationQa_reservationId_idx" ON "ReservationQa"("reservationId");
