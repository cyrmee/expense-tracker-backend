-- AlterTable
ALTER TABLE "MoneySource" ALTER COLUMN "budget" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "MonthlyBudget" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "moneySourceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "MonthlyBudget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthlyBudget_userId_idx" ON "MonthlyBudget"("userId");

-- CreateIndex
CREATE INDEX "MonthlyBudget_moneySourceId_idx" ON "MonthlyBudget"("moneySourceId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyBudget_moneySourceId_month_year_key" ON "MonthlyBudget"("moneySourceId", "month", "year");

-- AddForeignKey
ALTER TABLE "MonthlyBudget" ADD CONSTRAINT "MonthlyBudget_moneySourceId_fkey" FOREIGN KEY ("moneySourceId") REFERENCES "MoneySource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyBudget" ADD CONSTRAINT "MonthlyBudget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
