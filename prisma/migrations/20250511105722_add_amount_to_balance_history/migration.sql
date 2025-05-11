/*
  Warnings:

  - Added the required column `amount` to the `BalanceHistory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- Step 1: Add the columns as nullable
ALTER TABLE "BalanceHistory" 
ADD COLUMN "amount" DOUBLE PRECISION;

-- Step 2: Update existing records with default value 0 for amount
UPDATE "BalanceHistory" 
SET "amount" = 0
WHERE "amount" IS NULL;

-- Step 3: Now make amount non-nullable
ALTER TABLE "BalanceHistory" 
ALTER COLUMN "amount" SET NOT NULL;