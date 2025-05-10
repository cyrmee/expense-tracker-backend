-- AlterTable
ALTER TABLE "MoneySource" ADD COLUMN     "cardStyleId" TEXT;

-- CreateTable
CREATE TABLE "CardStyle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "background" TEXT NOT NULL,
    "textColor" TEXT NOT NULL,
    "cardNumberFont" TEXT NOT NULL,
    "border" TEXT NOT NULL,
    "shadow" TEXT NOT NULL,
    "hasChip" BOOLEAN NOT NULL DEFAULT true,
    "chipColor" TEXT NOT NULL,
    "visaLogoVariant" TEXT NOT NULL,
    "showBgImage" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardStyle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CardStyle_styleId_key" ON "CardStyle"("styleId");

-- CreateIndex
CREATE INDEX "MoneySource_cardStyleId_idx" ON "MoneySource"("cardStyleId");

-- AddForeignKey
ALTER TABLE "MoneySource" ADD CONSTRAINT "MoneySource_cardStyleId_fkey" FOREIGN KEY ("cardStyleId") REFERENCES "CardStyle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
