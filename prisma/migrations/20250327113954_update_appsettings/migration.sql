/*
  Warnings:

  - You are about to drop the column `hasExistingData` on the `AppSettings` table. All the data in the column will be lost.
  - You are about to drop the column `hasSeenWelcome` on the `AppSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AppSettings" DROP COLUMN "hasExistingData",
DROP COLUMN "hasSeenWelcome";
