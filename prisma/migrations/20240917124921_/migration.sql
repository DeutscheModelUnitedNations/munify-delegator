-- DropForeignKey
ALTER TABLE "RoleApplication" DROP CONSTRAINT "RoleApplication_delegationId_fkey";

-- AddForeignKey
ALTER TABLE "RoleApplication" ADD CONSTRAINT "RoleApplication_delegationId_fkey" FOREIGN KEY ("delegationId") REFERENCES "Delegation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
