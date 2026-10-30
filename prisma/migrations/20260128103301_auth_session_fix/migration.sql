/*
  Warnings:

  - The primary key for the `CompanyUser` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `CompanyUser` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Session` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `deviceId` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `ip` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `Session` table. All the data in the column will be lost.
  - The `id` column on the `Session` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `StockBalance` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `StockBalance` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `RefreshToken` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[companyId,userId]` on the table `CompanyUser` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[refreshToken]` on the table `Session` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `CompanyUser` table without a default value. This is not possible if the table is not empty.
  - Added the required column `refreshToken` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CounterpartyType" AS ENUM ('SUPPLIER', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('PURCHASE_IN', 'SALE_OUT', 'TRANSFER', 'ADJUSTMENT');

-- DropForeignKey
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_replacedById_fkey";

-- DropForeignKey
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_sessionId_fkey";

-- DropIndex
DROP INDEX "CompanyUser_userId_companyId_key";

-- DropIndex
DROP INDEX "Session_revokedAt_idx";

-- DropIndex
DROP INDEX "StockBalance_companyId_idx";

-- DropIndex
DROP INDEX "StockBalance_itemId_idx";

-- DropIndex
DROP INDEX "StockBalance_locationId_idx";

-- DropIndex
DROP INDEX "StockThreshold_itemId_idx";

-- DropIndex
DROP INDEX "StockThreshold_locationId_idx";

-- AlterTable
ALTER TABLE "CompanyUser" DROP CONSTRAINT "CompanyUser_pkey",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "CompanyUser_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Movement" ADD COLUMN     "counterpartyName" VARCHAR(128),
ADD COLUMN     "counterpartyType" "CounterpartyType",
ADD COLUMN     "movementType" "MovementType" NOT NULL DEFAULT 'TRANSFER',
ADD COLUMN     "referenceNo" VARCHAR(64);

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "customerName" VARCHAR(128);

-- AlterTable
ALTER TABLE "Session" DROP CONSTRAINT "Session_pkey",
DROP COLUMN "deviceId",
DROP COLUMN "ip",
DROP COLUMN "userAgent",
ADD COLUMN     "refreshToken" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Session_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "StockBalance" DROP CONSTRAINT "StockBalance_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "StockBalance_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "StockThreshold" ALTER COLUMN "minQty" DROP DEFAULT;

-- DropTable
DROP TABLE "RefreshToken";

-- CreateIndex
CREATE INDEX "CompanyUser_role_idx" ON "CompanyUser"("role");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyUser_companyId_userId_key" ON "CompanyUser"("companyId", "userId");

-- CreateIndex
CREATE INDEX "Movement_movementType_idx" ON "Movement"("movementType");

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshToken_key" ON "Session"("refreshToken");

-- CreateIndex
CREATE INDEX "StockBalance_companyId_itemId_idx" ON "StockBalance"("companyId", "itemId");

-- CreateIndex
CREATE INDEX "StockBalance_companyId_locationId_idx" ON "StockBalance"("companyId", "locationId");
