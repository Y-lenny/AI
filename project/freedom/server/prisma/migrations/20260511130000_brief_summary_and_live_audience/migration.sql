-- CreateEnum
CREATE TYPE "LiveAudienceScope" AS ENUM ('task_participants_only', 'public_link');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "needBriefSummary" TEXT;

-- AlterTable
ALTER TABLE "MediaSession" ADD COLUMN "audienceScope" "LiveAudienceScope" NOT NULL DEFAULT 'task_participants_only';
