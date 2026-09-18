-- CreateTable
CREATE TABLE "daily_closures" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "totalPercibido" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_closures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_closures_date_key" ON "daily_closures"("date");
