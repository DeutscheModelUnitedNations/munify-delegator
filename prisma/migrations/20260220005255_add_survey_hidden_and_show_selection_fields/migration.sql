-- AlterTable
ALTER TABLE "SurveyQuestion" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showSelectionOnDashboard" BOOLEAN NOT NULL DEFAULT false;
