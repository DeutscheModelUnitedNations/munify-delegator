/*
  Warnings:

  - A unique constraint covering the columns `[questionId,userId]` on the table `SurveyAnswer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[questionId,title]` on the table `SurveyOption` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[conferenceId,title]` on the table `SurveyQuestion` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "SurveyAnswer_questionId_userId_key" ON "SurveyAnswer"("questionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyOption_questionId_title_key" ON "SurveyOption"("questionId", "title");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyQuestion_conferenceId_title_key" ON "SurveyQuestion"("conferenceId", "title");
