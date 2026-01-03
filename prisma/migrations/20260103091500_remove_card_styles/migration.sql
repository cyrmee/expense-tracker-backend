-- Remove card styles feature

-- Drop FK first
ALTER TABLE "MoneySource" DROP CONSTRAINT IF EXISTS "MoneySource_cardStyleId_fkey";

-- Drop index on the FK column
DROP INDEX IF EXISTS "MoneySource_cardStyleId_idx";

-- Drop the column
ALTER TABLE "MoneySource" DROP COLUMN IF EXISTS "cardStyleId";

-- Drop unique index (if present) and the table
DROP INDEX IF EXISTS "CardStyle_styleId_key";
DROP TABLE IF EXISTS "CardStyle";
