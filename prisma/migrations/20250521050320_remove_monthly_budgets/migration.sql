/*
  Warnings:

  - You are about to drop the `MonthlyBudget` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MonthlyBudget" DROP CONSTRAINT "MonthlyBudget_moneySourceId_fkey";

-- DropForeignKey
ALTER TABLE "MonthlyBudget" DROP CONSTRAINT "MonthlyBudget_userId_fkey";

-- DropTable
DROP TABLE "MonthlyBudget";
