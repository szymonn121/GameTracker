/*
  Warnings:

  - A unique constraint covering the columns `[steamId]` on the table `ApiToken` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ApiToken_steamId_key" ON "ApiToken"("steamId");
