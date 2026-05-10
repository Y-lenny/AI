-- CreateEnum
CREATE TYPE "TaskListingVisibility" AS ENUM ('unlisted', 'public');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "listingVisibility" "TaskListingVisibility" NOT NULL DEFAULT 'unlisted';

-- AlterTable
ALTER TABLE "SupplyProfile" ADD COLUMN "scheduledLiveAt" TIMESTAMP(3),
ADD COLUMN "scheduledLiveTitle" TEXT;
