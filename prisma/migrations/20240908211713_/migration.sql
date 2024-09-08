/*
  Warnings:

  - A unique constraint covering the columns `[delegationId,nationId]` on the table `RoleApplication` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[delegationId,nonStateActorId]` on the table `RoleApplication` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[delegationId,rank]` on the table `RoleApplication` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "DelegationMember" DROP CONSTRAINT "DelegationMember_delegationId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "RoleApplication_delegationId_nationId_key" ON "RoleApplication"("delegationId", "nationId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleApplication_delegationId_nonStateActorId_key" ON "RoleApplication"("delegationId", "nonStateActorId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleApplication_delegationId_rank_key" ON "RoleApplication"("delegationId", "rank");

-- AddForeignKey
ALTER TABLE "DelegationMember" ADD CONSTRAINT "DelegationMember_delegationId_fkey" FOREIGN KEY ("delegationId") REFERENCES "Delegation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
