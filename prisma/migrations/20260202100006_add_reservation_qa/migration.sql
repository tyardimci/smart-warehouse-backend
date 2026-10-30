-- CreateTable
CREATE TABLE "ReservationQa" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "reservationId" INTEGER NOT NULL,
    "scannedQty" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReservationQa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReservationQa_reservationId_key" ON "ReservationQa"("reservationId");

-- AddForeignKey
ALTER TABLE "ReservationQa" ADD CONSTRAINT "ReservationQa_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationQa" ADD CONSTRAINT "ReservationQa_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
