-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_moneySourceId_fkey";

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_moneySourceId_fkey" FOREIGN KEY ("moneySourceId") REFERENCES "MoneySource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
