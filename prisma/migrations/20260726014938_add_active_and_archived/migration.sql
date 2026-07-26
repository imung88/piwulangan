-- AlterEnum
ALTER TYPE "Visibility" ADD VALUE 'ARCHIVED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;
